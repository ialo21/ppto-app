import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient, Prisma, InvStatus, OcStatus } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

export async function requireN8nKey(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: "Token n8n requerido" });
  }
  
  const token = authHeader.substring(7);
  const expectedToken = process.env.RPA_API_KEY;
  
  if (!expectedToken) {
    console.error("[N8N] RPA_API_KEY no configurada en el servidor");
    return reply.code(500).send({ error: "Configuración del servidor incompleta" });
  }
  
  if (token !== expectedToken) {
    return reply.code(401).send({ error: "Token n8n inválido" });
  }
}

const createInvoiceN8nSchema = z.object({
  ocId: z.number().int().positive().optional(),
  docType: z.enum(["FACTURA", "NOTA_CREDITO"]).default("FACTURA"),
  numberNorm: z.string().min(1, "Número de factura es requerido"),
  montoSinIgv: z.number().nonnegative({ message: "Monto debe ser mayor o igual a 0" }),
  periodIds: z.array(z.number().int().positive()).optional(),
  periodKeys: z.array(z.string().regex(/^\d{4}-\d{2}$/)).optional(),
  allocations: z.array(z.object({
    costCenterId: z.number().int().positive().optional(),
    costCenterCode: z.string().optional(),
    amount: z.number().nonnegative().optional(),
    percentage: z.number().min(0).max(100).optional()
  })).min(1, "Debe especificar al menos un CECO"),
  ultimusIncident: z.string().optional(),
  detalle: z.string().optional(),
  proveedorId: z.number().int().positive().optional(),
  proveedorRuc: z.string().regex(/^\d{11}$/, "RUC debe tener 11 dígitos").optional(),
  proveedor: z.string().optional(),
  moneda: z.enum(["PEN", "USD"]).optional(),
  exchangeRateOverride: z.number().positive().optional(),
  mesContable: z.string().regex(/^\d{4}-\d{2}$/).nullish(),
  tcReal: z.number().positive().nullish()
}).refine(
  (data) => data.periodIds || data.periodKeys,
  { message: "Debe proporcionar periodIds o periodKeys" }
).refine(
  (data) => data.allocations.every(a => a.costCenterId || a.costCenterCode),
  { message: "Cada allocation debe tener costCenterId o costCenterCode" }
);

const updateInvoiceStatusN8nSchema = z.object({
  status: z.enum([
    "INGRESADO", "EN_APROBACION", "APROBACION_HEAD", "APROBACION_VP",
    "EN_CONTABILIDAD", "EN_TESORERIA", "EN_ESPERA_DE_PAGO", "PAGADO",
    "RECHAZADO", "ANULADO", "PROVISIONADO", "DISTRIBUIBLE"
  ]),
  note: z.string().optional()
});

const updateOcStatusN8nSchema = z.object({
  estado: z.enum([
    "PENDIENTE", "PROCESAR", "EN_PROCESO", "PROCESADO",
    "APROBACION_VP", "ATENDER_COMPRAS", "ATENDIDO", "ANULADO"
  ]),
  note: z.string().optional()
});

async function resolvePeriodKeys(periodKeys: string[]): Promise<number[]> {
  const periodIds: number[] = [];
  
  for (const key of periodKeys) {
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    
    const period = await prisma.period.findFirst({
      where: { year, month }
    });
    
    if (!period) {
      throw new Error(`Periodo ${key} no encontrado`);
    }
    
    periodIds.push(period.id);
  }
  
  return periodIds;
}

async function resolveProveedorRuc(ruc: string): Promise<number> {
  const proveedor = await prisma.proveedor.findUnique({
    where: { ruc }
  });
  
  if (!proveedor) {
    throw new Error(`Proveedor con RUC ${ruc} no encontrado`);
  }
  
  return proveedor.id;
}

