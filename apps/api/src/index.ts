import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { registerInvoiceRoutes } from "./invoices";
import { registerControlLineRoutes } from "./controlLines";
import { registerReportRoutes } from "./reports";
import { registerSupportRoutes } from "./supports";
import { registerBudgetRoutes } from "./budgets";
import { registerDetailedBudgetRoutes } from "./budgets-detailed";
import { registerMasterRoutes } from "./masters";
import { registerOcRoutes } from "./oc";
import { registerBulkRoutes } from "./bulk";
import { registerExchangeRateRoutes } from "./exchange-rates";
import { ensureYearPeriods } from "./periods";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const prisma = new PrismaClient();

// Health
app.get("/health", async () => ({ ok: true }));

// Periods: list (optionally filtered by year)
app.get("/periods", async (req, reply) => {
  const year = (req.query as any).year ? Number((req.query as any).year) : undefined;
  
  // If year is specified, ensure all 12 periods exist
  if (year) {
    await ensureYearPeriods(year);
    return prisma.period.findMany({ 
      where: { year },
      orderBy: { month: "asc" }
    });
  }
  
  // Otherwise return all periods
  return prisma.period.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] });
});

// Periods: get distinct years
app.get("/periods/years", async () => {
  const periods = await prisma.period.findMany({
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "desc" }
  });
  return periods.map(p => ({ year: p.year }));
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
await registerDetailedBudgetRoutes(app);
await registerControlLineRoutes(app);
await registerInvoiceRoutes(app);
await registerOcRoutes(app);
await registerReportRoutes(app);
await registerMasterRoutes(app);
await registerBulkRoutes(app);
await registerExchangeRateRoutes(app);

const port = Number(process.env.API_PORT || 3001);
app.listen({ port, host: "0.0.0.0" });
