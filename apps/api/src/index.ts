import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
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
import { registerProvisionRoutes } from "./provisions";
import { registerAssistantRoutes } from "./assistant";
import { registerAuthRoutes, requireAuth } from "./auth";
import { registerRoleRoutes } from "./roles";
import { ensureYearPeriods } from "./periods";

const app = Fastify({ logger: true });

// Configurar encoding UTF-8 para todas las respuestas
app.addHook('onSend', async (request, reply, payload) => {
  reply.header('Content-Type', 'application/json; charset=utf-8');
  return payload;
});

// CORS - permitir credenciales para sesiones
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
// Permitir múltiples orígenes para desarrollo en red
const allowedOrigins = [
  frontendUrl,
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

await app.register(cors, { 
  origin: (origin, cb) => {
    // Permitir requests sin origin (como Postman) o los orígenes permitidos
    if (!origin || allowedOrigins.includes(origin) || origin.includes('.nip.io')) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true 
});

// Cookies y sesiones
const isProduction = process.env.NODE_ENV === "production";
await app.register(cookie);
await app.register(session, {
  secret: process.env.SESSION_SECRET || "ppto-app-secret-change-in-production-min-32-chars",
  cookieName: "ppto-session", // Nombre explícito de la cookie
  cookie: {
    secure: false, // false para HTTP en desarrollo
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 días
    sameSite: "lax", // lax funciona con HTTP en desarrollo
    path: "/" // cookie disponible en todas las rutas
  },
  saveUninitialized: false
});

const prisma = new PrismaClient();

// Health
app.get("/health", async () => ({ ok: true }));

// Periods: list (optionally filtered by year)
app.get("/periods", { preHandler: requireAuth }, async (req, reply) => {
  const year = (req.query as any).year ? Number((req.query as any).year) : undefined;
  
  // If year is specified, ensure all 12 periods exist
  if (year) {
    await ensureYearPeriods(year);
    return prisma.period.findMany({ 
      where: { year },
      orderBy: { month: "asc" }
    });
  }
  
  // IMPORTANTE: Sin filtro de año, auto-crear periodos del año actual
  // para que las facturas/OCs puedan usar cualquier mes (incluso retrospectivo).
  // Las facturas no se limitan por fecha actual, pueden crearse para meses pasados.
  const currentYear = new Date().getFullYear();
  await ensureYearPeriods(currentYear);
  
  // Return all periods from all years
  return prisma.period.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] });
});

// Periods: get distinct years
app.get("/periods/years", { preHandler: requireAuth }, async () => {
  const periods = await prisma.period.findMany({
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "desc" }
  });
  return periods.map(p => ({ year: p.year }));
});

// Periods: receive accounting closure
app.post("/periods/:id/closure", { preHandler: requireAuth }, async (req, reply) => {
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

// Rutas de autenticación (sin protección)
await registerAuthRoutes(app);

// Rutas de gestión de roles (protegidas)
await registerRoleRoutes(app);

// Rutas específicas de la aplicación
await registerSupportRoutes(app);
await registerBudgetRoutes(app);
await registerDetailedBudgetRoutes(app);
await registerControlLineRoutes(app);
await registerInvoiceRoutes(app);
await registerOcRoutes(app);
await registerProvisionRoutes(app);
await registerReportRoutes(app);
await registerMasterRoutes(app);
await registerBulkRoutes(app);
await registerExchangeRateRoutes(app);
await registerAssistantRoutes(app);

const port = Number(process.env.API_PORT || 3001);
app.listen({ port, host: "0.0.0.0" });
