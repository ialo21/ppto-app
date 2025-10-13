import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const costCenterSchema = z.object({
  id: z.number().int().positive().optional(),
  code: z.string().min(1),
  name: z.string().min(1)
});

const expensePackageSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1)
});

const expenseConceptSchema = z.object({
  id: z.number().int().positive().optional(),
  packageId: z.number().int().positive(),
  name: z.string().min(1)
});

const articuloSchema = z.object({
  id: z.number().int().positive().optional(),
  code: z.string().min(1),
  name: z.string().min(1)
});

const managementSchema = z.object({
  id: z.number().int().positive().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  active: z.boolean().optional()
});

const areaSchema = z.object({
  id: z.number().int().positive().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  managementId: z.number().int().positive(),
  active: z.boolean().optional()
});

export async function registerMasterRoutes(app: FastifyInstance) {
  // Cost centers
  app.get("/cost-centers", async () => prisma.costCenter.findMany({ orderBy: { code: "asc" } }));

  app.post("/cost-centers", async (req, reply) => {
    const parsed = costCenterSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error);
    const { id, ...data } = parsed.data;
    try {
      if (id) {
        return await prisma.costCenter.update({ where: { id }, data });
      }
      return await prisma.costCenter.create({ data });
    } catch (err) {
      return reply.code(400).send({ error: "no se pudo guardar el centro de costo", details: err });
    }
  });

  app.delete("/cost-centers/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: "id invalido" });
    try {
      await prisma.costCenter.delete({ where: { id } });
      return { ok: true };
    } catch {
      return reply.code(400).send({ error: "no se pudo eliminar (en uso?)" });
    }
  });

  // Expense packages and concepts
  app.get("/expense-packages", async () =>
    prisma.expensePackage.findMany({
      orderBy: { name: "asc" },
      include: { concepts: { orderBy: { name: "asc" } } }
    })
  );

  app.post("/expense-packages", async (req, reply) => {
    const parsed = expensePackageSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error);
    const { id, ...data } = parsed.data;
    try {
      if (id) {
        return await prisma.expensePackage.update({ where: { id }, data });
      }
      return await prisma.expensePackage.create({ data });
    } catch {
      return reply.code(400).send({ error: "no se pudo guardar el paquete de gasto" });
    }
  });

  app.delete("/expense-packages/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: "id invalido" });
    try {
      await prisma.expensePackage.delete({ where: { id } });
      return { ok: true };
    } catch {
      return reply.code(400).send({ error: "no se pudo eliminar el paquete (en uso?)" });
    }
  });

  app.post("/expense-concepts", async (req, reply) => {
    const parsed = expenseConceptSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error);
    const { id, packageId, ...data } = parsed.data;
    try {
      if (id) {
        return await prisma.expenseConcept.update({
          where: { id },
          data: { ...data }
        });
      }
      return await prisma.expenseConcept.create({
        data: { ...data, packageId }
      });
    } catch {
      return reply.code(400).send({ error: "no se pudo guardar el concepto de gasto" });
    }
  });

  app.delete("/expense-concepts/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: "id invalido" });
    try {
      await prisma.expenseConcept.delete({ where: { id } });
      return { ok: true };
    } catch {
      return reply.code(400).send({ error: "no se pudo eliminar el concepto (en uso?)" });
    }
  });

  // Articulos
  app.get("/articulos", async () => prisma.articulo.findMany({ orderBy: { code: "asc" } }));

  app.post("/articulos", async (req, reply) => {
    const parsed = articuloSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error);
    const { id, ...data } = parsed.data;
    try {
      if (id) {
        return await prisma.articulo.update({ where: { id }, data });
      }
      return await prisma.articulo.create({ data });
    } catch (err) {
      return reply.code(400).send({ error: "no se pudo guardar el artículo", details: err });
    }
  });

  app.delete("/articulos/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: "id invalido" });
    try {
      await prisma.articulo.delete({ where: { id } });
      return { ok: true };
    } catch {
      return reply.code(400).send({ error: "no se pudo eliminar el artículo (en uso?)" });
    }
  });

  // Managements (Gerencias)
  app.get("/managements", async () => 
    prisma.management.findMany({ 
      orderBy: { code: "asc" },
      include: { areas: { orderBy: { code: "asc" } } }
    })
  );

  app.post("/managements", async (req, reply) => {
    const parsed = managementSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error);
    const { id, active = true, ...data } = parsed.data;
    try {
      if (id) {
        return await prisma.management.update({ where: { id }, data: { ...data, active } });
      }
      return await prisma.management.create({ data: { ...data, active } });
    } catch (err) {
      return reply.code(400).send({ error: "no se pudo guardar la gerencia", details: err });
    }
  });

  app.delete("/managements/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: "id invalido" });
    try {
      await prisma.management.delete({ where: { id } });
      return { ok: true };
    } catch {
      return reply.code(400).send({ error: "no se pudo eliminar la gerencia (en uso?)" });
    }
  });

  // Areas
  app.get("/areas", async () => 
    prisma.area.findMany({ 
      orderBy: { code: "asc" },
      include: { management: true }
    })
  );

  app.post("/areas", async (req, reply) => {
    const parsed = areaSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error);
    const { id, active = true, managementId, ...data } = parsed.data;
    
    // Verificar que la gerencia existe
    const management = await prisma.management.findUnique({ where: { id: managementId } });
    if (!management) {
      return reply.code(400).send({ error: "gerencia no encontrada" });
    }

    try {
      if (id) {
        return await prisma.area.update({ 
          where: { id }, 
          data: { ...data, managementId, active },
          include: { management: true }
        });
      }
      return await prisma.area.create({ 
        data: { ...data, managementId, active },
        include: { management: true }
      });
    } catch (err) {
      return reply.code(400).send({ error: "no se pudo guardar el área", details: err });
    }
  });

  app.delete("/areas/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: "id invalido" });
    try {
      await prisma.area.delete({ where: { id } });
      return { ok: true };
    } catch {
      return reply.code(400).send({ error: "no se pudo eliminar el área (en uso?)" });
    }
  });
}
