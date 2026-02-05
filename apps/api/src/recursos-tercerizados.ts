import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient, Prisma, RecursoStatus } from "@prisma/client";
import { requireAuth, requirePermission } from "./auth";
import { z } from "zod";

const prisma = new PrismaClient();

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📋 API: RECURSOS TERCERIZADOS (CONTRATOS)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FUNCIONALIDAD:
 * - CRUD completo de personas tercerizadas
 * - Gestión de contratos vigentes e históricos
 * - Cálculo automático de estado (ACTIVO/CESADO) basado en fechas
 * - Filtros por Gerencia TI, Proveedor, Estado
 * - Agrupación para vistas (por Gerencia o por Proveedor)
 * - Relación con OCs y Facturas existentes
 * 
 * PATRONES SEGUIDOS:
 * - Validación con Zod (similar a oc.ts)
 * - Queries con include para relaciones (similar a oc.ts)
 * - Permisos basados en roles (similar a masters.ts)
 * - Cálculo de estado derivado (similar a lógica de Dashboard)
 */

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS DE VALIDACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const createRecursoSchema = z.object({
  nombreCompleto: z.string().min(1, "Nombre completo es requerido").trim(),
  cargo: z.string().min(1, "Cargo es requerido").trim(),
  managementId: z.number().int().positive("Gerencia TI es requerida"),
  responsableId: z.number().int().positive("Persona Responsable es requerida"),
  proveedorId: z.number().int().positive("Proveedor es requerido"),
  supportId: z.number().int().positive().nullable().optional(),
  fechaInicio: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Fecha de inicio inválida"),
  fechaFin: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Fecha de fin inválida"),
  montoMensual: z.number().nonnegative("Monto mensual debe ser mayor o igual a 0"),
  linkContrato: z.string().trim().optional().nullable(),  // Completamente opcional, sin validación de URL estricta
  observaciones: z.string().trim().optional()
});

const updateRecursoSchema = createRecursoSchema.partial();

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcula el estado de un recurso basado en sus fechas
 * LÓGICA DE NEGOCIO:
 * - CESADO: Si fechaFin ya pasó
 * - ACTIVO: En cualquier otro caso
 */
function calcularEstado(fechaInicio: Date, fechaFin: Date): RecursoStatus {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación justa
  
  // Si la fecha de fin ya pasó, está cesado
  if (fechaFin < hoy) {
    return "CESADO";
  }
  
  // En cualquier otro caso, está activo
  return "ACTIVO";
}

/**
 * Valida coherencia de fechas
 */
