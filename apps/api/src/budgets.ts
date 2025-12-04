import { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requirePermission } from "./auth";

const prisma = new PrismaClient();

const listSchema = z.object({
  periodId: z.coerce.number(),
  versionId: z.coerce.number().optional()
});

const upsertSchema = z.object({
  versionId: z.number().optional(),
  periodId: z.number(),
  items: z.array(z.object({
    supportId: z.number(),
    amountLocal: z.number()
  }))
});

export async function registerBudgetRoutes(app: FastifyInstance) {
  // Listar asignaciones por período (y versión activa por defecto)
  app.get("/budgets", { preHandler: [requireAuth, requirePermission("ppto")] }, async (req, reply) => {
    const q = listSchema.safeParse(req.query);
    if (!q.success) return reply.code(400).send(q.error);
    const { periodId } = q.data;
    let versionId = q.data.versionId;
    if (!versionId) {
      const v = await prisma.budgetVersion.findFirst({ where: { status: "ACTIVE" }});
      versionId = v?.id!;
    }
    const rows = await prisma.budgetAllocation.findMany({
      where: { 
        periodId, 
        versionId,
        costCenterId: null // Solo mostrar asignaciones simples (sin CECO)
      },
      include: { support: true },
      orderBy: { supportId: "asc" }
    });
    return { versionId, periodId, rows };
  });

  // Upsert masivo (reemplaza o crea por sustento)
  app.post("/budgets/upsert", { preHandler: [requireAuth, requirePermission("ppto")] }, async (req, reply) => {
    const p = upsertSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send(p.error);
    let { versionId, periodId, items } = p.data;

    if (!versionId) {
      const v = await prisma.budgetVersion.findFirst({ where: { status: "ACTIVE" }});
      if (!v) return reply.code(400).send({ error: "no hay versión ACTIVE" });
      versionId = v.id;
    }

    const result = await prisma.$transaction(async (tx) => {
      const out = [];
      for (const it of items) {
        // Usar el nuevo constraint que incluye costCenterId (null para vista simple)
        const row = await tx.budgetAllocation.upsert({
          where: {
            ux_alloc_version_period_support_ceco: { 
              versionId, 
              periodId, 
              supportId: it.supportId,
              costCenterId: null as any // Vista simple sin CECO
            }
          },
          update: { amountLocal: new Prisma.Decimal(it.amountLocal) },
          create: {
            versionId, 
            periodId, 
            supportId: it.supportId,
            costCenterId: null, // Vista simple sin CECO
            amountLocal: new Prisma.Decimal(it.amountLocal),
            currency: "PEN"
          }
        });
        out.push(row);
      }
      return out;
    });

    return { count: result.length, rows: result };
  });
}