async function resolveCostCenterCodes(allocations: any[]): Promise<Array<{
  costCenterId: number;
  amount?: number;
  percentage?: number;
}>> {
  const resolvedAllocations: Array<{
    costCenterId: number;
    amount?: number;
    percentage?: number;
  }> = [];
  
  for (const alloc of allocations) {
    if (alloc.costCenterId) {
      resolvedAllocations.push({
        costCenterId: alloc.costCenterId,
        amount: alloc.amount,
        percentage: alloc.percentage
      });
    } else if (alloc.costCenterCode) {
      const costCenter = await prisma.costCenter.findUnique({
        where: { code: alloc.costCenterCode }
      });
      
      if (!costCenter) {
        throw new Error(`CECO con código ${alloc.costCenterCode} no encontrado`);
      }
      
      resolvedAllocations.push({
        costCenterId: costCenter.id,
        amount: alloc.amount,
        percentage: alloc.percentage
      });
    } else {
      throw new Error("Cada allocation debe tener costCenterId o costCenterCode");
    }
  }
  
  return resolvedAllocations;
}

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

async function calcularEffectiveRate(
  currency: string,
  periodIds: number[],
  exchangeRateOverride?: number
): Promise<{ effectiveRate: number; source: "PEN" | "override" | "annual" | "error" }> {
  if (currency === "PEN") {
    return { effectiveRate: 1, source: "PEN" };
  }

  if (exchangeRateOverride !== undefined) {
    return { effectiveRate: exchangeRateOverride, source: "override" };
  }

  const firstPeriod = await prisma.period.findUnique({
    where: { id: periodIds[0] },
    select: { year: true }
  });

  if (!firstPeriod) {
    throw new Error(`Periodo ${periodIds[0]} no encontrado`);
  }

  const annualRate = await prisma.exchangeRate.findUnique({
    where: { year: firstPeriod.year }
  });

  if (!annualRate) {
    return { effectiveRate: 0, source: "error" };
  }

  return { effectiveRate: Number(annualRate.rate), source: "annual" };
}

async function calcularCamposContables(
  currency: string,
  montoSinIgv: number,
  periodIds: number[],
  mesContable?: string,
  tcReal?: number
): Promise<{
  mesContable: string | null;
  tcEstandar: number | null;
  tcReal: number | null;
  montoPEN_tcEstandar: number | null;
  montoPEN_tcReal: number | null;
  diferenciaTC: number | null;
}> {
  const firstPeriod = await prisma.period.findUnique({
    where: { id: periodIds[0] },
    select: { year: true, month: true }
  });

  if (!firstPeriod) {
    throw new Error(`Periodo ${periodIds[0]} no encontrado`);
  }

  if (currency === "PEN") {
    return {
      mesContable: mesContable || null,
      tcEstandar: null,
      tcReal: null,
      montoPEN_tcEstandar: null,
      montoPEN_tcReal: null,
      diferenciaTC: null
    };
  }

  const annualRate = await prisma.exchangeRate.findUnique({
    where: { year: firstPeriod.year }
  });

  if (!annualRate) {
    throw new Error(`No se encontró tipo de cambio para el año ${firstPeriod.year}. Configure el TC en Catálogos.`);
  }

  const tcEstandar = Number(annualRate.rate);
  const montoPEN_tcEstandar = montoSinIgv * tcEstandar;

  if (!mesContable) {
    return {
      mesContable: null,
      tcEstandar,
      tcReal: null,
      montoPEN_tcEstandar,
      montoPEN_tcReal: null,
      diferenciaTC: null
    };
  }

  const tcRealFinal = tcReal !== undefined ? tcReal : tcEstandar;
  const montoPEN_tcReal = montoSinIgv * tcRealFinal;
  const diferenciaTC = montoPEN_tcReal - montoPEN_tcEstandar;

  return {
    mesContable,
    tcEstandar,
    tcReal: tcRealFinal,
    montoPEN_tcEstandar,
    montoPEN_tcReal,
    diferenciaTC
  };
}

