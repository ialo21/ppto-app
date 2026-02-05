import { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requirePermission } from "./auth";
import { broadcastInvoiceStatusChange } from "./websocket";

const prisma = new PrismaClient();

// Schemas
const allocationSchema = z.object({
  costCenterId: z.number().int().positive(),
  amount: z.number().nonnegative().optional(),
  percentage: z.number().min(0).max(100).optional()
});

const createInvoiceSchema = z.object({
  ocId: z.number().int().positive({ message: "OC es requerida" }).optional(),  // Ahora opcional (sin OC)
  docType: z.enum(["FACTURA", "NOTA_CREDITO"], { message: "Tipo inválido" }).default("FACTURA"),
  numberNorm: z.string().min(1, "Número es requerido"),
  montoSinIgv: z.number().nonnegative({ message: "Monto debe ser mayor o igual a 0" }),
  periodIds: z.array(z.number().int().positive()).min(1, "Debe seleccionar al menos un periodo"),
  allocations: z.array(allocationSchema).min(1, "Debe seleccionar al menos un CECO"),
  ultimusIncident: z.string().optional(),
  detalle: z.string().optional(),
  // Campos para "sin OC"
  supportId: z.number().int().positive().optional(),  // Sustento para facturas sin OC
  proveedorId: z.number().int().positive().optional(),
  proveedor: z.string().optional(),  // Legacy - mantener por compatibilidad
  moneda: z.enum(["PEN", "USD"]).optional(),
  responsableUserId: z.number().int().positive().optional(),  // Responsable (usuario) para facturas sin OC
  // Tipo de cambio override (opcional)
  exchangeRateOverride: z.number().positive().optional(),
  // Campos contables
  mesContable: z.string().regex(/^\d{4}-\d{2}$/).nullish(),  // Formato YYYY-MM, acepta null/undefined
  tcReal: z.number().positive().nullish()
});

const updateInvoiceSchema = z.object({
  ocId: z.number().int().positive().optional(),
  docType: z.enum(["FACTURA", "NOTA_CREDITO"]).optional(),
  numberNorm: z.string().min(1).optional(),
  montoSinIgv: z.number().nonnegative().optional(),
  periodIds: z.array(z.number().int().positive()).min(1).optional(),
  allocations: z.array(allocationSchema).min(1).optional(),
  ultimusIncident: z.string().nullish(),  // IMPORTANTE: .nullish() permite borrar el incidente enviando null
  detalle: z.string().nullish(),  // IMPORTANTE: .nullish() permite borrar el detalle enviando null
  supportId: z.number().int().positive().optional(),  // Sustento para facturas sin OC
  proveedorId: z.number().int().positive().optional(),
  proveedor: z.string().optional(),  // Legacy - mantener por compatibilidad
  moneda: z.enum(["PEN", "USD"]).optional(),
  responsableUserId: z.number().int().positive().optional(),  // Responsable (usuario) para facturas sin OC
  exchangeRateOverride: z.number().positive().optional(),
  // Campos contables
  // IMPORTANTE: .nullish() permite null y undefined, necesario para que el usuario pueda borrar el mes contable
  mesContable: z.string().regex(/^\d{4}-\d{2}$/).nullish(),
  tcReal: z.number().positive().nullish()
});

