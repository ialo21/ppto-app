import { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Schemas
const createInvoiceSchema = z.object({
  ocId: z.number().int().positive({ message: "OC es requerida" }),
  docType: z.enum(["FACTURA", "NOTA_CREDITO"], { message: "Tipo inválido" }).default("FACTURA"),
  numberNorm: z.string().min(1, "Número es requerido"),
  montoSinIgv: z.number().nonnegative({ message: "Monto debe ser mayor o igual a 0" }),
  ultimusIncident: z.string().optional(),
  detalle: z.string().optional()
});

const updateInvoiceSchema = z.object({
  ocId: z.number().int().positive().optional(),
  docType: z.enum(["FACTURA", "NOTA_CREDITO"]).optional(),
  numberNorm: z.string().min(1).optional(),
  montoSinIgv: z.number().nonnegative().optional(),
  ultimusIncident: z.string().optional(),
  detalle: z.string().optional()
});

const updateStatusSchema = z.object({
  status: z.enum([
    "INGRESADO", "EN_APROBACION", "EN_CONTABILIDAD",
    "EN_TESORERIA", "EN_ESPERA_DE_PAGO", "PAGADO", "RECHAZADO"
  ]),
  note: z.string().optional()
});

/**
 * Calcula el consumo actual de una OC (suma de facturas - notas de crédito)
 * OPCIÓN A: Cálculo dinámico (fuente única de verdad)
 */
async function calcularConsumoOC(ocId: number, excludeInvoiceId?: number): Promise<number> {
  const facturas = await prisma.invoice.findMany({
    where: {
      ocId,
      ...(excludeInvoiceId ? { id: { not: excludeInvoiceId } } : {})
    },
    select: {
      docType: true,
      montoSinIgv: true
    }
  });

  let consumo = 0;
  for (const factura of facturas) {
    const monto = factura.montoSinIgv ? Number(factura.montoSinIgv) : 0;
    if (factura.docType === "FACTURA") {
      consumo += monto;
    } else if (factura.docType === "NOTA_CREDITO") {
      consumo -= monto;
    }
  }

  return consumo;
}

export async function registerInvoiceRoutes(app: FastifyInstance) {
  // List (con OC incluida)
  app.get("/invoices", async (req, reply) => {
    const items = await prisma.invoice.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        oc: {
          include: {
            support: true
          }
        },
        vendor: true  // Legacy
      }
    });
    return items;
  });

  // Get by id
  app.get("/invoices/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: {
        oc: {
          include: {
            support: true
          }
        },
        vendor: true,
        statusHistory: { orderBy: { changedAt: "asc" } }
      }
    });
    if (!inv) return reply.code(404).send({ error: "Factura no encontrada" });
    return inv;
  });

  // Create (FACTURA | NOTA_CREDITO)
  app.post("/invoices", async (req, reply) => {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: parsed.error.errors.map(err => ({
          path: err.path,
          message: err.message
        }))
      });
    }

    const data = parsed.data;

    // 1. Verificar que la OC existe
    const oc = await prisma.oC.findUnique({
      where: { id: data.ocId }
    });

    if (!oc) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{ path: ["ocId"], message: "OC no encontrada" }]
      });
    }

    // 2. Calcular consumo actual de la OC
    const consumoActual = await calcularConsumoOC(data.ocId);
    const importeOC = Number(oc.importeSinIgv);
    const saldoDisponible = importeOC - consumoActual;

    // 3. Validar según tipo de documento
    if (data.docType === "FACTURA") {
      // FACTURA: no puede exceder saldo disponible
      if (data.montoSinIgv > saldoDisponible) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{
            path: ["montoSinIgv"],
            message: `El monto (${data.montoSinIgv.toFixed(2)}) excede el saldo disponible de la OC (${saldoDisponible.toFixed(2)} ${oc.moneda})`
          }]
        });
      }
    } else if (data.docType === "NOTA_CREDITO") {
      // NOTA_CREDITO: no puede restar más de lo consumido
      if (data.montoSinIgv > consumoActual) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{
            path: ["montoSinIgv"],
            message: `La nota de crédito (${data.montoSinIgv.toFixed(2)}) no puede ser mayor al consumo actual (${consumoActual.toFixed(2)} ${oc.moneda})`
          }]
        });
      }
    }

    // 4. Crear factura (heredando moneda de OC)
    const created = await prisma.invoice.create({
      data: {
        ocId: data.ocId,
        docType: data.docType as any,
        numberNorm: data.numberNorm,
        currency: oc.moneda,  // Heredar moneda de OC
        montoSinIgv: new Prisma.Decimal(data.montoSinIgv),
        ultimusIncident: data.ultimusIncident ?? null,
        detalle: data.detalle ?? null,
        statusCurrent: "INGRESADO",
        // Legacy: mantener null
        vendorId: null,
        totalForeign: null,
        totalLocal: null
      }
    });

    // 5. Crear primer estado en historial
    await prisma.invoiceStatusHistory.create({
      data: {
        invoiceId: created.id,
        status: "INGRESADO"
      }
    });

    return created;
  });

  // Update (editar factura)
  app.patch("/invoices/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = updateInvoiceSchema.safeParse(req.body);

    if (!parsed.success) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: parsed.error.errors.map(err => ({
          path: err.path,
          message: err.message
        }))
      });
    }

    const data = parsed.data;

    // Verificar que la factura existe
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: { oc: true }
    });

    if (!existing) {
      return reply.code(404).send({ error: "Factura no encontrada" });
    }

    // Si cambia la OC, validar la nueva
    let targetOC = existing.oc;
    if (data.ocId && data.ocId !== existing.ocId) {
      const newOC = await prisma.oC.findUnique({ where: { id: data.ocId } });
      if (!newOC) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["ocId"], message: "OC no encontrada" }]
        });
      }
      targetOC = newOC;
    }

    // Si cambia el monto o tipo, revalidar saldo
    const finalOcId = data.ocId ?? existing.ocId;
    const finalDocType = data.docType ?? existing.docType;
    const finalMonto = data.montoSinIgv ?? (existing.montoSinIgv ? Number(existing.montoSinIgv) : 0);

    if (targetOC) {
      const consumoActual = await calcularConsumoOC(finalOcId!, id);  // Excluir esta factura del cálculo
      const importeOC = Number(targetOC.importeSinIgv);
      const saldoDisponible = importeOC - consumoActual;

      if (finalDocType === "FACTURA") {
        if (finalMonto > saldoDisponible) {
          return reply.code(422).send({
            error: "VALIDATION_ERROR",
            issues: [{
              path: ["montoSinIgv"],
              message: `El monto (${finalMonto.toFixed(2)}) excede el saldo disponible de la OC (${saldoDisponible.toFixed(2)} ${targetOC.moneda})`
            }]
          });
        }
      } else if (finalDocType === "NOTA_CREDITO") {
        if (finalMonto > consumoActual) {
          return reply.code(422).send({
            error: "VALIDATION_ERROR",
            issues: [{
              path: ["montoSinIgv"],
              message: `La nota de crédito (${finalMonto.toFixed(2)}) no puede ser mayor al consumo actual (${consumoActual.toFixed(2)} ${targetOC.moneda})`
            }]
          });
        }
      }
    }

    // Actualizar factura
    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(data.ocId && { ocId: data.ocId, currency: targetOC!.moneda }),
        ...(data.docType && { docType: data.docType as any }),
        ...(data.numberNorm && { numberNorm: data.numberNorm }),
        ...(data.montoSinIgv !== undefined && { montoSinIgv: new Prisma.Decimal(data.montoSinIgv) }),
        ...(data.ultimusIncident !== undefined && { ultimusIncident: data.ultimusIncident }),
        ...(data.detalle !== undefined && { detalle: data.detalle })
      }
    });

    return updated;
  });

  // Delete
  app.delete("/invoices/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: "Factura no encontrada" });
    }

    // Eliminar historial primero (cascade manual si no está en schema)
    await prisma.invoiceStatusHistory.deleteMany({ where: { invoiceId: id } });
    
    await prisma.invoice.delete({ where: { id } });
    
    return { success: true };
  });

  // Update status + append history
  app.patch("/invoices/:id/status", async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = updateStatusSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: parsed.error.errors.map(err => ({
          path: err.path,
          message: err.message
        }))
      });
    }

    const inv = await prisma.invoice.findUnique({ where: { id } });
    if (!inv) return reply.code(404).send({ error: "Factura no encontrada" });

    const updated = await prisma.invoice.update({
      where: { id },
      data: { statusCurrent: parsed.data.status as any }
    });

    await prisma.invoiceStatusHistory.create({
      data: {
        invoiceId: id,
        status: parsed.data.status as any,
        note: parsed.data.note ?? null
      }
    });

    return updated;
  });

  // History only
  app.get("/invoices/:id/history", async (req, reply) => {
    const id = Number((req.params as any).id);
    const rows = await prisma.invoiceStatusHistory.findMany({
      where: { invoiceId: id },
      orderBy: { changedAt: "asc" }
    });
    return rows;
  });

  // Consumo de una OC (útil para el frontend)
  app.get("/invoices/oc/:ocId/consumo", async (req, reply) => {
    const ocId = Number((req.params as any).ocId);
    
    const oc = await prisma.oC.findUnique({ where: { id: ocId } });
    if (!oc) {
      return reply.code(404).send({ error: "OC no encontrada" });
    }

    const consumido = await calcularConsumoOC(ocId);
    const importeTotal = Number(oc.importeSinIgv);
    const saldoDisponible = importeTotal - consumido;

    return {
      ocId,
      importeTotal,
      consumido,
      saldoDisponible,
      moneda: oc.moneda,
      proveedor: oc.proveedor
    };
  });

  // Export CSV (actualizado con columnas nuevas)
  app.get("/invoices/export/csv", async (req, reply) => {
    const { status, docType } = req.query as any;
    const where: any = {};
    if (status) where.statusCurrent = String(status).toUpperCase();
    if (docType) where.docType = String(docType).toUpperCase();

    const rows = await prisma.invoice.findMany({
      where,
      orderBy: [{ createdAt: "asc" }],
      include: {
        oc: true,
        statusHistory: { orderBy: { changedAt: "asc" } }
      }
    });

    const header = [
      "Numero", "Tipo", "OC", "Proveedor", "Moneda", "MontoSinIGV",
      "Estado", "IncidenteUltimus", "Detalle"
    ];

    const fmt = (v: any) => (v == null ? "" : String(v).replace(/"/g, '""'));
    const lines = [
      header.join(","),
      ...rows.map(r => [
        `"${fmt(r.numberNorm)}"`,
        r.docType,
        `"${fmt(r.oc?.numeroOc)}"`,
        `"${fmt(r.oc?.proveedor)}"`,
        r.currency,
        r.montoSinIgv ?? "",
        r.statusCurrent,
        `"${fmt(r.ultimusIncident)}"`,
        `"${fmt(r.detalle)}"`
      ].join(","))
    ];

    reply.header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", "attachment; filename=invoices.csv")
      .send(lines.join("\n"));
  });
}
