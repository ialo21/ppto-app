import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient, Prisma, InvStatus, OcStatus } from "@prisma/client";
import { broadcastOcStatusChange, broadcastInvoiceStatusChange } from "./websocket";
import { gmailMailerService } from "./gmail-mailer";
import { z } from "zod";

const prisma = new PrismaClient();

/**
 * Envía notificación a N8N cuando una OC es procesada
 */
async function notifyN8nOcProcesada(ocId: number, incidenteOc: string | null) {
  const webhookUrl = process.env.N8N_OC_PROCESADA_WEBHOOK_URL;
  
  if (!webhookUrl) {
    if (process.env.NODE_ENV === "development") {
      console.log("[N8N] N8N_OC_PROCESADA_WEBHOOK_URL no configurada, omitiendo notificación");
    }
    return;
  }

  try {
    const incidentRaw = incidenteOc?.toString().trim();
    const incidenteFormatted = incidentRaw
      ? (incidentRaw.toUpperCase().startsWith("INC") ? incidentRaw : `INC ${incidentRaw}`)
      : "";

    const payload = {
      incidente: incidenteFormatted,
      ocId: ocId
    };

    if (process.env.NODE_ENV === "development") {
      console.log(`[N8N] Enviando notificación a N8N: ${webhookUrl}`, payload);
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[N8N] Notificación N8N enviada exitosamente para OC ${ocId}`);
    }
  } catch (error: any) {
    console.error(`[N8N] Error al enviar notificación a N8N para OC ${ocId}:`, error.message);
  }
}

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
  numeroOc: z.string().optional(),
  docType: z.enum(["FACTURA", "NOTA_CREDITO"]).default("FACTURA"),
  numberNorm: z.string().min(1, "Número de factura es requerido"),
  montoSinIgv: z.number().nonnegative({ message: "Monto debe ser mayor o igual a 0" }),
  periodos: z.union([
    z.string().regex(/^\d{2}\/\d{2}$/, "Formato debe ser MM/YY"),
    z.array(z.string().regex(/^\d{2}\/\d{2}$/, "Formato debe ser MM/YY")).min(1)
  ]),
  cecos: z.union([
    z.string(),
    z.array(z.string()).min(1)
  ]).optional(),
  ultimusIncident: z.string().optional(),
  detalle: z.string().optional(),
  sustento: z.string().optional(),
  ruc: z.string().regex(/^\d{11}$/, "RUC debe tener 11 dígitos").optional(),
  moneda: z.enum(["PEN", "USD"]).optional(),
  responsableUserId: z.number().int().positive().optional(),
  exchangeRateOverride: z.number().positive().optional(),
  mesContable: z.string().regex(/^\d{4}-\d{2}$/).nullish(),
  tcReal: z.number().positive().nullish()
});

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

const deliverOcN8nSchema = z.object({
  solicitudOc: z.string().min(1, "Número de solicitud es requerido"),
  numeroOc: z.string().min(1, "Número de OC es requerido"),
  deliveryLink: z.string().url("Link debe ser una URL válida"),
  note: z.string().optional()
});

async function resolvePeriodosMMYY(periodos: string | string[]): Promise<number[]> {
  const periodIds: number[] = [];
  const periodosArray = Array.isArray(periodos) ? periodos : [periodos];
  
  for (const key of periodosArray) {
    const [monthStr, yearStr] = key.split('/');
    const month = parseInt(monthStr, 10);
    const year = 2000 + parseInt(yearStr, 10); // YY a YYYY
    
    const period = await prisma.period.findFirst({
      where: { year, month }
    });
    
    if (!period) {
      throw new Error(`Periodo ${key} (${month}/${year}) no encontrado`);
    }
    
    periodIds.push(period.id);
  }
  
  return periodIds;
}

async function resolveNumeroOc(numeroOc: string): Promise<any> {
  const oc = await prisma.oC.findFirst({
    where: { numeroOc },
    include: {
      budgetPeriodFrom: true,
      budgetPeriodTo: true,
      costCenters: {
        include: { costCenter: true }
      }
    }
  });
  
  if (!oc) {
    throw new Error(`OC con número ${numeroOc} no encontrada`);
  }
  
  return oc;
}

async function resolveSustentoNombre(nombre: string): Promise<any> {
  const support = await prisma.support.findFirst({
    where: { name: nombre },
    include: {
      costCenters: {
        include: { costCenter: true }
      }
    }
  });
  
  if (!support) {
    throw new Error(`Sustento "${nombre}" no encontrado`);
  }
  
  return support;
}

async function resolveProveedorRuc(ruc: string): Promise<{ id: number; razonSocial: string }> {
  const proveedor = await prisma.proveedor.findUnique({
    where: { ruc }
  });
  
  if (!proveedor) {
    throw new Error(`Proveedor con RUC ${ruc} no encontrado`);
  }
  
  return { id: proveedor.id, razonSocial: proveedor.razonSocial };
}

async function resolveCecoCodes(cecos: string | string[], montoTotal: number): Promise<Array<{
  costCenterId: number;
  amount: number;
}>> {
  const cecosArray = Array.isArray(cecos) ? cecos : [cecos];
  const resolvedAllocations: Array<{
    costCenterId: number;
    amount: number;
  }> = [];
  
  // Si hay un solo CECO, asignar todo el monto
  if (cecosArray.length === 1) {
    const costCenter = await prisma.costCenter.findUnique({
      where: { code: cecosArray[0] }
    });
    
    if (!costCenter) {
      throw new Error(`CECO con código "${cecosArray[0]}" no encontrado`);
    }
    
    return [{
      costCenterId: costCenter.id,
      amount: montoTotal
    }];
  }
  
  // Si hay múltiples CECOs, distribuir equitativamente
  const amountPerCeco = montoTotal / cecosArray.length;
  
  for (const cecoCode of cecosArray) {
    const costCenter = await prisma.costCenter.findUnique({
      where: { code: cecoCode }
    });
    
    if (!costCenter) {
      throw new Error(`CECO con código "${cecoCode}" no encontrado`);
    }
    
    resolvedAllocations.push({
      costCenterId: costCenter.id,
      amount: amountPerCeco
    });
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
    let allocations: Array<{ costCenterId: number; amount: number }>;
    let proveedorId: number | undefined;
    let proveedorNombre: string | undefined;
    let support: any = null;
    let responsableUserId: number | null = null;

    try {
      // Resolver periodos desde formato MM/YY
      periodIds = await resolvePeriodosMMYY(parsed.data.periodos);

      // Resolver CECOs si se proporcionan
      if (parsed.data.cecos) {
        allocations = await resolveCecoCodes(parsed.data.cecos, parsed.data.montoSinIgv);
      } else {
        allocations = [];
      }

      // Resolver sustento por nombre
      if (parsed.data.sustento) {
        support = await resolveSustentoNombre(parsed.data.sustento);
      }

      // Resolver proveedor por RUC
      if (parsed.data.ruc) {
        const prov = await resolveProveedorRuc(parsed.data.ruc);
        proveedorId = prov.id;
        proveedorNombre = prov.razonSocial;
      }

      if (parsed.data.responsableUserId) {
        responsableUserId = parsed.data.responsableUserId;
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
    let proveedor = proveedorNombre || "";

    if (data.numeroOc) {
      try {
        oc = await resolveNumeroOc(data.numeroOc);
      } catch (error: any) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["numeroOc"], message: error.message || "OC no encontrada" }]
        });
      }

      // Con OC: jalar moneda, proveedor y responsable de la OC
      currency = oc.moneda;
      proveedor = oc.proveedor;
      proveedorId = oc.vendorId || undefined;
      
      // Jalar responsable de la OC (solicitante)
      if (oc.solicitanteUserId && !responsableUserId) {
        responsableUserId = oc.solicitanteUserId;
      }

      // Si no hay CECOs proporcionados, usar el primer CECO de la OC con monto total
      if (allocations.length === 0 && oc.costCenters.length > 0) {
        allocations = [{
          costCenterId: oc.costCenters[0].costCenterId,
          amount: data.montoSinIgv
        }];
      }

      const consumoActual = await calcularConsumoOC(oc.id);
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

      // Validar CECOs si fueron proporcionados
      if (allocations.length > 0 && data.cecos) {
        const ocCecoIds = new Set(oc.costCenters.map((cc: any) => cc.costCenterId));
        const invalidCecos = allocations.filter(a => !ocCecoIds.has(a.costCenterId));
        if (invalidCecos.length > 0) {
          return reply.code(422).send({
            error: "VALIDATION_ERROR",
            issues: [{
              path: ["cecos"],
              message: `Algunos CECOs seleccionados no están asociados a la OC`
            }]
          });
        }
      }
    } else {
      // Sin OC: exigir sustento, proveedor y moneda
      if (!support) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["sustento"], message: "Sustento es requerido cuando no hay OC (nombre exacto del sustento)" }]
        });
      }
      if (!proveedorId) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["ruc"], message: "RUC del proveedor es requerido cuando no hay OC" }]
        });
      }
      if (!data.moneda) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["moneda"], message: "Moneda es requerida cuando no hay OC" }]
        });
      }

      // Si no hay CECOs, usar el primer CECO del sustento con el monto total
      if (allocations.length === 0 && support.costCenters.length > 0) {
        allocations = [{
          costCenterId: support.costCenters[0].costCenterId,
          amount: data.montoSinIgv
        }];
      }

      // Validar CECOs ⊆ CECOs del sustento si fueron proporcionados
      if (allocations.length > 0 && data.cecos) {
        const supportCecoIds = new Set(support.costCenters.map((cc: any) => cc.costCenterId));
        const invalidCecos = allocations.filter(a => !supportCecoIds.has(a.costCenterId));
        if (invalidCecos.length > 0) {
          return reply.code(422).send({
            error: "VALIDATION_ERROR",
            issues: [{
              path: ["cecos"],
              message: `Algunos CECOs seleccionados no están asociados al sustento`
            }]
          });
        }
      }

      // Sin OC: si no hay responsable, usar super admin por defecto
      if (!responsableUserId) {
        const superAdmin = await prisma.user.findFirst({
          where: { email: "iago.lopez@interseguro.com.pe" }
        });
        if (superAdmin) {
          responsableUserId = superAdmin.id;
        }
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

    // Validar distribución solo si hay allocations
    if (allocations.length > 0) {
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
          ocId: oc?.id ?? null,
          supportId: support?.id ?? null,
          docType: data.docType as any,
          numberNorm: data.numberNorm,
          currency,
          montoSinIgv: new Prisma.Decimal(data.montoSinIgv),
          exchangeRateOverride: data.exchangeRateOverride ? new Prisma.Decimal(data.exchangeRateOverride) : null,
          ultimusIncident: data.ultimusIncident ?? null,
          detalle: data.detalle ?? (oc?.descripcion || null),
          statusCurrent: "INGRESADO",
          createdBy: responsableUserId,
          mesContable: camposContables.mesContable,
          tcEstandar: camposContables.tcEstandar !== null ? new Prisma.Decimal(camposContables.tcEstandar) : null,
          tcReal: camposContables.tcReal !== null ? new Prisma.Decimal(camposContables.tcReal) : null,
          montoPEN_tcEstandar: camposContables.montoPEN_tcEstandar !== null ? new Prisma.Decimal(camposContables.montoPEN_tcEstandar) : null,
          montoPEN_tcReal: camposContables.montoPEN_tcReal !== null ? new Prisma.Decimal(camposContables.montoPEN_tcReal) : null,
          diferenciaTC: camposContables.diferenciaTC !== null ? new Prisma.Decimal(camposContables.diferenciaTC) : null,
          proveedorId: oc ? null : (proveedorId ?? null),
          vendorId: oc ? (proveedorId ?? null) : null,
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
          amount: new Prisma.Decimal(alloc.amount),
          percentage: null
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

    // Broadcast creación de factura via WebSocket
    broadcastInvoiceStatusChange({
      invoiceId: created.id,
      newStatus: "INGRESADO",
      timestamp: new Date().toISOString()
    });

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

    // Emitir broadcast para que el frontend se actualice en vivo
    try {
      await broadcastOcStatusChange({
        ocId: id,
        newStatus: targetStatus,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[N8N] No se pudo emitir broadcast de OC ${id}:`, err);
      }
    }

    // Si el estado cambió a PROCESADO, notificar al webhook de N8N
    if (targetStatus === "PROCESADO") {
      await notifyN8nOcProcesada(id, updated.incidenteOc);
    }

    return updated;
  });

  app.post("/n8n/ocs/delivery", { preHandler: requireN8nKey }, async (req, reply) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[N8N] POST /n8n/ocs/delivery - Payload:", JSON.stringify(req.body, null, 2));
    }

    const parsed = deliverOcN8nSchema.safeParse(req.body);
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

    const { solicitudOc, numeroOc, deliveryLink, note } = parsed.data;

    // Buscar OC por número de solicitud
    const oc = await prisma.oC.findFirst({
      where: { solicitudOc }
    });

    if (!oc) {
      return reply.code(404).send({
        error: "OC_NOT_FOUND",
        message: `No se encontró OC con número de solicitud: ${solicitudOc}`
      });
    }

    // Validar que el número de OC no esté ya tomado por otra OC
    if (numeroOc) {
      const existingOc = await prisma.oC.findFirst({
        where: {
          numeroOc,
          id: { not: oc.id }
        }
      });

      if (existingOc) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{
            path: ["numeroOc"],
            message: `El número de OC ${numeroOc} ya está asignado a otra orden`
          }]
        });
      }
    }

    // Idempotencia: si ya está ATENDIDO con mismo número y deliveryLink, no repetir acciones
    const alreadyAttended = oc.estado === "ATENDIDO" && oc.numeroOc === numeroOc && oc.deliveryLink === deliveryLink;

    // Actualizar OC con los datos de entrega
    const updated: any = await prisma.$transaction(async (tx) => {
      let updatedOc: any = oc;

      if (!alreadyAttended) {
        updatedOc = await tx.oC.update({
          where: { id: oc.id },
          data: {
            numeroOc,
            deliveryLink,
            estado: "ATENDIDO"
          },
          include: {
            support: { select: { id: true, code: true, name: true } },
            budgetPeriodFrom: { select: { id: true, year: true, month: true, label: true } },
            budgetPeriodTo: { select: { id: true, year: true, month: true, label: true } },
            proveedorRef: { select: { id: true, razonSocial: true, ruc: true } },
            solicitanteUser: { select: { id: true, email: true, name: true } },
            costCenters: {
              include: { costCenter: { select: { id: true, code: true, name: true } } }
            }
          }
        });

        // Registrar cambio de estado en historial
        await tx.oCStatusHistory.create({
          data: {
            ocId: oc.id,
            status: "ATENDIDO",
            note: note || `OC entregada automáticamente desde n8n. Número: ${numeroOc}`
          }
        });
      } else {
        // Aun así incluir relaciones para respuesta coherente
        updatedOc = await tx.oC.findUnique({
          where: { id: oc.id },
          include: {
            support: { select: { id: true, code: true, name: true } },
            budgetPeriodFrom: { select: { id: true, year: true, month: true, label: true } },
            budgetPeriodTo: { select: { id: true, year: true, month: true, label: true } },
            proveedorRef: { select: { id: true, razonSocial: true, ruc: true } },
            solicitanteUser: { select: { id: true, email: true, name: true } },
            costCenters: {
              include: { costCenter: { select: { id: true, code: true, name: true } } }
            }
          }
        }) as any;
      }

      return updatedOc;
    });

    // Broadcast cambio de estado para que el frontend se actualice en vivo
    if (!alreadyAttended) {
      try {
        await broadcastOcStatusChange({
          ocId: updated.id,
          newStatus: "ATENDIDO",
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[N8N] No se pudo emitir broadcast de OC:", err);
        }
      }
    }

    // Enviar correo de notificación al solicitante (solo si no estaba ya atendida con mismo payload)
    if (!alreadyAttended) {
      const recipientEmail = updated.solicitanteUser?.email || updated.correoSolicitante || "";
      const recipientName = updated.solicitanteUser?.name || updated.nombreSolicitante || recipientEmail;

      if (gmailMailerService.isEnabled() && recipientEmail) {
        try {
          const periodText = updated.periodoEnFechasText || 
            `${updated.budgetPeriodFrom?.label || ''} - ${updated.budgetPeriodTo?.label || ''}`;
          
          const emailData = gmailMailerService.createOcDeliveryEmail({
            recipientEmail,
            recipientName,
            ocNumber: numeroOc,
            description: updated.descripcion || 'Sin descripción',
            supportName: updated.support?.name || 'No especificado',
            periodText: periodText.trim() || 'No especificado',
            deliveryLink: deliveryLink
          });

          await gmailMailerService.sendEmail(emailData);
          
          if (process.env.NODE_ENV === "development") {
            console.log(`[N8N] Correo enviado a ${recipientEmail}`);
          }
        } catch (emailErr: any) {
          console.error("[N8N] Error al enviar correo de notificación:", emailErr.message);
          // No detener el proceso si falla el correo
        }
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[N8N] OC ${oc.id} marcada como ATENDIDA con número ${numeroOc}`);
    }

    return {
      success: true,
      oc: updated,
      message: alreadyAttended
        ? `OC ya estaba ATENDIDA con los mismos datos; no se repitió correo ni historial`
        : `OC actualizada exitosamente con número ${numeroOc}`
    };
  });

  app.get("/n8n/health", { preHandler: requireN8nKey }, async () => {
    return { 
      ok: true, 
      service: "n8n-integration",
      timestamp: new Date().toISOString()
    };
  });
}
