import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requirePermission } from "./auth";

const prisma = new PrismaClient();

const costCenterSchema = z.object({
  id: z.number().int().positive().optional(),
  code: z.string().min(1),
  name: z.string().optional()
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
  code: z.string().min(1).optional(), // DEPRECATED
  name: z.string().min(1).trim(),
  active: z.boolean().optional()
});

const areaSchema = z.object({
  id: z.number().int().positive().optional(),
  code: z.string().min(1).optional(), // DEPRECATED
  name: z.string().min(1).trim(),
  managementId: z.number().int().positive(),
  active: z.boolean().optional()
});

export async function registerMasterRoutes(app: FastifyInstance) {
  // Cost centers
  app.get("/cost-centers", { preHandler: requireAuth }, async () => prisma.costCenter.findMany({ orderBy: { code: "asc" } }));

  app.post("/cost-centers", { preHandler: [requireAuth, requirePermission("catalogos")] }, async (req, reply) => {
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

  app.delete("/cost-centers/:id", { preHandler: [requireAuth, requirePermission("catalogos")] }, async (req, reply) => {
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
  app.get("/expense-packages", { preHandler: requireAuth }, async () =>
    prisma.expensePackage.findMany({
      orderBy: { name: "asc" },
      include: { concepts: { orderBy: { name: "asc" } } }
    })
  );

  app.post("/expense-packages", { preHandler: [requireAuth, requirePermission("catalogos")] }, async (req, reply) => {
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

  app.delete("/expense-packages/:id", { preHandler: [requireAuth, requirePermission("catalogos")] }, async (req, reply) => {
    const id = Number((req.params as any).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: "id invalido" });
    try {
      await prisma.expensePackage.delete({ where: { id } });
      return { ok: true };
    } catch {
      return reply.code(400).send({ error: "no se pudo eliminar el paquete (en uso?)" });
    }
  });

  app.post("/expense-concepts", { preHandler: [requireAuth, requirePermission("catalogos")] }, async (req, reply) => {
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

  app.delete("/expense-concepts/:id", { preHandler: [requireAuth, requirePermission("catalogos")] }, async (req, reply) => {
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
  app.get("/articulos", { preHandler: [requireAuth, requirePermission("catalogos")] }, async () => prisma.articulo.findMany({ orderBy: { code: "asc" } }));

  app.post("/articulos", { preHandler: [requireAuth, requirePermission("catalogos")] }, async (req, reply) => {
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

  app.delete("/articulos/:id", { preHandler: [requireAuth, requirePermission("catalogos")] }, async (req, reply) => {
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
  app.get("/managements", { preHandler: requireAuth }, async () => 
    prisma.management.findMany({ 
      orderBy: { name: "asc" },
      include: { areas: { orderBy: { name: "asc" } } }
    })
  );

  app.post("/managements", { preHandler: [requireAuth, requirePermission("catalogos")] }, async (req, reply) => {
    const parsed = managementSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: parsed.error.errors.map(err => ({
          path: err.path,
          message: err.message
        }))
      });
    }
    
    const { id, active = true, name, code } = parsed.data;
    
    // Verificar unicidad de nombre (case-insensitive)
    const existing = await prisma.management.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        ...(id ? { id: { not: id } } : {})
      }
    });
    
    if (existing) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{ path: ["name"], message: "El nombre ya existe" }]
      });
    }
    
    try {
      if (id) {
        return await prisma.management.update({ 
          where: { id }, 
          data: { name, code: code || null, active },
          include: { areas: true }
        });
      }
      return await prisma.management.create({ 
        data: { name, code: code || null, active },
        include: { areas: true }
      });
    } catch (err: any) {
      console.error("Error saving management:", err);
      return reply.code(500).send({ error: "Error al guardar la gerencia" });
    }
  });

  app.delete("/managements/:id", { preHandler: [requireAuth, requirePermission("catalogos")] }, async (req, reply) => {
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
  app.get("/areas", { preHandler: requireAuth }, async () => 
    prisma.area.findMany({ 
      orderBy: { name: "asc" },
      include: { management: true }
    })
  );

  app.post("/areas", { preHandler: [requireAuth, requirePermission("catalogos")] }, async (req, reply) => {
    const parsed = areaSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: parsed.error.errors.map(err => ({
          path: err.path,
          message: err.message
        }))
      });
    }
    
    const { id, active = true, managementId, name, code } = parsed.data;
    
    // Verificar que la gerencia existe
    const management = await prisma.management.findUnique({ where: { id: managementId } });
    if (!management) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{ path: ["managementId"], message: "Gerencia no encontrada" }]
      });
    }
    
    // Verificar unicidad de nombre (case-insensitive)
    const existing = await prisma.area.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        ...(id ? { id: { not: id } } : {})
      }
    });
    
    if (existing) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{ path: ["name"], message: "El nombre ya existe" }]
      });
    }

    try {
      if (id) {
        return await prisma.area.update({ 
          where: { id }, 
          data: { name, code: code || null, managementId, active },
          include: { management: true }
        });
      }
      return await prisma.area.create({ 
        data: { name, code: code || null, managementId, active },
        include: { management: true }
      });
    } catch (err: any) {
      console.error("Error saving area:", err);
      return reply.code(500).send({ error: "Error al guardar el área" });
    }
  });

  app.delete("/areas/:id", { preHandler: [requireAuth, requirePermission("catalogos")] }, async (req, reply) => {
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
