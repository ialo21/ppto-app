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
}