const updateStatusSchema = z.object({
  status: z.enum([
    "INGRESADO", "EN_APROBACION", "APROBACION_HEAD", "APROBACION_VP", "EN_CONTABILIDAD",
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

/**
 * Calcula el tipo de cambio efectivo para una factura
 * - Si currency=PEN → 1
 * - Si currency=USD y hay override → override
 * - Si currency=USD y no hay override → buscar TC anual del primer periodo
 * - Si currency=USD, no hay override y no hay TC anual → lanzar error
 */
async function calcularEffectiveRate(
  currency: string,
  periodIds: number[],
  exchangeRateOverride?: number
): Promise<{ effectiveRate: number; source: "PEN" | "override" | "annual" | "error" }> {
  if (currency === "PEN") {
    return { effectiveRate: 1, source: "PEN" };
  }

  // Moneda = USD
  if (exchangeRateOverride !== undefined) {
    return { effectiveRate: exchangeRateOverride, source: "override" };
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
    return { effectiveRate: 0, source: "error" };  // Indicador para bloqueo
  }

  return { effectiveRate: Number(annualRate.rate), source: "annual" };
}

/**
 * Calcula los campos contables de una factura
 * NUEVA LÓGICA:
 * - mesContable: opcional (puede ser null)
 * - tcEstandar: siempre se calcula para USD (del catálogo anual)
 * - montoPEN_tcEstandar: siempre se calcula para USD
 * - tcReal: solo si hay mesContable (editable por usuario)
 * - montoPEN_tcReal: solo si hay mesContable
 * - diferenciaTC: solo si hay mesContable
 */
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
  // Obtener el primer periodo
  const firstPeriod = await prisma.period.findUnique({
    where: { id: periodIds[0] },
    select: { year: true, month: true }
  });

  if (!firstPeriod) {
    throw new Error(`Periodo ${periodIds[0]} no encontrado`);
  }

  // Si moneda es PEN, no hay campos contables USD
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

  // Moneda es USD: buscar TC estándar del catálogo
  const annualRate = await prisma.exchangeRate.findUnique({
    where: { year: firstPeriod.year }
  });

  if (!annualRate) {
    throw new Error(`No se encontró tipo de cambio para el año ${firstPeriod.year}. Configure el TC en Catálogos.`);
  }

  const tcEstandar = Number(annualRate.rate);
  const montoPEN_tcEstandar = montoSinIgv * tcEstandar;

  // Si no hay mesContable, solo retornar tcEstandar y montoPEN_tcEstandar
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

  // Si hay mesContable, calcular también tcReal, montoPEN_tcReal y diferenciaTC
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

export async function registerInvoiceRoutes(app: FastifyInstance) {
  // List (con OC incluida + Paquete, Concepto, CECO + periodos y CECOs M:N)
  // Permiso: facturas:listado (o facturas global)
  app.get("/invoices", { preHandler: [requireAuth, requirePermission("facturas:listado")] }, async (req, reply) => {
    const items = await prisma.invoice.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        oc: {
          include: {
            proveedorRef: { select: { id: true, razonSocial: true, ruc: true } },
            solicitanteUser: { select: { id: true, name: true, email: true } },  // Solicitante de la OC
            support: {
              include: {
                expensePackage: true,
                expenseConcept: true,
                costCenter: true
              }
            },
            ceco: true,  // CECO directo de OC (legacy)
            costCenters: {  // CECOs M:N de OC
              include: {
                costCenter: { select: { id: true, code: true, name: true } }
              }
            },
            budgetPeriodFrom: { select: { id: true, year: true, month: true, label: true } },
            budgetPeriodTo: { select: { id: true, year: true, month: true, label: true } }
          }
        },
        support: {  // Sustento para facturas sin OC
          include: {
            expensePackage: true,
            expenseConcept: true,
            costCenter: true,
            costCenters: {
              include: {
                costCenter: { select: { id: true, code: true, name: true } }
              }
            }
          }
        },
        proveedor: true,  // Proveedor para facturas sin OC
        vendor: true,  // Legacy
        createdByUser: { select: { id: true, name: true, email: true } },  // Usuario creador
        approvedByUser: { select: { id: true, name: true, email: true } },  // Usuario aprobador
        periods: {  // Periodos de la factura (M:N)
          include: {
            period: { select: { id: true, year: true, month: true, label: true } }
          },
          orderBy: { period: { year: 'asc' } }
        },
        costCenters: {  // CECOs de la factura (M:N con distribución)
          include: {
            costCenter: { select: { id: true, code: true, name: true } }
          }
        }
      }
    });
    return items;
  });

  // Get by id
  // Permiso: facturas:listado (o facturas global)
  app.get("/invoices/:id", { preHandler: [requireAuth, requirePermission("facturas:listado")] }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: {
        oc: {
          include: {
            proveedorRef: { select: { id: true, razonSocial: true, ruc: true } },
            support: true,
            costCenters: {
              include: {
                costCenter: { select: { id: true, code: true, name: true } }
              }
            },
            budgetPeriodFrom: { select: { id: true, year: true, month: true, label: true } },
            budgetPeriodTo: { select: { id: true, year: true, month: true, label: true } }
          }
        },
        support: {  // Sustento para facturas sin OC
          include: {
            expensePackage: true,
            expenseConcept: true,
            costCenter: true,
            costCenters: {
              include: {
                costCenter: { select: { id: true, code: true, name: true } }
              }
            }
          }
        },
        proveedor: true,  // Proveedor para facturas sin OC
        vendor: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
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
    if (!inv) return reply.code(404).send({ error: "Factura no encontrada" });
    return inv;
  });

  // Create (FACTURA | NOTA_CREDITO)
  // Permiso: facturas:gestion (o facturas global)
  app.post("/invoices", { preHandler: [requireAuth, requirePermission("facturas:gestion")] }, async (req, reply) => {
    // Log en modo desarrollo
    if (process.env.NODE_ENV === "development") {
      console.log("📥 POST /invoices - Payload recibido:", JSON.stringify(req.body, null, 2));
    }

    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Validación Zod fallida:", parsed.error.errors);
      }
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: parsed.error.errors.map(err => ({
          path: err.path,
          message: err.message
        }))
      });
    }

    const data = parsed.data;

    // 1. Determinar si es "Con OC" o "Sin OC"
    let oc: any = null;
    let currency = data.moneda || "PEN";
    let proveedor = data.proveedor || "";
    let responsableUserId: number | null = null;  // Responsable final a asignar

    if (data.ocId) {
      // Con OC: cargar y validar
      oc = await prisma.oC.findUnique({
        where: { id: data.ocId },
        include: {
          budgetPeriodFrom: true,
          budgetPeriodTo: true,
          costCenters: {
            include: { costCenter: true }
          }
        }
      }).catch(err => {
        if (process.env.NODE_ENV === "development") {
          console.error("❌ Error al buscar OC:", err);
        }
        throw err;
      });

      if (!oc) {
        if (process.env.NODE_ENV === "development") {
          console.error(`❌ OC con ID ${data.ocId} no encontrada`);
        }
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["ocId"], message: "OC no encontrada" }]
        });
      }

      currency = oc.moneda;
      proveedor = oc.proveedor;
      
      // NUEVO: Auto-copiar solicitante de la OC como responsable de la factura
      if (oc.solicitanteUserId) {
        responsableUserId = oc.solicitanteUserId;
      }

      // Validar saldo OC
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

      // Validar periodos ⊆ periodo OC
      if (oc.budgetPeriodFromId && oc.budgetPeriodToId) {
        const fromValue = oc.budgetPeriodFrom.year * 100 + oc.budgetPeriodFrom.month;
        const toValue = oc.budgetPeriodTo.year * 100 + oc.budgetPeriodTo.month;

        const periods = await prisma.period.findMany({
          where: { id: { in: data.periodIds } }
        });

        for (const period of periods) {
          const periodValue = period.year * 100 + period.month;
          if (periodValue < fromValue || periodValue > toValue) {
            return reply.code(422).send({
              error: "VALIDATION_ERROR",
              issues: [{
                path: ["periodIds"],
                message: `El periodo ${period.year}-${String(period.month).padStart(2, '0')} está fuera del rango de la OC (${oc.budgetPeriodFrom.year}-${String(oc.budgetPeriodFrom.month).padStart(2, '0')} → ${oc.budgetPeriodTo.year}-${String(oc.budgetPeriodTo.month).padStart(2, '0')})`
              }]
            });
          }
        }
      }

      // Validar CECOs ⊆ CECOs de OC
      const ocCecoIds = new Set(oc.costCenters.map((cc: any) => cc.costCenterId));
      const invalidCecos = data.allocations.filter(a => !ocCecoIds.has(a.costCenterId));
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
      // Sin OC: validar que se proporcionen supportId, proveedorId y moneda
      if (!data.supportId) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["supportId"], message: "Sustento es requerido cuando no hay OC" }]
        });
      }
      if (!data.proveedorId) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["proveedorId"], message: "Proveedor es requerido cuando no hay OC" }]
        });
      }
      if (!data.moneda) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["moneda"], message: "Moneda es requerida cuando no hay OC" }]
        });
      }

      // Validar que el sustento existe y obtener sus CECOs
      const support = await prisma.support.findUnique({
        where: { id: data.supportId },
        include: {
          costCenters: {
            include: { costCenter: true }
          }
        }
      });

      if (!support) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["supportId"], message: "Sustento no encontrado" }]
        });
      }

      // Validar CECOs ⊆ CECOs del sustento
      const supportCecoIds = new Set(support.costCenters.map((cc: any) => cc.costCenterId));
      const invalidCecos = data.allocations.filter(a => !supportCecoIds.has(a.costCenterId));
      if (invalidCecos.length > 0) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{
            path: ["allocations"],
            message: `Algunos CECOs seleccionados no están asociados al sustento: ${invalidCecos.map(a => a.costCenterId).join(", ")}`
          }]
        });
      }
      
      // NUEVO: Para facturas sin OC, usar el responsableUserId proporcionado
      if (data.responsableUserId) {
        responsableUserId = data.responsableUserId;
      }
    }

    // 2. Validar tipo de cambio y calcular effectiveRate
    const rateResult = await calcularEffectiveRate(currency, data.periodIds, data.exchangeRateOverride);
    if (rateResult.source === "error") {
      const firstPeriod = await prisma.period.findUnique({
        where: { id: data.periodIds[0] },
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

    // 3. Validar distribución (suma = monto total)
    const totalAllocated = data.allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
    const tolerance = 0.01;  // Tolerancia de 1 centavo por redondeo
    if (Math.abs(totalAllocated - data.montoSinIgv) > tolerance) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{
          path: ["allocations"],
          message: `La suma de las distribuciones (${totalAllocated.toFixed(2)}) no coincide con el monto total (${data.montoSinIgv.toFixed(2)})`
        }]
      });
    }

    // 3.5. Calcular campos contables
    // Convertir null a undefined para la función (acepta string | undefined)
    const camposContables = await calcularCamposContables(
      currency,
      data.montoSinIgv,
      data.periodIds,
      data.mesContable ?? undefined,
      data.tcReal ?? undefined
    );

    // 4. Crear factura + periodos + distribución en una transacción
    const userId = (req as any).user?.id;
    const created = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          ocId: data.ocId ?? null,
          supportId: data.supportId ?? null,  // Sustento para facturas sin OC
          docType: data.docType as any,
          numberNorm: data.numberNorm,
          currency,
          montoSinIgv: new Prisma.Decimal(data.montoSinIgv),
          exchangeRateOverride: data.exchangeRateOverride ? new Prisma.Decimal(data.exchangeRateOverride) : null,
          ultimusIncident: data.ultimusIncident ?? null,
          detalle: data.detalle ?? null,
          statusCurrent: "INGRESADO",
          // Auditoría: usar responsableUserId si se proporcionó (facturas sin OC o con OC que tiene solicitante)
          // Si no hay responsableUserId, usar el usuario autenticado actual
          createdBy: responsableUserId ?? userId ?? null,
          // Campos contables
          mesContable: camposContables.mesContable,
          tcEstandar: camposContables.tcEstandar !== null ? new Prisma.Decimal(camposContables.tcEstandar) : null,
          tcReal: camposContables.tcReal !== null ? new Prisma.Decimal(camposContables.tcReal) : null,
          montoPEN_tcEstandar: camposContables.montoPEN_tcEstandar !== null ? new Prisma.Decimal(camposContables.montoPEN_tcEstandar) : null,
          montoPEN_tcReal: camposContables.montoPEN_tcReal !== null ? new Prisma.Decimal(camposContables.montoPEN_tcReal) : null,
          diferenciaTC: camposContables.diferenciaTC !== null ? new Prisma.Decimal(camposContables.diferenciaTC) : null,
          // Proveedor: para facturas SIN OC, usar proveedorId (nueva entidad)
          proveedorId: data.proveedorId ?? null,
          // Vendor: solo para facturas CON OC (se deriva de la OC, legacy)
          vendorId: oc?.vendorId ?? null,
          totalForeign: null,
          totalLocal: null
        }
      });

      // Crear relaciones con periodos
      await tx.invoicePeriod.createMany({
        data: data.periodIds.map(periodId => ({
          invoiceId: invoice.id,
          periodId
        }))
      });

      // Crear relaciones con CECOs (distribución)
      await tx.invoiceCostCenter.createMany({
        data: data.allocations.map(alloc => ({
          invoiceId: invoice.id,
          costCenterId: alloc.costCenterId,
          amount: alloc.amount ? new Prisma.Decimal(alloc.amount) : null,
          percentage: alloc.percentage ? new Prisma.Decimal(alloc.percentage) : null
        }))
      });

      // Crear primer estado en historial
      await tx.invoiceStatusHistory.create({
        data: {
          invoiceId: invoice.id,
          status: "INGRESADO"
        }
      });

      return invoice;
    });

    // 5. Retornar con includes
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
      console.log("✅ Factura creada exitosamente:", created.id);
    }

    return result;
  });

  // Update (editar factura)
  // Permiso: facturas:gestion (o facturas global)
  app.patch("/invoices/:id", { preHandler: [requireAuth, requirePermission("facturas:gestion")] }, async (req, reply) => {
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
      include: {
        oc: {
          include: {
            budgetPeriodFrom: true,
            budgetPeriodTo: true,
            costCenters: {
              include: { costCenter: true }
            }
          }
        }
      }
    });

    if (!existing) {
      return reply.code(404).send({ error: "Factura no encontrada" });
    }

    // Si cambia la OC, validar la nueva
    let targetOC = existing.oc;
    if (data.ocId && data.ocId !== existing.ocId) {
      const newOC = await prisma.oC.findUnique({
        where: { id: data.ocId },
        include: {
          budgetPeriodFrom: true,
          budgetPeriodTo: true,
          costCenters: {
            include: { costCenter: true }
          }
        }
      });
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

      // Validar periodos ⊆ periodo OC (si se proporcionan nuevos periodos)
      if (data.periodIds && targetOC.budgetPeriodFromId && targetOC.budgetPeriodToId) {
        const fromValue = targetOC.budgetPeriodFrom.year * 100 + targetOC.budgetPeriodFrom.month;
        const toValue = targetOC.budgetPeriodTo.year * 100 + targetOC.budgetPeriodTo.month;

        const periods = await prisma.period.findMany({
          where: { id: { in: data.periodIds } }
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

      // Validar CECOs ⊆ CECOs de OC (si se proporcionan nuevas allocations)
      if (data.allocations) {
        const ocCecoIds = new Set(targetOC.costCenters.map((cc: any) => cc.costCenterId));
        const invalidCecos = data.allocations.filter(a => !ocCecoIds.has(a.costCenterId));
        if (invalidCecos.length > 0) {
          return reply.code(422).send({
            error: "VALIDATION_ERROR",
            issues: [{
              path: ["allocations"],
              message: `Algunos CECOs seleccionados no están asociados a la OC`
            }]
          });
        }
      }
    }

    // Validar tipo de cambio si se proporciona nuevo
    const finalCurrency = data.moneda ?? existing.currency;
    let finalPeriodIds = data.periodIds || [];
    if (finalPeriodIds.length === 0) {
      // Si no se proporcionan nuevos periodos, usar los existentes
      const existingPeriods = await prisma.invoicePeriod.findMany({
        where: { invoiceId: id },
        select: { periodId: true }
      });
      finalPeriodIds = existingPeriods.map(p => p.periodId);
    }

    if (data.exchangeRateOverride !== undefined || data.moneda || data.periodIds) {
      const rateResult = await calcularEffectiveRate(
        finalCurrency,
        finalPeriodIds,
        data.exchangeRateOverride ?? (existing.exchangeRateOverride ? Number(existing.exchangeRateOverride) : undefined)
      );
      if (rateResult.source === "error") {
        const firstPeriod = await prisma.period.findUnique({
          where: { id: finalPeriodIds[0] },
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
    }

    // Validar distribución si se proporciona (suma = monto total)
    if (data.allocations) {
      const totalAllocated = data.allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
      const tolerance = 0.01;
      if (Math.abs(totalAllocated - finalMonto) > tolerance) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{
            path: ["allocations"],
            message: `La suma de las distribuciones (${totalAllocated.toFixed(2)}) no coincide con el monto total (${finalMonto.toFixed(2)})`
          }]
        });
      }
    }

    // Recalcular campos contables si es necesario
    let camposContables = null;
    if (data.montoSinIgv !== undefined || data.periodIds || data.moneda || data.tcReal !== undefined || data.mesContable !== undefined) {
      // IMPORTANTE: Si mesContable o tcReal vienen en el request (incluso como null para borrar),
      // deben tener prioridad sobre los valores existentes. El operador ?? no funciona para este caso
      // porque null ?? existing daría existing (no es lo que queremos).
      const finalMesContable = 'mesContable' in data ? data.mesContable : existing.mesContable;
      const finalTcReal = 'tcReal' in data ? data.tcReal : (existing.tcReal ? Number(existing.tcReal) : undefined);
      
      camposContables = await calcularCamposContables(
        finalCurrency,
        finalMonto,
        finalPeriodIds,
        finalMesContable ?? undefined,  // Convertir null a undefined para la función
        finalTcReal ?? undefined
      );
    }

    // Actualizar factura + periodos + distribución en una transacción
    const updated = await prisma.$transaction(async (tx) => {
      // Actualizar campos de Invoice
      const updateData: any = {
        ...(data.ocId !== undefined && { ocId: data.ocId, currency: targetOC?.moneda }),
        ...(data.supportId !== undefined && { supportId: data.supportId }),
        ...(data.proveedorId !== undefined && { proveedorId: data.proveedorId }),
        ...(data.docType && { docType: data.docType as any }),
        ...(data.numberNorm && { numberNorm: data.numberNorm }),
        ...(data.montoSinIgv !== undefined && { montoSinIgv: new Prisma.Decimal(data.montoSinIgv) }),
        ...(data.exchangeRateOverride !== undefined && {
          exchangeRateOverride: data.exchangeRateOverride ? new Prisma.Decimal(data.exchangeRateOverride) : null
        }),
        ...(data.ultimusIncident !== undefined && { ultimusIncident: data.ultimusIncident }),
        ...(data.detalle !== undefined && { detalle: data.detalle }),
        ...(data.moneda !== undefined && !data.ocId && { currency: data.moneda }),
        // NUEVO: Actualizar responsable si se proporciona
        ...(data.responsableUserId !== undefined && { createdBy: data.responsableUserId }),
        // Campos contables (si se recalcularon)
        ...(camposContables && {
          mesContable: camposContables.mesContable,
          tcEstandar: camposContables.tcEstandar !== null ? new Prisma.Decimal(camposContables.tcEstandar) : null,
          tcReal: camposContables.tcReal !== null ? new Prisma.Decimal(camposContables.tcReal) : null,
          montoPEN_tcEstandar: camposContables.montoPEN_tcEstandar !== null ? new Prisma.Decimal(camposContables.montoPEN_tcEstandar) : null,
          montoPEN_tcReal: camposContables.montoPEN_tcReal !== null ? new Prisma.Decimal(camposContables.montoPEN_tcReal) : null,
          diferenciaTC: camposContables.diferenciaTC !== null ? new Prisma.Decimal(camposContables.diferenciaTC) : null
        })
      };
      
      const invoice = await tx.invoice.update({
        where: { id },
        data: updateData
      });

      // Actualizar periodos si se proporcionan
      if (data.periodIds) {
        await tx.invoicePeriod.deleteMany({ where: { invoiceId: id } });
        await tx.invoicePeriod.createMany({
          data: data.periodIds.map(periodId => ({
            invoiceId: id,
            periodId
          }))
        });
      }

      // Actualizar distribución si se proporciona
      if (data.allocations) {
        await tx.invoiceCostCenter.deleteMany({ where: { invoiceId: id } });
        await tx.invoiceCostCenter.createMany({
          data: data.allocations.map(alloc => ({
            invoiceId: id,
            costCenterId: alloc.costCenterId,
            amount: alloc.amount ? new Prisma.Decimal(alloc.amount) : null,
            percentage: alloc.percentage ? new Prisma.Decimal(alloc.percentage) : null
          }))
        });
      }

      return invoice;
    });

    // Retornar con includes
    const result = await prisma.invoice.findUnique({
      where: { id },
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

    return result;
  });

  // Delete
  // Permiso: facturas:gestion (o facturas global)
  app.delete("/invoices/:id", { preHandler: [requireAuth, requirePermission("facturas:gestion")] }, async (req, reply) => {
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
  // Permiso: facturas:gestion (o facturas global)
  app.patch("/invoices/:id/status", { preHandler: [requireAuth, requirePermission("facturas:gestion")] }, async (req, reply) => {
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

    // Broadcast cambio de estado via WebSocket
    broadcastInvoiceStatusChange({
      invoiceId: id,
      newStatus: parsed.data.status,
      timestamp: new Date().toISOString()
    });

    return updated;
  });

  // History only
  // Permiso: facturas:listado (o facturas global)
  app.get("/invoices/:id/history", { preHandler: [requireAuth, requirePermission("facturas:listado")] }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const rows = await prisma.invoiceStatusHistory.findMany({
      where: { invoiceId: id },
      orderBy: { changedAt: "asc" }
    });
    return rows;
  });

  // Obtener TC estándar sugerido para una factura
  // Permiso: facturas:listado (o facturas global) - útil para ambas vistas
  app.get("/invoices/tc-estandar/:year", { preHandler: [requireAuth, requirePermission("facturas:listado")] }, async (req, reply) => {
    const year = Number((req.params as any).year);
    
    if (!year || year < 2020 || year > 2050) {
      return reply.code(400).send({ error: "Año inválido" });
    }

    const exchangeRate = await prisma.exchangeRate.findUnique({
      where: { year }
    });

    if (!exchangeRate) {
      return reply.code(404).send({ 
        error: `No se encontró tipo de cambio para el año ${year}. Configure el TC en Catálogos.` 
      });
    }

    return { year, tcEstandar: Number(exchangeRate.rate) };
  });

  // Consumo de una OC (útil para el frontend)
  // Permiso: facturas:listado (o facturas global) - útil para ambas vistas
  app.get("/invoices/oc/:ocId/consumo", { preHandler: [requireAuth, requirePermission("facturas:listado")] }, async (req, reply) => {
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
  // Permiso: facturas:listado (o facturas global)
  app.get("/invoices/export/csv", { preHandler: [requireAuth, requirePermission("facturas:listado")] }, async (req, reply) => {
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
