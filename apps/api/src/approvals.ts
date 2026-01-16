import { FastifyInstance } from "fastify";
import { PrismaClient, Prisma, InvStatus, OcStatus } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requirePermission } from "./auth";
import { broadcastInvoiceStatusChange, broadcastOcStatusChange } from "./websocket";

const prisma = new PrismaClient();

// ============ SCHEMAS ============

const thresholdSchema = z.object({
  key: z.string().min(1),
  description: z.string().optional(),
  amountPEN: z.number().positive(),
  active: z.boolean().optional()
});

const approveInvoiceSchema = z.object({
  note: z.string().optional()
});

const approveOcSchema = z.object({
  note: z.string().optional()
});

// ============ HELPERS ============

/**
 * Obtiene el umbral de aprobación VP para facturas
 * @returns El monto umbral en PEN con IGV, o null si no está configurado
 */
async function getInvoiceVPThreshold(): Promise<number | null> {
  const threshold = await prisma.approvalThreshold.findUnique({
    where: { key: "INVOICE_VP_THRESHOLD" }
  });
  
  if (!threshold || !threshold.active) {
    return null;
  }
  
  return Number(threshold.amountPEN);
}

/**
 * Calcula el monto total con IGV de una factura
 * Monto con IGV = Monto sin IGV * 1.18
 */
function calcularMontoConIGV(montoSinIgv: number): number {
  return montoSinIgv * 1.18;
}

/**
 * Convierte un monto a PEN si está en USD
 * Usa el tipo de cambio estándar del año de la factura
 */
async function convertirAPEN(
  monto: number,
  currency: string,
  periodIds: number[]
): Promise<number> {
  if (currency === "PEN") {
    return monto;
  }

  // Buscar TC anual del primer periodo
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
    // Si no hay TC configurado, usar 1:1 (conservador)
    console.warn(`No se encontró TC para año ${firstPeriod.year}, usando 1:1`);
    return monto;
  }

  return monto * Number(annualRate.rate);
}

// ============ ROUTES ============