export async function registerN8nRoutes(app: FastifyInstance) {
  
  app.post("/n8n/invoices", { preHandler: requireN8nKey }, async (req, reply) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[N8N] POST /n8n/invoices - Payload:", JSON.stringify(req.body, null, 2));
    }

    const parsed = createInvoiceN8nSchema.safeParse(req.body);
    if (!parsed.success) {
      if (process.env.NODE_ENV === "development") {
        console.error("[N8N] Validación fallida:", parsed.error.errors);
      }
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: parsed.error.errors.map(err => ({
          path: err.path,
          message: err.message
        }))
      });
    }

    let periodIds: number[];
    let allocations: Array<{ costCenterId: number; amount?: number; percentage?: number }>;
    let proveedorId: number | undefined;

    try {
      if (parsed.data.periodKeys && parsed.data.periodKeys.length > 0) {
        periodIds = await resolvePeriodKeys(parsed.data.periodKeys);
      } else if (parsed.data.periodIds && parsed.data.periodIds.length > 0) {
        periodIds = parsed.data.periodIds;
      } else {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["periodIds"], message: "Debe proporcionar periodIds o periodKeys válidos" }]
        });
      }

      allocations = await resolveCostCenterCodes(parsed.data.allocations);

      if (parsed.data.proveedorRuc) {
        proveedorId = await resolveProveedorRuc(parsed.data.proveedorRuc);
      } else if (parsed.data.proveedorId) {
        proveedorId = parsed.data.proveedorId;
      }
    } catch (error: any) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{ path: [], message: error.message || "Error al resolver códigos" }]
      });
    }

    const data = parsed.data;

    let oc: any = null;
    let currency = data.moneda || "PEN";
    let proveedor = data.proveedor || "";

    if (data.ocId) {
      oc = await prisma.oC.findUnique({
        where: { id: data.ocId },
        include: {
          budgetPeriodFrom: true,
          budgetPeriodTo: true,
          costCenters: {
            include: { costCenter: true }
          }
        }
      });

      if (!oc) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["ocId"], message: "OC no encontrada" }]
        });
      }

      currency = oc.moneda;
      proveedor = oc.proveedor;

      const consumoActual = await calcularConsumoOC(data.ocId);
      const importeOC = Number(oc.importeSinIgv);
      const saldoDisponible = importeOC - consumoActual;

      if (data.docType === "FACTURA") {
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

      if (oc.budgetPeriodFromId && oc.budgetPeriodToId) {
        const fromValue = oc.budgetPeriodFrom.year * 100 + oc.budgetPeriodFrom.month;
        const toValue = oc.budgetPeriodTo.year * 100 + oc.budgetPeriodTo.month;

        const periods = await prisma.period.findMany({
          where: { id: { in: periodIds } }
        });

        for (const period of periods) {
          const periodValue = period.year * 100 + period.month;
          if (periodValue < fromValue || periodValue > toValue) {
            return reply.code(422).send({
              error: "VALIDATION_ERROR",
              issues: [{
                path: ["periodIds"],
                message: `El periodo ${period.year}-${String(period.month).padStart(2, '0')} está fuera del rango de la OC`
              }]
            });
          }
        }
      }

      const ocCecoIds = new Set(oc.costCenters.map((cc: any) => cc.costCenterId));
      const invalidCecos = allocations.filter(a => !ocCecoIds.has(a.costCenterId));
      if (invalidCecos.length > 0) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{
            path: ["allocations"],
            message: `Algunos CECOs seleccionados no están asociados a la OC: ${invalidCecos.map(a => a.costCenterId).join(", ")}`
          }]
        });
      }
    } else {
      if (!data.proveedor) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["proveedor"], message: "Proveedor es requerido cuando no hay OC" }]
        });
      }
      if (!data.moneda) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["moneda"], message: "Moneda es requerida cuando no hay OC" }]
        });
      }
    }

    const rateResult = await calcularEffectiveRate(currency, periodIds, data.exchangeRateOverride);
    if (rateResult.source === "error") {
      const firstPeriod = await prisma.period.findUnique({
        where: { id: periodIds[0] },
        select: { year: true }
      });
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{
          path: ["exchangeRateOverride"],
          message: `Configura tipo de cambio anual para ${firstPeriod?.year} o ingresa TC manual`
        }]
      });
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
    const tolerance = 0.01;
    if (Math.abs(totalAllocated - data.montoSinIgv) > tolerance) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{
          path: ["allocations"],
          message: `La suma de las distribuciones (${totalAllocated.toFixed(2)}) no coincide con el monto total (${data.montoSinIgv.toFixed(2)})`
        }]
      });
    }

    const camposContables = await calcularCamposContables(
      currency,
      data.montoSinIgv,
      periodIds,
      data.mesContable ?? undefined,
      data.tcReal ?? undefined
    );

    const created = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          ocId: data.ocId ?? null,
          docType: data.docType as any,
          numberNorm: data.numberNorm,
          currency,
          montoSinIgv: new Prisma.Decimal(data.montoSinIgv),
          exchangeRateOverride: data.exchangeRateOverride ? new Prisma.Decimal(data.exchangeRateOverride) : null,
          ultimusIncident: data.ultimusIncident ?? null,
          detalle: data.detalle ?? null,
          statusCurrent: "INGRESADO",
          mesContable: camposContables.mesContable,
          tcEstandar: camposContables.tcEstandar !== null ? new Prisma.Decimal(camposContables.tcEstandar) : null,
          tcReal: camposContables.tcReal !== null ? new Prisma.Decimal(camposContables.tcReal) : null,
          montoPEN_tcEstandar: camposContables.montoPEN_tcEstandar !== null ? new Prisma.Decimal(camposContables.montoPEN_tcEstandar) : null,
          montoPEN_tcReal: camposContables.montoPEN_tcReal !== null ? new Prisma.Decimal(camposContables.montoPEN_tcReal) : null,
          diferenciaTC: camposContables.diferenciaTC !== null ? new Prisma.Decimal(camposContables.diferenciaTC) : null,
          vendorId: proveedorId ?? null,
          totalForeign: null,
          totalLocal: null
        }
      });

      await tx.invoicePeriod.createMany({
        data: periodIds.map(periodId => ({
          invoiceId: invoice.id,
          periodId
        }))
      });

      await tx.invoiceCostCenter.createMany({
        data: allocations.map(alloc => ({
          invoiceId: invoice.id,
          costCenterId: alloc.costCenterId,
          amount: alloc.amount ? new Prisma.Decimal(alloc.amount) : null,
          percentage: alloc.percentage ? new Prisma.Decimal(alloc.percentage) : null
        }))
      });

      await tx.invoiceStatusHistory.create({
        data: {
          invoiceId: invoice.id,
          status: "INGRESADO",
          note: "Creado automáticamente desde n8n"
        }
      });

      return invoice;
    });

    const result = await prisma.invoice.findUnique({
      where: { id: created.id },
      include: {
        periods: {
          include: {
            period: { select: { id: true, year: true, month: true, label: true } }
          }
        },
        costCenters: {
          include: {
            costCenter: { select: { id: true, code: true, name: true } }
          }
        }
      }
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[N8N] Factura creada exitosamente:", created.id);
    }

    return result;
  });

  app.patch("/n8n/invoices/:id/status", { preHandler: requireN8nKey }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = updateInvoiceStatusN8nSchema.safeParse(req.body);
    
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

    const targetStatus = parsed.data.status as InvStatus;

    const updated = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.update({
        where: { id },
        data: { statusCurrent: targetStatus }
      });

      await tx.invoiceStatusHistory.create({
        data: {
          invoiceId: id,
          status: targetStatus,
          note: parsed.data.note ?? "Actualizado automáticamente desde n8n"
        }
      });

      return invoice;
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`[N8N] Estado de factura ${id} actualizado a ${targetStatus}`);
    }

    return updated;
  });

  app.patch("/n8n/ocs/:id/status", { preHandler: requireN8nKey }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = updateOcStatusN8nSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: parsed.error.errors.map(err => ({
          path: err.path,
          message: err.message
        }))
      });
    }

    const oc = await prisma.oC.findUnique({ where: { id } });
    if (!oc) return reply.code(404).send({ error: "OC no encontrada" });

    const targetStatus = parsed.data.estado as OcStatus;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOc = await tx.oC.update({
        where: { id },
        data: { estado: targetStatus },
        include: {
          support: { select: { id: true, code: true, name: true } },
          budgetPeriodFrom: { select: { id: true, year: true, month: true, label: true } },
          budgetPeriodTo: { select: { id: true, year: true, month: true, label: true } },
          costCenters: {
            include: { costCenter: { select: { id: true, code: true, name: true } } }
          }
        }
      });

      await tx.oCStatusHistory.create({
        data: {
          ocId: id,
          status: targetStatus,
          note: parsed.data.note ?? "Actualizado automáticamente desde n8n"
        }
      });

      return updatedOc;
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`[N8N] Estado de OC ${id} actualizado a ${targetStatus}`);
    }

    return updated;
  });

  app.get("/n8n/health", { preHandler: requireN8nKey }, async () => {
    return { 
      ok: true, 
      service: "n8n-integration",
      timestamp: new Date().toISOString()
    };
  });
}
