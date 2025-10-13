import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { registerInvoiceRoutes } from "./invoices";
import { registerControlLineRoutes } from "./controlLines";
import { registerReportRoutes } from "./reports";
import { registerSupportRoutes } from "./supports";
import { registerBudgetRoutes } from "./budgets";
import { registerMasterRoutes } from "./masters";
import { registerOcRoutes } from "./oc";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const prisma = new PrismaClient();

// Health
app.get("/health", async () => ({ ok: true }));

// Periods: list
app.get("/periods", async () => {
  return prisma.period.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] });
});

// Periods: receive accounting closure
app.post("/periods/:id/closure", async (req, reply) => {
  const id = Number((req.params as any).id);
  const period = await prisma.period.findUnique({ where: { id }});
  if (!period) return reply.code(404).send({ error: "period not found" });

  const closure = await prisma.accountingClosure.upsert({
    where: { periodId: id },
    update: { receivedAt: new Date(), sourceRef: "manual" },
    create: { periodId: id, receivedAt: new Date(), sourceRef: "manual" }
  });
  return closure;
});

// Rutas específicas
await registerSupportRoutes(app);
await registerBudgetRoutes(app);
await registerControlLineRoutes(app);
await registerInvoiceRoutes(app);
await registerOcRoutes(app);
await registerReportRoutes(app);
await registerMasterRoutes(app);

const port = Number(process.env.API_PORT || 3001);
app.listen({ port, host: "0.0.0.0" });
