import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
const prisma = new PrismaClient();

const upsertSupportSchema = z.object({
  id: z.number().optional(),
  code: z.string().optional(),
  name: z.string().min(1),
  costCenterId: z.number().nullable().optional(),
  category: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  vendorId: z.number().nullable().optional(),
  active: z.boolean().optional()
});

export async function registerSupportRoutes(app: FastifyInstance) {
  app.get("/supports", async () => prisma.support.findMany({ orderBy: { id: "asc" }}));

  app.post("/supports", async (req, reply) => {
    const p = upsertSupportSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send(p.error);
    const { id, ...rest } = p.data;
    if (id) {
      return prisma.support.update({ where: { id }, data: rest });
    } else {
      return prisma.support.create({ data: rest });
    }
  });

  app.delete("/supports/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    try {
      await prisma.support.delete({ where: { id }});
      return { ok: true };
    } catch {
      return reply.code(400).send({ error: "no se pudo eliminar (en uso?)" });
    }
  });
}
