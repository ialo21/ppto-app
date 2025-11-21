import { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Schemas de validación
const createProvisionSchema = z.object({
  sustentoId: z.number().int().positive({ message: "Sustento es requerido" }),
  periodoPpto: z.string().regex(/^\d{4}-\d{2}$/, { message: "Periodo PPTO debe tener formato YYYY-MM" }),
  periodoContable: z.string().regex(/^\d{4}-\d{2}$/, { message: "Periodo contable debe tener formato YYYY-MM" }),
  montoPen: z.number().refine(val => val !== 0, { message: "El monto no puede ser 0" }),
  detalle: z.string().trim().optional()
});

const updateProvisionSchema = createProvisionSchema.partial();

export async function registerProvisionRoutes(app: FastifyInstance) {
  // List Provisions con filtros opcionales
  app.get("/provisions", async (req, reply) => {
    try {
      const { sustentoId, periodoPpto, periodoContable } = req.query as any;
      
      const where: any = {};
      
      if (sustentoId) where.sustentoId = Number(sustentoId);
      if (periodoPpto) where.periodoPpto = periodoPpto;
      if (periodoContable) where.periodoContable = periodoContable;

      const items = await prisma.provision.findMany({
        where,
        orderBy: [{ periodoContable: "desc" }, { createdAt: "desc" }],
        include: {
          sustento: {
            select: {
              id: true,
              code: true,
              name: true,
              expensePackage: { select: { id: true, name: true } },
              expenseConcept: { select: { id: true, name: true } }
            }
          }
        }
      });

      return items;
    } catch (err: any) {
      console.error('[GET /provisions] Error:', err);
      return reply.code(500).send({
        error: "Error al obtener provisiones",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // Get Provision by ID
  app.get("/provisions/:id", async (req, reply) => {
    try {
      const id = Number((req.params as any).id);
      
      const provision = await prisma.provision.findUnique({
        where: { id },
        include: {
          sustento: {
            select: {
              id: true,
              code: true,
              name: true,
              expensePackage: { select: { id: true, name: true } },
              expenseConcept: { select: { id: true, name: true } }
            }
          }
        }
      });

      if (!provision) {
        return reply.code(404).send({ error: "Provisión no encontrada" });
      }

      return provision;
    } catch (err: any) {
      console.error('[GET /provisions/:id] Error:', err);
      return reply.code(500).send({
        error: "Error al obtener provisión",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // Create Provision
  app.post("/provisions", async (req, reply) => {
    // Log en modo desarrollo
    if (process.env.NODE_ENV === "development") {
      console.log("📥 POST /provisions - Payload recibido:", JSON.stringify(req.body, null, 2));
    }

    const parsed = createProvisionSchema.safeParse(req.body);
    
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

    try {
      // Validar que el sustento existe
      const sustento = await prisma.support.findUnique({
        where: { id: data.sustentoId }
      });

      if (!sustento) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["sustentoId"], message: "El sustento no existe" }]
        });
      }

      // Crear provisión
      const created = await prisma.provision.create({
        data: {
          sustentoId: data.sustentoId,
          periodoPpto: data.periodoPpto,
          periodoContable: data.periodoContable,
          montoPen: new Prisma.Decimal(data.montoPen),
          detalle: data.detalle || null
        },
        include: {
          sustento: {
            select: {
              id: true,
              code: true,
              name: true,
              expensePackage: { select: { id: true, name: true } },
              expenseConcept: { select: { id: true, name: true } }
            }
          }
        }
      });

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Provisión creada exitosamente:", created.id);
      }

      return created;
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2003") {
          return reply.code(422).send({
            error: "VALIDATION_ERROR",
            issues: [{ path: ["sustentoId"], message: "Referencia inválida (Sustento no existe)" }]
          });
        }
      }
      console.error("Error creating provision:", err);
      return reply.code(500).send({ error: "Error al crear provisión" });
    }
  });

  // Update Provision
  app.patch("/provisions/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = updateProvisionSchema.safeParse(req.body);

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
      // Verificar que la provisión existe
      const existing = await prisma.provision.findUnique({
        where: { id }
      });

      if (!existing) {
        return reply.code(404).send({ error: "Provisión no encontrada" });
      }

      // Si se cambia el sustentoId, validar que existe
      if (data.sustentoId !== undefined) {
        const sustento = await prisma.support.findUnique({
          where: { id: data.sustentoId }
        });

        if (!sustento) {
          return reply.code(422).send({
            error: "VALIDATION_ERROR",
            issues: [{ path: ["sustentoId"], message: "El sustento no existe" }]
          });
        }
      }

      // Validar que montoPen no sea 0 si se proporciona
      if (data.montoPen !== undefined && data.montoPen === 0) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["montoPen"], message: "El monto no puede ser 0" }]
        });
      }

      // Actualizar provisión
      const updateData: any = {};
      if (data.sustentoId !== undefined) updateData.sustentoId = data.sustentoId;
      if (data.periodoPpto !== undefined) updateData.periodoPpto = data.periodoPpto;
      if (data.periodoContable !== undefined) updateData.periodoContable = data.periodoContable;
      if (data.montoPen !== undefined) updateData.montoPen = new Prisma.Decimal(data.montoPen);
      if (data.detalle !== undefined) updateData.detalle = data.detalle || null;

      const updated = await prisma.provision.update({
        where: { id },
        data: updateData,
        include: {
          sustento: {
            select: {
              id: true,
              code: true,
              name: true,
              expensePackage: { select: { id: true, name: true } },
              expenseConcept: { select: { id: true, name: true } }
            }
          }
        }
      });

      return updated;
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2003") {
          return reply.code(422).send({
            error: "VALIDATION_ERROR",
            issues: [{ path: ["sustentoId"], message: "Referencia inválida" }]
          });
        }
      }
      console.error("Error updating provision:", err);
      return reply.code(500).send({ error: "Error al actualizar provisión" });
    }
  });

  // Delete Provision
  app.delete("/provisions/:id", async (req, reply) => {
    const id = Number((req.params as any).id);

    try {
      const existing = await prisma.provision.findUnique({ where: { id } });
      
      if (!existing) {
        return reply.code(404).send({ error: "Provisión no encontrada" });
      }

      await prisma.provision.delete({ where: { id } });
      
      return { success: true, message: "Provisión eliminada" };
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return reply.code(404).send({ error: "Provisión no encontrada" });
      }
      console.error("Error deleting provision:", err);
      return reply.code(500).send({ error: "No se pudo eliminar la provisión" });
    }
  });

  // Export CSV
  app.get("/provisions/export/csv", async (req, reply) => {
    const { sustentoId, periodoPpto, periodoContable } = req.query as any;
    const where: any = {};

    if (sustentoId) where.sustentoId = Number(sustentoId);
    if (periodoPpto) where.periodoPpto = periodoPpto;
    if (periodoContable) where.periodoContable = periodoContable;

    const rows = await prisma.provision.findMany({
      where,
      orderBy: [{ periodoContable: "desc" }, { createdAt: "desc" }],
      include: {
        sustento: { select: { code: true, name: true } }
      }
    });

    const header = [
      "ID", "Sustento", "Periodo PPTO", "Periodo Contable", "Monto (PEN)", 
      "Detalle", "Fecha Creación"
    ];

    const fmt = (v: any) => (v == null ? "" : String(v).replace(/"/g, '""'));
    const lines = [
      header.join(","),
      ...rows.map(r => [
        r.id,
        `"${fmt(r.sustento?.name)}"`,
        r.periodoPpto,
        r.periodoContable,
        r.montoPen?.toString() ?? "",
        `"${fmt(r.detalle)}"`,
        r.createdAt.toISOString().split("T")[0]
      ].join(","))
    ];

    reply.header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", "attachment; filename=provisiones.csv")
      .send(lines.join("\n"));
  });
}