function validarFechas(fechaInicio: Date, fechaFin: Date): string | null {
  if (fechaFin <= fechaInicio) {
    return "La fecha de fin debe ser posterior a la fecha de inicio";
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// RUTAS
// ═══════════════════════════════════════════════════════════════════════════

export async function registerRecursosTercerizadosRoutes(app: FastifyInstance) {
  
  // ─────────────────────────────────────────────────────────────────────────
  // GET /recursos-tercerizados - Listar recursos con filtros
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/recursos-tercerizados", { preHandler: [requireAuth, requirePermission("contratos")] }, async (req, reply) => {
    try {
      const {
        managementId,
        responsableId,
        proveedorId,
        status,
        search
      } = req.query as any;

      const where: any = {};

      if (managementId) where.managementId = Number(managementId);
      if (responsableId) where.responsableId = Number(responsableId);
      if (proveedorId) where.proveedorId = Number(proveedorId);
      if (status) where.status = status;

      // Búsqueda de texto libre
      if (search) {
        where.OR = [
          { nombreCompleto: { contains: search, mode: "insensitive" } },
          { cargo: { contains: search, mode: "insensitive" } },
          { proveedor: { razonSocial: { contains: search, mode: "insensitive" } } },
          { management: { name: { contains: search, mode: "insensitive" } } },
          { responsable: { name: { contains: search, mode: "insensitive" } } },
          { responsable: { email: { contains: search, mode: "insensitive" } } }
        ];
      }

      const recursos = await prisma.recursoTercerizado.findMany({
        where,
        orderBy: [
          { status: "asc" },  // ACTIVO primero
          { fechaFin: "desc" }  // Cesados: más recientes primero
        ],
        include: {
          management: { select: { id: true, name: true } },
          responsable: { select: { id: true, name: true, email: true } },
          proveedor: { select: { id: true, razonSocial: true, ruc: true } },
          support: { select: { id: true, code: true, name: true } },
          ocs: {
            include: {
              oc: {
                select: {
                  id: true,
                  numeroOc: true,
                  moneda: true,
                  importeSinIgv: true,
                  fechaRegistro: true,
                  estado: true
                }
              }
            },
            orderBy: { createdAt: "desc" },
            take: 1  // Solo la más reciente para el listado
          },
          historico: {
            orderBy: { fechaInicio: "desc" },
            take: 5
          }
        }
      });

      // Recalcular estado en tiempo real para cada recurso
      const recursosConEstado = recursos.map(recurso => {
        const estadoCalculado = calcularEstado(recurso.fechaInicio, recurso.fechaFin);
        return {
          ...recurso,
          status: estadoCalculado
        };
      });

      return recursosConEstado;
    } catch (err: any) {
      console.error('[GET /recursos-tercerizados] Error:', err);
      return reply.code(500).send({ 
        error: "Error al obtener recursos tercerizados",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /recursos-tercerizados/:id - Obtener recurso por ID con detalles completos
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/recursos-tercerizados/:id", { preHandler: [requireAuth, requirePermission("contratos")] }, async (req, reply) => {
    try {
      const id = Number((req.params as any).id);
      
      const recurso = await prisma.recursoTercerizado.findUnique({
        where: { id },
        include: {
          management: { select: { id: true, name: true } },
          responsable: { select: { id: true, name: true, email: true } },
          proveedor: { select: { id: true, razonSocial: true, ruc: true } },
          support: { select: { id: true, code: true, name: true } },
          ocs: {
            include: {
              oc: {
                select: {
                  id: true,
                  numeroOc: true,
                  moneda: true,
                  importeSinIgv: true,
                  fechaRegistro: true,
                  estado: true,
                  support: { select: { id: true, name: true } }
                }
              }
            },
            orderBy: { createdAt: "desc" }
          },
          historico: {
            orderBy: { fechaInicio: "desc" }
          }
        }
      });

      if (!recurso) {
        return reply.code(404).send({ error: "Recurso tercerizado no encontrado" });
      }

      // Recalcular estado en tiempo real
      const estadoCalculado = calcularEstado(recurso.fechaInicio, recurso.fechaFin);
      
      // IDs de OCs directamente asociadas al recurso (relación M:N)
      const ocIdsAsociadas = recurso.ocs.map(ocRel => ocRel.ocId);

      // Obtener OCs asociadas al proveedor y management del recurso
      const ocsRelacionadas = await prisma.oC.findMany({
        where: {
          proveedorId: recurso.proveedorId,
          support: {
            managementId: recurso.managementId
          }
        },
        orderBy: { fechaRegistro: "desc" },
        take: 10,
        include: {
          support: { select: { id: true, code: true, name: true } },
          budgetPeriodFrom: { select: { year: true, month: true } },
          budgetPeriodTo: { select: { year: true, month: true } }
        }
      });

      // Obtener facturas relacionadas priorizando las OCs asociadas explícitamente
      const facturasRelacionadas = await prisma.invoice.findMany({
        where: {
          OR: [
            { ocId: { in: [...ocIdsAsociadas, ...ocsRelacionadas.map(oc => oc.id)] } },
            { 
              AND: [
                { proveedorId: recurso.proveedorId },
                { supportId: recurso.supportId || undefined }
              ]
            }
          ]
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          oc: { 
            select: { 
              id: true, 
              numeroOc: true,
              support: { select: { id: true, name: true } }
            } 
          },
          support: { select: { id: true, name: true } },
          periods: {
            include: {
              period: { select: { id: true, year: true, month: true, label: true } }
            },
            orderBy: { period: { year: 'asc' } }
          }
        }
      });

      return {
        ...recurso,
        status: estadoCalculado,
        ocsRelacionadas,
        facturasRelacionadas
      };
    } catch (err: any) {
      console.error('[GET /recursos-tercerizados/:id] Error:', err);
      return reply.code(500).send({ 
        error: "Error al obtener recurso tercerizado",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /recursos-tercerizados - Crear nuevo recurso
  // ─────────────────────────────────────────────────────────────────────────
  app.post("/recursos-tercerizados", { preHandler: [requireAuth, requirePermission("contratos")] }, async (req, reply) => {
    const parsed = createRecursoSchema.safeParse(req.body);
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

    // Convertir fechas a Date
    const fechaInicio = new Date(data.fechaInicio);
    const fechaFin = new Date(data.fechaFin);

    // Validar coherencia de fechas
    const errorFechas = validarFechas(fechaInicio, fechaFin);
    if (errorFechas) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{ path: ["fechaFin"], message: errorFechas }]
      });
    }

    // Validar que la gerencia exista
    const management = await prisma.management.findUnique({ where: { id: data.managementId } });
    if (!management) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{ path: ["managementId"], message: "Gerencia TI no encontrada" }]
      });
    }

    // Validar que el responsable exista
    const responsable = await prisma.user.findUnique({ where: { id: data.responsableId } });
    if (!responsable) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{ path: ["responsableId"], message: "Persona Responsable no encontrada" }]
      });
    }

    // Validar que el proveedor exista
    const proveedor = await prisma.proveedor.findUnique({ where: { id: data.proveedorId } });
    if (!proveedor) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{ path: ["proveedorId"], message: "Proveedor no encontrado" }]
      });
    }

    // Calcular estado inicial
    const status = calcularEstado(fechaInicio, fechaFin);

    try {
      const recurso = await prisma.recursoTercerizado.create({
        data: {
          nombreCompleto: data.nombreCompleto,
          cargo: data.cargo,
          managementId: data.managementId,
          responsableId: data.responsableId,
          proveedorId: data.proveedorId,
          supportId: data.supportId || null,
          fechaInicio,
          fechaFin,
          montoMensual: data.montoMensual,
          linkContrato: data.linkContrato?.trim() || null,
          observaciones: data.observaciones?.trim() || null,
          status,
          createdBy: (req as any).user?.id || null
        },
        include: {
          management: true,
          responsable: true,
          proveedor: true,
          support: true,
          ocs: {
            include: {
              oc: {
                select: {
                  id: true,
                  numeroOc: true,
                  moneda: true,
                  importeSinIgv: true,
                  fechaRegistro: true,
                  estado: true
                }
              }
            }
          }
        }
      });

      return recurso;
    } catch (err: any) {
      console.error('[POST /recursos-tercerizados] Error:', err);
      return reply.code(500).send({ 
        error: "Error al crear recurso tercerizado",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /recursos-tercerizados/:id - Actualizar recurso
  // ─────────────────────────────────────────────────────────────────────────
  app.patch("/recursos-tercerizados/:id", { preHandler: [requireAuth, requirePermission("contratos")] }, async (req, reply) => {
    const id = Number((req.params as any).id);
    
    const parsed = updateRecursoSchema.safeParse(req.body);
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

    // Verificar que el recurso exista
    const recursoExistente = await prisma.recursoTercerizado.findUnique({ where: { id } });
    if (!recursoExistente) {
      return reply.code(404).send({ error: "Recurso tercerizado no encontrado" });
    }

    // Preparar datos de actualización
    const updateData: any = {};
    
    if (data.nombreCompleto !== undefined) updateData.nombreCompleto = data.nombreCompleto;
    if (data.cargo !== undefined) updateData.cargo = data.cargo;
    if (data.managementId !== undefined) updateData.managementId = data.managementId;
    if (data.responsableId !== undefined) updateData.responsableId = data.responsableId;
    if (data.proveedorId !== undefined) updateData.proveedorId = data.proveedorId;
    if (data.supportId !== undefined) updateData.supportId = data.supportId || null;
    if (data.montoMensual !== undefined) updateData.montoMensual = data.montoMensual;
    if (data.linkContrato !== undefined) updateData.linkContrato = data.linkContrato?.trim() || null;
    if (data.observaciones !== undefined) updateData.observaciones = data.observaciones?.trim() || null;

    // Manejar fechas si se actualizan
    let fechaInicio = recursoExistente.fechaInicio;
    let fechaFin = recursoExistente.fechaFin;

    if (data.fechaInicio) {
      fechaInicio = new Date(data.fechaInicio);
      updateData.fechaInicio = fechaInicio;
    }
    if (data.fechaFin) {
      fechaFin = new Date(data.fechaFin);
      updateData.fechaFin = fechaFin;
    }

    // Validar coherencia de fechas
    const errorFechas = validarFechas(fechaInicio, fechaFin);
    if (errorFechas) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{ path: ["fechaFin"], message: errorFechas }]
      });
    }

    // Recalcular estado
    const status = calcularEstado(fechaInicio, fechaFin);
    updateData.status = status;

    try {
      const recurso = await prisma.recursoTercerizado.update({
        where: { id },
        data: updateData,
        include: {
          management: true,
          responsable: true,
          proveedor: true,
          support: true,
          ocs: {
            include: {
              oc: {
                select: {
                  id: true,
                  numeroOc: true,
                  moneda: true,
                  importeSinIgv: true,
                  fechaRegistro: true,
                  estado: true
                }
              }
            }
          }
        }
      });

      return recurso;
    } catch (err: any) {
      console.error('[PATCH /recursos-tercerizados/:id] Error:', err);
      return reply.code(500).send({ 
        error: "Error al actualizar recurso tercerizado",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /recursos-tercerizados/:id - Eliminar recurso
  // ─────────────────────────────────────────────────────────────────────────
  app.delete("/recursos-tercerizados/:id", { preHandler: [requireAuth, requirePermission("contratos")] }, async (req, reply) => {
    const id = Number((req.params as any).id);
    
    try {
      await prisma.recursoTercerizado.delete({ where: { id } });
      return { ok: true };
    } catch (err: any) {
      console.error('[DELETE /recursos-tercerizados/:id] Error:', err);
      return reply.code(400).send({ error: "No se pudo eliminar el recurso tercerizado" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /recursos-tercerizados/:id/historico - Agregar entrada al histórico
  // ─────────────────────────────────────────────────────────────────────────
  app.post("/recursos-tercerizados/:id/historico", { preHandler: [requireAuth, requirePermission("contratos")] }, async (req, reply) => {
    const id = Number((req.params as any).id);
    
    const schema = z.object({
      fechaInicio: z.string(),
      fechaFin: z.string(),
      montoMensual: z.number().nonnegative(),
      linkContrato: z.string().optional()
    });

    const parsed = schema.safeParse(req.body);
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

    try {
      const historico = await prisma.historicoContrato.create({
        data: {
          recursoTercId: id,
          fechaInicio: new Date(data.fechaInicio),
          fechaFin: new Date(data.fechaFin),
          montoMensual: data.montoMensual,
          linkContrato: data.linkContrato || null
        }
      });

      return historico;
    } catch (err: any) {
      console.error('[POST /recursos-tercerizados/:id/historico] Error:', err);
      return reply.code(500).send({ error: "Error al agregar histórico" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /recursos-tercerizados/:id/nuevo-contrato - Mover contrato actual a histórico y crear nuevo
  // ─────────────────────────────────────────────────────────────────────────
  app.post("/recursos-tercerizados/:id/nuevo-contrato", { preHandler: [requireAuth, requirePermission("contratos")] }, async (req, reply) => {
    const id = Number((req.params as any).id);
    
    const schema = z.object({
      fechaInicio: z.string(),
      fechaFin: z.string(),
      montoMensual: z.number().nonnegative(),
      linkContrato: z.string().optional()
    });

    const parsed = schema.safeParse(req.body);
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
    const fechaInicio = new Date(data.fechaInicio);
    const fechaFin = new Date(data.fechaFin);

    // Validar coherencia de fechas
    const errorFechas = validarFechas(fechaInicio, fechaFin);
    if (errorFechas) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{ path: ["fechaFin"], message: errorFechas }]
      });
    }

    try {
      // Obtener el recurso actual
      const recursoActual = await prisma.recursoTercerizado.findUnique({
        where: { id }
      });

      if (!recursoActual) {
        return reply.code(404).send({ error: "Recurso no encontrado" });
      }

      // 1. Mover contrato actual al histórico
      await prisma.historicoContrato.create({
        data: {
          recursoTercId: id,
          fechaInicio: recursoActual.fechaInicio,
          fechaFin: recursoActual.fechaFin,
          montoMensual: recursoActual.montoMensual,
          linkContrato: recursoActual.linkContrato
        }
      });

      // 2. Actualizar el recurso con el nuevo contrato
      const status = calcularEstado(fechaInicio, fechaFin);
      const recursoActualizado = await prisma.recursoTercerizado.update({
        where: { id },
        data: {
          fechaInicio,
          fechaFin,
          montoMensual: data.montoMensual,
          linkContrato: data.linkContrato || null,
          status
        },
        include: {
          management: true,
          responsable: true,
          proveedor: true,
          support: true,
          historico: {
            orderBy: { createdAt: 'desc' }
          },
          ocs: {
            include: {
              oc: {
                select: {
                  id: true,
                  numeroOc: true,
                  moneda: true,
                  importeSinIgv: true,
                  fechaRegistro: true,
                  estado: true,
                  support: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      return recursoActualizado;
    } catch (err: any) {
      console.error('[POST /recursos-tercerizados/:id/nuevo-contrato] Error:', err);
      return reply.code(500).send({ error: "Error al crear nuevo contrato" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /recursos-tercerizados/:id/ocs/:ocId - Asociar OC al recurso
  // ─────────────────────────────────────────────────────────────────────────
  app.post("/recursos-tercerizados/:id/ocs/:ocId", { preHandler: [requireAuth, requirePermission("contratos")] }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const ocId = Number((req.params as any).ocId);

    try {
      // Verificar que el recurso existe
      const recurso = await prisma.recursoTercerizado.findUnique({ where: { id } });
      if (!recurso) {
        return reply.code(404).send({ error: "Recurso no encontrado" });
      }

      // Verificar que la OC existe
      const oc = await prisma.oC.findUnique({ where: { id: ocId } });
      if (!oc) {
        return reply.code(404).send({ error: "OC no encontrada" });
      }

      // Crear la relación
      await prisma.recursoTercOC.create({
        data: {
          recursoTercId: id,
          ocId
        }
      });

      return { ok: true };
    } catch (err: any) {
      console.error('[POST /recursos-tercerizados/:id/ocs/:ocId] Error:', err);
      if (err.code === 'P2002') {
        return reply.code(400).send({ error: "Esta OC ya está asociada al recurso" });
      }
      return reply.code(500).send({ error: "Error al asociar OC" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /recursos-tercerizados/:id/ocs/:ocId - Desasociar OC del recurso
  // ─────────────────────────────────────────────────────────────────────────
  app.delete("/recursos-tercerizados/:id/ocs/:ocId", { preHandler: [requireAuth, requirePermission("contratos")] }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const ocId = Number((req.params as any).ocId);

    try {
      await prisma.recursoTercOC.deleteMany({
        where: {
          recursoTercId: id,
          ocId
        }
      });

      return { ok: true };
    } catch (err: any) {
      console.error('[DELETE /recursos-tercerizados/:id/ocs/:ocId] Error:', err);
      return reply.code(500).send({ error: "Error al desasociar OC" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /recursos-tercerizados/estadisticas - Estadísticas para dashboard
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/recursos-tercerizados/estadisticas", { preHandler: [requireAuth, requirePermission("contratos")] }, async (req, reply) => {
    try {
      const totalActivos = await prisma.recursoTercerizado.count({ where: { status: "ACTIVO" } });
      const totalCesados = await prisma.recursoTercerizado.count({ where: { status: "CESADO" } });
      
      // Costo mensual total de recursos activos
      const costosActivos = await prisma.recursoTercerizado.findMany({
        where: { status: "ACTIVO" },
        select: { montoMensual: true }
      });
      const costoMensualTotal = costosActivos.reduce((sum, r) => sum + Number(r.montoMensual), 0);

      // Agrupar por gerencia
      const porGerencia = await prisma.recursoTercerizado.groupBy({
        by: ['managementId'],
        where: { status: "ACTIVO" },
        _count: true
      });

      const gerenciasConNombres = await Promise.all(
        porGerencia.map(async (g) => {
          const management = await prisma.management.findUnique({ where: { id: g.managementId } });
          return {
            managementId: g.managementId,
            managementName: management?.name || "Sin gerencia",
            cantidad: g._count
          };
        })
      );

      return {
        totalActivos,
        totalCesados,
        costoMensualTotal,
        porGerencia: gerenciasConNombres
      };
    } catch (err: any) {
      console.error('[GET /recursos-tercerizados/estadisticas] Error:', err);
      return reply.code(500).send({ error: "Error al obtener estadísticas" });
    }
  });
}