export async function registerApprovalRoutes(app: FastifyInstance) {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVAL THRESHOLDS (Umbrales configurables)
  // ═══════════════════════════════════════════════════════════════════════════

  // GET: Obtener todos los umbrales de aprobación
  app.get("/approval-thresholds", { preHandler: [requireAuth, requirePermission("catalogos")] }, async () => {
    return prisma.approvalThreshold.findMany({ orderBy: { key: "asc" } });
  });

  // GET: Obtener umbral por key
  app.get("/approval-thresholds/:key", { preHandler: [requireAuth] }, async (req, reply) => {
    const key = (req.params as any).key;
    const threshold = await prisma.approvalThreshold.findUnique({ where: { key } });
    if (!threshold) {
      return reply.code(404).send({ error: `Umbral '${key}' no encontrado` });
    }
    return threshold;
  });

  // POST: Crear nuevo umbral
  app.post("/approval-thresholds", { preHandler: [requireAuth, requirePermission("catalogos")] }, async (req, reply) => {
    const parsed = thresholdSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Datos inválidos",
        issues: parsed.error.issues
      });
    }

    try {
      const created = await prisma.approvalThreshold.create({
        data: {
          key: parsed.data.key,
          description: parsed.data.description,
          amountPEN: parsed.data.amountPEN,
          active: parsed.data.active ?? true
        }
      });
      return created;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return reply.code(409).send({ error: `Ya existe un umbral con la clave '${parsed.data.key}'` });
      }
      console.error("Error al crear umbral:", err);
      return reply.code(500).send({ error: "Error interno al crear umbral" });
    }
  });

  // PUT: Actualizar umbral existente
  app.put("/approval-thresholds/:id", { preHandler: [requireAuth, requirePermission("catalogos")] }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = thresholdSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Datos inválidos",
        issues: parsed.error.issues
      });
    }

    try {
      const updated = await prisma.approvalThreshold.update({
        where: { id },
        data: {
          ...(parsed.data.key && { key: parsed.data.key }),
          ...(parsed.data.description !== undefined && { description: parsed.data.description }),
          ...(parsed.data.amountPEN !== undefined && { amountPEN: parsed.data.amountPEN }),
          ...(parsed.data.active !== undefined && { active: parsed.data.active })
        }
      });
      return updated;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return reply.code(404).send({ error: "Umbral no encontrado" });
      }
      console.error("Error al actualizar umbral:", err);
      return reply.code(500).send({ error: "Error interno al actualizar umbral" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICE APPROVALS (Aprobaciones de Facturas)
  // ═══════════════════════════════════════════════════════════════════════════

  // GET: Facturas pendientes de Aprobación Head
  // Incluye tanto APROBACION_HEAD como EN_APROBACION (legacy) para compatibilidad
  // Retorna campo computado _requiresVP para indicar si supera el umbral
  app.get("/approvals/invoices/head", { 
    preHandler: [requireAuth, requirePermission("aprobaciones:facturas_head")] 
  }, async () => {
    const invoices = await prisma.invoice.findMany({
      where: { 
        statusCurrent: { 
          in: ["APROBACION_HEAD", "EN_APROBACION"] 
        } 
      },
      orderBy: [
        { ultimusIncident: "asc" },
        { createdAt: "desc" }
      ],
      include: {
        oc: {
          include: {
            support: { select: { id: true, code: true, name: true } },
            costCenters: {
              include: { costCenter: { select: { id: true, code: true, name: true } } }
            }
          }
        },
        proveedor: { select: { id: true, ruc: true, razonSocial: true } },
        support: { select: { id: true, code: true, name: true } },
        periods: {
          include: { period: { select: { id: true, year: true, month: true, label: true } } }
        },
        costCenters: {
          include: { costCenter: { select: { id: true, code: true, name: true } } }
        }
      }
    });

    // Obtener umbral VP
    const umbralVP = await getInvoiceVPThreshold();

    // Calcular _requiresVP y _montoConIgvPEN para cada factura
    const enrichedInvoices = await Promise.all(
      invoices.map(async (inv) => {
        const montoSinIgv = inv.montoSinIgv ? Number(inv.montoSinIgv) : 0;
        const periodIds = inv.periods.map(p => p.periodId);
        
        let montoEnPEN = montoSinIgv;
        if (inv.currency !== "PEN" && periodIds.length > 0) {
          try {
            montoEnPEN = await convertirAPEN(montoSinIgv, inv.currency, periodIds);
          } catch {
            // Si falla conversión, usar monto original
          }
        }
        
        const montoConIgvPEN = calcularMontoConIGV(montoEnPEN);
        const requiresVP = umbralVP !== null && montoConIgvPEN >= umbralVP;

        return {
          ...inv,
          _requiresVP: requiresVP,
          _montoConIgvPEN: montoConIgvPEN,
          _umbralVP: umbralVP
        };
      })
    );

    return enrichedInvoices;
  });

  // GET: Facturas pendientes de Aprobación VP
  app.get("/approvals/invoices/vp", { 
    preHandler: [requireAuth, requirePermission("aprobaciones:facturas_vp")] 
  }, async () => {
    const invoices = await prisma.invoice.findMany({
      where: { statusCurrent: "APROBACION_VP" },
      orderBy: [
        { ultimusIncident: "asc" },
        { createdAt: "desc" }
      ],
      include: {
        oc: {
          include: {
            support: { select: { id: true, code: true, name: true } },
            costCenters: {
              include: { costCenter: { select: { id: true, code: true, name: true } } }
            }
          }
        },
        proveedor: { select: { id: true, ruc: true, razonSocial: true } },
        support: { select: { id: true, code: true, name: true } },
        periods: {
          include: { period: { select: { id: true, year: true, month: true, label: true } } }
        },
        costCenters: {
          include: { costCenter: { select: { id: true, code: true, name: true } } }
        }
      }
    });
    return invoices;
  });

  // POST: Aprobar factura desde Head
  // Lógica: Si monto con IGV >= umbral → APROBACION_VP, sino → EN_CONTABILIDAD
  app.post("/approvals/invoices/:id/approve-head", { 
    preHandler: [requireAuth, requirePermission("aprobaciones:facturas_head")] 
  }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = approveInvoiceSchema.safeParse(req.body);
    
    // Obtener factura con periodos
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        periods: { select: { periodId: true } }
      }
    });

    if (!invoice) {
      return reply.code(404).send({ error: "Factura no encontrada" });
    }

    // Permitir tanto APROBACION_HEAD como EN_APROBACION (legacy)
    const allowedHeadStates = ["APROBACION_HEAD", "EN_APROBACION"];
    if (!allowedHeadStates.includes(invoice.statusCurrent)) {
      return reply.code(400).send({ 
        error: `La factura no está en estado de aprobación Head (actual: ${invoice.statusCurrent})` 
      });
    }

    // Calcular monto en PEN con IGV
    const montoSinIgv = invoice.montoSinIgv ? Number(invoice.montoSinIgv) : 0;
    const periodIds = invoice.periods.map(p => p.periodId);
    const montoEnPEN = await convertirAPEN(montoSinIgv, invoice.currency, periodIds);
    const montoConIGV = calcularMontoConIGV(montoEnPEN);

    // Obtener umbral VP
    const umbralVP = await getInvoiceVPThreshold();
    
    // Determinar siguiente estado
    let nextStatus: InvStatus;
    if (umbralVP !== null && montoConIGV >= umbralVP) {
      nextStatus = "APROBACION_VP";
    } else {
      nextStatus = "EN_CONTABILIDAD";
    }

    // Actualizar estado
    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id },
        data: { 
          statusCurrent: nextStatus,
          ...(nextStatus === "EN_CONTABILIDAD" && { approvedAt: new Date() })
        }
      });

      await tx.invoiceStatusHistory.create({
        data: {
          invoiceId: id,
          status: nextStatus,
          note: parsed.data?.note ?? `Aprobado por Head. Monto con IGV: S/ ${montoConIGV.toFixed(2)}${umbralVP ? ` (umbral: S/ ${umbralVP.toFixed(2)})` : ''}`
        }
      });

      return inv;
    });

    // Broadcast cambio
    broadcastInvoiceStatusChange({
      invoiceId: id,
      newStatus: nextStatus,
      timestamp: new Date().toISOString()
    });

    return {
      ...updated,
      _meta: {
        montoConIGV,
        umbralVP,
        nextStatus,
        requiresVPApproval: nextStatus === "APROBACION_VP"
      }
    };
  });

  // POST: Aprobar factura desde VP
  // Lógica: VP siempre aprueba a EN_CONTABILIDAD
  app.post("/approvals/invoices/:id/approve-vp", { 
    preHandler: [requireAuth, requirePermission("aprobaciones:facturas_vp")] 
  }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = approveInvoiceSchema.safeParse(req.body);
    
    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      return reply.code(404).send({ error: "Factura no encontrada" });
    }

    if (invoice.statusCurrent !== "APROBACION_VP") {
      return reply.code(400).send({ 
        error: `La factura no está en estado APROBACION_VP (actual: ${invoice.statusCurrent})` 
      });
    }

    const nextStatus: InvStatus = "EN_CONTABILIDAD";

    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id },
        data: { 
          statusCurrent: nextStatus,
          approvedAt: new Date()
        }
      });

      await tx.invoiceStatusHistory.create({
        data: {
          invoiceId: id,
          status: nextStatus,
          note: parsed.data?.note ?? "Aprobado por VP"
        }
      });

      return inv;
    });

    broadcastInvoiceStatusChange({
      invoiceId: id,
      newStatus: nextStatus,
      timestamp: new Date().toISOString()
    });

    return updated;
  });

  // POST: Rechazar factura (desde Head o VP)
  app.post("/approvals/invoices/:id/reject", { 
    preHandler: [requireAuth, requirePermission("aprobaciones:facturas_head")] 
  }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const { note } = req.body as { note?: string };
    
    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      return reply.code(404).send({ error: "Factura no encontrada" });
    }

    const allowedStates = ["APROBACION_HEAD", "APROBACION_VP"];
    if (!allowedStates.includes(invoice.statusCurrent)) {
      return reply.code(400).send({ 
        error: `La factura no está en estado de aprobación (actual: ${invoice.statusCurrent})` 
      });
    }

    const nextStatus: InvStatus = "RECHAZADO";

    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id },
        data: { statusCurrent: nextStatus }
      });

      await tx.invoiceStatusHistory.create({
        data: {
          invoiceId: id,
          status: nextStatus,
          note: note ?? "Rechazado en proceso de aprobación"
        }
      });

      return inv;
    });

    broadcastInvoiceStatusChange({
      invoiceId: id,
      newStatus: nextStatus,
      timestamp: new Date().toISOString()
    });

    return updated;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OC APPROVALS (Aprobaciones de Órdenes de Compra)
  // ═══════════════════════════════════════════════════════════════════════════

  // GET: OCs pendientes de Aprobación VP (incluye solicitudes de anulación)
  app.get("/approvals/ocs/vp", { 
    preHandler: [requireAuth, requirePermission("aprobaciones:ocs_vp")] 
  }, async () => {
    const ocs = await prisma.oC.findMany({
      where: {
        OR: [
          { estado: "APROBACION_VP" },
          { estado: "ANULAR" }  // Solicitudes de anulación también van a VP
        ]
      },
      orderBy: [
        { incidenteOc: "asc" },
        { fechaRegistro: "desc" }
      ],
      include: {
        support: { select: { id: true, code: true, name: true } },
        budgetPeriodFrom: { select: { id: true, year: true, month: true, label: true } },
        budgetPeriodTo: { select: { id: true, year: true, month: true, label: true } },
        articulo: { select: { id: true, code: true, name: true } },
        proveedorRef: { select: { id: true, razonSocial: true, ruc: true } },
        solicitanteUser: { select: { id: true, email: true, name: true } },
        costCenters: {
          include: { costCenter: { select: { id: true, code: true, name: true } } }
        },
        statusHistory: { orderBy: { changedAt: "desc" }, take: 5 }
      }
    });
    return ocs;
  });

  // POST: Aprobar OC desde VP → ATENDER_COMPRAS
  app.post("/approvals/ocs/:id/approve-vp", { 
    preHandler: [requireAuth, requirePermission("aprobaciones:ocs_vp")] 
  }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = approveOcSchema.safeParse(req.body);
    
    const oc = await prisma.oC.findUnique({ where: { id } });

    if (!oc) {
      return reply.code(404).send({ error: "OC no encontrada" });
    }

    if (oc.estado !== "APROBACION_VP") {
      return reply.code(400).send({ 
        error: `La OC no está en estado APROBACION_VP (actual: ${oc.estado})` 
      });
    }

    const nextStatus: OcStatus = "ATENDER_COMPRAS";

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOc = await tx.oC.update({
        where: { id },
        data: { estado: nextStatus },
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
          status: nextStatus,
          note: parsed.data?.note ?? "Aprobado por VP"
        }
      });

      return updatedOc;
    });

    broadcastOcStatusChange({
      ocId: id,
      newStatus: nextStatus,
      timestamp: new Date().toISOString()
    });

    return updated;
  });

  // POST: Aprobar anulación de OC → ANULADO
  app.post("/approvals/ocs/:id/approve-cancel", { 
    preHandler: [requireAuth, requirePermission("aprobaciones:ocs_vp")] 
  }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = (req.body || {}) as { note?: string };
    const note = body.note;
    
    const oc = await prisma.oC.findUnique({ where: { id } });

    if (!oc) {
      return reply.code(404).send({ error: "OC no encontrada" });
    }

    if (oc.estado !== "ANULAR") {
      return reply.code(400).send({ 
        error: `La OC no está en estado ANULAR (actual: ${oc.estado})` 
      });
    }

    const nextStatus: OcStatus = "ANULADO";

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const updatedOc = await tx.oC.update({
          where: { id },
          data: { estado: nextStatus },
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
            status: nextStatus,
            note: note ?? "Anulación aprobada por VP"
          }
        });

        return updatedOc;
      });

      broadcastOcStatusChange({
        ocId: id,
        newStatus: nextStatus,
        timestamp: new Date().toISOString()
      });

      return updated;
    } catch (err) {
      console.error("[approve-cancel] Error al anular OC:", err);
      return reply.code(500).send({ error: "Error interno al anular OC" });
    }
  });

  // POST: Rechazar solicitud de anulación → vuelve al estado anterior (PROCESADO típicamente)
  app.post("/approvals/ocs/:id/reject-cancel", { 
    preHandler: [requireAuth, requirePermission("aprobaciones:ocs_vp")] 
  }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = (req.body || {}) as { note?: string };
    const note = body.note;
    
    const oc = await prisma.oC.findUnique({
      where: { id },
      include: {
        statusHistory: { orderBy: { changedAt: "desc" }, take: 5 }
      }
    });

    if (!oc) {
      return reply.code(404).send({ error: "OC no encontrada" });
    }

    if (oc.estado !== "ANULAR") {
      return reply.code(400).send({ 
        error: `La OC no está en estado ANULAR (actual: ${oc.estado})` 
      });
    }

    // Buscar el estado anterior (antes de ANULAR)
    const previousStatus = oc.statusHistory.find(h => h.status !== "ANULAR")?.status || "PROCESADO";
    const nextStatus = previousStatus as OcStatus;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOc = await tx.oC.update({
        where: { id },
        data: { estado: nextStatus },
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
          status: nextStatus,
          note: note ?? `Solicitud de anulación rechazada. Regresa a ${nextStatus}`
        }
      });

      return updatedOc;
    });

    broadcastOcStatusChange({
      ocId: id,
      newStatus: nextStatus,
      timestamp: new Date().toISOString()
    });

    return updated;
  });
}
