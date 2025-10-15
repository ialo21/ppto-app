import { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Schemas de validación
const createOcSchema = z.object({
  budgetPeriodFromId: z.number().int().positive(),
  budgetPeriodToId: z.number().int().positive(),
  incidenteOc: z.string().trim().optional(),
  solicitudOc: z.string().trim().optional(),
  fechaRegistro: z.string()
    .refine((val) => {
      // Aceptar formato ISO completo (YYYY-MM-DDTHH:mm:ss.sssZ) o ISO fecha (YYYY-MM-DD)
      const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      
      if (!isoDateTimeRegex.test(val) && !isoDateRegex.test(val)) {
        return false;
      }
      
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "Fecha inválida. Usa formato ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ssZ)")
    .optional(),
  supportId: z.number().int().positive(),
  periodoEnFechasText: z.string().trim().optional(),
  descripcion: z.string().trim().optional(),
  nombreSolicitante: z.string().min(1),
  correoSolicitante: z.string().email(),
  proveedor: z.string().min(1),
  ruc: z.string().regex(/^\d{11}$/, "RUC debe tener 11 dígitos"),
  moneda: z.enum(["PEN", "USD"]),
  importeSinIgv: z.number().nonnegative(),
  estado: z.enum([
    "PENDIENTE", "PROCESAR", "PROCESADO", "APROBACION_VP",
    "ANULAR", "ANULADO", "ATENDER_COMPRAS", "ATENDIDO"
  ]).optional(),
  numeroOc: z.string().trim().optional(),
  comentario: z.string().trim().optional(),
  articuloId: z.number().int().positive().nullable().optional(),
  cecoId: z.number().int().positive().nullable().optional(),
  linkCotizacion: z.string().url().optional().or(z.literal(""))
});

const updateOcSchema = createOcSchema.partial();

export async function registerOcRoutes(app: FastifyInstance) {
  // List OCs con filtros
  app.get("/ocs", async (req, reply) => {
    const {
      proveedor,
      numeroOc,
      moneda,
      estado,
      supportId,
      periodFromId,
      periodToId,
      fechaDesde,
      fechaHasta,
      search
    } = req.query as any;

    const where: any = {};

    if (proveedor) where.proveedor = { contains: proveedor, mode: "insensitive" };
    if (numeroOc) where.numeroOc = { contains: numeroOc, mode: "insensitive" };
    if (moneda) where.moneda = moneda;
    if (estado) where.estado = estado;
    if (supportId) where.supportId = Number(supportId);
    if (periodFromId) where.budgetPeriodFromId = Number(periodFromId);
    if (periodToId) where.budgetPeriodToId = Number(periodToId);

    if (fechaDesde || fechaHasta) {
      where.fechaRegistro = {};
      if (fechaDesde) where.fechaRegistro.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaRegistro.lte = new Date(fechaHasta);
    }

    // Búsqueda de texto libre
    if (search) {
      where.OR = [
        { proveedor: { contains: search, mode: "insensitive" } },
        { numeroOc: { contains: search, mode: "insensitive" } },
        { ruc: { contains: search, mode: "insensitive" } },
        { descripcion: { contains: search, mode: "insensitive" } }
      ];
    }

    const items = await prisma.oC.findMany({
      where,
      orderBy: [{ fechaRegistro: "desc" }, { id: "desc" }],
      include: {
        support: { select: { id: true, code: true, name: true } },
        budgetPeriodFrom: { select: { id: true, year: true, month: true, label: true } },
        budgetPeriodTo: { select: { id: true, year: true, month: true, label: true } },
        articulo: { select: { id: true, code: true, name: true } },
        ceco: { select: { id: true, code: true, name: true } }
      }
    });

    return items;
  });

  // Get OC by ID
  app.get("/ocs/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const oc = await prisma.oC.findUnique({
      where: { id },
      include: {
        support: true,
        budgetPeriodFrom: true,
        budgetPeriodTo: true,
        articulo: true,
        ceco: true
      }
    });

    if (!oc) return reply.code(404).send({ error: "OC no encontrada" });
    return oc;
  });

  // Create OC
  app.post("/ocs", async (req, reply) => {
    const parsed = createOcSchema.safeParse(req.body);
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
      const created = await prisma.oC.create({
        data: {
          budgetPeriodFromId: data.budgetPeriodFromId,
          budgetPeriodToId: data.budgetPeriodToId,
          incidenteOc: data.incidenteOc || null,
          solicitudOc: data.solicitudOc || null,
          fechaRegistro: data.fechaRegistro ? new Date(data.fechaRegistro) : new Date(),
          supportId: data.supportId,
          periodoEnFechasText: data.periodoEnFechasText || null,
          descripcion: data.descripcion || null,
          nombreSolicitante: data.nombreSolicitante,
          correoSolicitante: data.correoSolicitante,
          proveedor: data.proveedor,
          ruc: data.ruc,
          moneda: data.moneda,
          importeSinIgv: new Prisma.Decimal(data.importeSinIgv),
          estado: data.estado || "PENDIENTE",
          numeroOc: data.numeroOc || null,
          comentario: data.comentario || null,
          articuloId: data.articuloId || null,
          cecoId: data.cecoId || null,
          linkCotizacion: data.linkCotizacion || null
        },
        include: {
          support: true,
          budgetPeriodFrom: true,
          budgetPeriodTo: true,
          articulo: true,
          ceco: true
        }
      });

      return created;
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          return reply.code(409).send({ error: "Ya existe una OC con ese número" });
        }
        if (err.code === "P2003") {
          return reply.code(400).send({ error: "Referencia inválida (Support, Period, Articulo o CECO no existe)" });
        }
      }
      console.error("Error creating OC:", err);
      return reply.code(500).send({ error: "Error al crear OC" });
    }
  });

  // Update OC
  app.patch("/ocs/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = updateOcSchema.safeParse(req.body);
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

    // Verificar que existe
    const existing = await prisma.oC.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "OC no encontrada" });

    try {
      const updateData: any = {};

      if (data.budgetPeriodFromId !== undefined) updateData.budgetPeriodFromId = data.budgetPeriodFromId;
      if (data.budgetPeriodToId !== undefined) updateData.budgetPeriodToId = data.budgetPeriodToId;
      if (data.incidenteOc !== undefined) updateData.incidenteOc = data.incidenteOc || null;
      if (data.solicitudOc !== undefined) updateData.solicitudOc = data.solicitudOc || null;
      if (data.fechaRegistro !== undefined) updateData.fechaRegistro = new Date(data.fechaRegistro);
      if (data.supportId !== undefined) updateData.supportId = data.supportId;
      if (data.periodoEnFechasText !== undefined) updateData.periodoEnFechasText = data.periodoEnFechasText || null;
      if (data.descripcion !== undefined) updateData.descripcion = data.descripcion || null;
      if (data.nombreSolicitante !== undefined) updateData.nombreSolicitante = data.nombreSolicitante;
      if (data.correoSolicitante !== undefined) updateData.correoSolicitante = data.correoSolicitante;
      if (data.proveedor !== undefined) updateData.proveedor = data.proveedor;
      if (data.ruc !== undefined) updateData.ruc = data.ruc;
      if (data.moneda !== undefined) updateData.moneda = data.moneda;
      if (data.importeSinIgv !== undefined) updateData.importeSinIgv = new Prisma.Decimal(data.importeSinIgv);
      if (data.estado !== undefined) updateData.estado = data.estado;
      if (data.numeroOc !== undefined) updateData.numeroOc = data.numeroOc || null;
      if (data.comentario !== undefined) updateData.comentario = data.comentario || null;
      if (data.articuloId !== undefined) updateData.articuloId = data.articuloId;
      if (data.cecoId !== undefined) updateData.cecoId = data.cecoId;
      if (data.linkCotizacion !== undefined) updateData.linkCotizacion = data.linkCotizacion || null;

      const updated = await prisma.oC.update({
        where: { id },
        data: updateData,
        include: {
          support: true,
          budgetPeriodFrom: true,
          budgetPeriodTo: true,
          articulo: true,
          ceco: true
        }
      });

      return updated;
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          return reply.code(409).send({ error: "Ya existe una OC con ese número" });
        }
        if (err.code === "P2003") {
          return reply.code(400).send({ error: "Referencia inválida" });
        }
      }
      console.error("Error updating OC:", err);
      return reply.code(500).send({ error: "Error al actualizar OC" });
    }
  });

  // Delete OC
  app.delete("/ocs/:id", async (req, reply) => {
    const id = Number((req.params as any).id);

    try {
      await prisma.oC.delete({ where: { id } });
      return { ok: true, message: "OC eliminada" };
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return reply.code(404).send({ error: "OC no encontrada" });
      }
      console.error("Error deleting OC:", err);
      return reply.code(400).send({ error: "No se pudo eliminar la OC" });
    }
  });

  // Export CSV
  app.get("/ocs/export/csv", async (req, reply) => {
    const { moneda, estado, proveedor, search } = req.query as any;
    const where: any = {};

    if (moneda) where.moneda = moneda;
    if (estado) where.estado = estado;
    if (proveedor) where.proveedor = { contains: proveedor, mode: "insensitive" };
    if (search) {
      where.OR = [
        { proveedor: { contains: search, mode: "insensitive" } },
        { numeroOc: { contains: search, mode: "insensitive" } },
        { ruc: { contains: search, mode: "insensitive" } }
      ];
    }

    const rows = await prisma.oC.findMany({
      where,
      orderBy: [{ fechaRegistro: "desc" }],
      include: {
        support: true,
        budgetPeriodFrom: true,
        budgetPeriodTo: true,
        articulo: true,
        ceco: true
      }
    });

    const header = [
      "ID", "NumeroOC", "Estado", "Proveedor", "RUC", "Moneda", "ImporteSinIGV",
      "Support", "PeriodoDesde", "PeriodoHasta", "FechaRegistro", "Solicitante",
      "Correo", "Articulo", "CECO", "Comentario"
    ];

    const fmt = (v: any) => (v == null ? "" : String(v).replace(/"/g, '""'));
    const lines = [
      header.join(","),
      ...rows.map(r => [
        r.id,
        `"${fmt(r.numeroOc)}"`,
        r.estado,
        `"${fmt(r.proveedor)}"`,
        r.ruc,
        r.moneda,
        r.importeSinIgv?.toString() ?? "",
        `"${fmt(r.support?.name)}"`,
        `"${fmt(r.budgetPeriodFrom?.label)}"`,
        `"${fmt(r.budgetPeriodTo?.label)}"`,
        r.fechaRegistro.toISOString().split("T")[0],
        `"${fmt(r.nombreSolicitante)}"`,
        `"${fmt(r.correoSolicitante)}"`,
        `"${fmt(r.articulo?.name)}"`,
        `"${fmt(r.ceco?.name)}"`,
        `"${fmt(r.comentario)}"`
      ].join(","))
    ];

    reply.header("Content-Type", "text/csv; charset=utf-8")
         .header("Content-Disposition", "attachment; filename=ordenes-compra.csv")
         .send(lines.join("\n"));
  });
}


