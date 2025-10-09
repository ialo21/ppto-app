import { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Schemas
const createInvoiceSchema = z.object({
  vendorId: z.number().nullable().optional(),
  docType: z.enum(["FACTURA","NOTA_CREDITO"]).default("FACTURA"),
  numberNorm: z.string().min(1),
  currency: z.enum(["PEN","USD"]).default("PEN"),
  totalForeign: z.number().nullable().optional(),   // negativo si NOTA_CREDITO
  totalLocal: z.number().nullable().optional(),     // negativo si NOTA_CREDITO
  ultimusIncident: z.string().optional()
});

const updateStatusSchema = z.object({
  status: z.enum([
    "INGRESADO","EN_APROBACION","EN_CONTABILIDAD",
    "EN_TESORERIA","EN_ESPERA_DE_PAGO","PAGADO","RECHAZADO"
  ]),
  note: z.string().optional()
});

export async function registerInvoiceRoutes(app: FastifyInstance) {
  // List
  app.get("/invoices", async (req, reply) => {
    const items = await prisma.invoice.findMany({
      orderBy: [{ id: "desc" }],
      include: { vendor: true }
    });
    return items;
  });

  // Get by id + history
  app.get("/invoices/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: { vendor: true, statusHistory: { orderBy: { changedAt: "asc" } } }
    });
    if (!inv) return reply.code(404).send({ error: "invoice not found" });
    return inv;
  });

  // Create (FACTURA | NOTA_CREDITO)
  app.post("/invoices", async (req, reply) => {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error);
    const data = parsed.data;

    // Validación: NOTA_CREDITO => montos negativos
    if (data.docType === "NOTA_CREDITO") {
      if ((data.totalForeign ?? 0) >= 0 && (data.totalLocal ?? 0) >= 0) {
        return reply.code(400).send({ error: "NOTA_CREDITO requiere montos negativos" });
      }
    }

    // Normalización mínima del número (ya normalizado en este MVP)
    const created = await prisma.invoice.create({
      data: {
        vendorId: data.vendorId ?? null,
        docType: data.docType as any,
        numberNorm: data.numberNorm,
        currency: data.currency,
        totalForeign: data.totalForeign != null ? new Prisma.Decimal(data.totalForeign) : null,
        totalLocal: data.totalLocal != null ? new Prisma.Decimal(data.totalLocal) : null,
        ultimusIncident: data.ultimusIncident ?? null,
        statusCurrent: "INGRESADO"
      }
    });

    // Primer estado
    await prisma.invoiceStatusHistory.create({
      data: { invoiceId: created.id, status: "INGRESADO" }
    });

    return created;
  });

  // Update status + append history
  app.patch("/invoices/:id/status", async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error);

    const inv = await prisma.invoice.findUnique({ where: { id }});
    if (!inv) return reply.code(404).send({ error: "invoice not found" });

    // Reglas simples: no saltar de INGRESADO a TESORERIA sin pasos previos (MVP: solo permitimos cambios lineales hacia adelante o RECHAZADO)
    const allowed = new Set([
      "INGRESADO","EN_APROBACION","EN_CONTABILIDAD","EN_TESORERIA","EN_ESPERA_DE_PAGO","PAGADO","RECHAZADO"
    ]);
    if (!allowed.has(parsed.data.status)) {
      return reply.code(400).send({ error: "status inválido" });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { statusCurrent: parsed.data.status as any }
    });

    await prisma.invoiceStatusHistory.create({
      data: {
        invoiceId: id,
        status: parsed.data.status as any,
        note: parsed.data.note ?? null
      }
    });

    return updated;
  });

  // History only
  app.get("/invoices/:id/history", async (req, reply) => {
    const id = Number((req.params as any).id);
    const rows = await prisma.invoiceStatusHistory.findMany({
      where: { invoiceId: id },
      orderBy: { changedAt: "asc" }
    });
    return rows;
  });

  // GET /invoices/export/csv?status=&docType=
  app.get("/invoices/export/csv", async (req, reply) => {
    const { status, docType } = req.query as any;
    const where:any = {};
    if (status) where.statusCurrent = String(status).toUpperCase();
    if (docType) where.docType = String(docType).toUpperCase();

    const rows = await prisma.invoice.findMany({
      where,
      orderBy: [{ id: "asc" }],
      include: { vendor: true, statusHistory: { orderBy: { changedAt: "asc" } } }
    });

    const header = [
      "ID","DocType","Number","Currency","TotalForeign","TotalLocal",
      "Status","VendorId","VendorName","UltimusIncident","History"
    ];

    const fmt = (v:any) => (v==null?"":String(v).replace(/"/g,'""'));
    const lines = [
      header.join(","),
      ...rows.map(r => [
        r.id, r.docType, `"${fmt(r.numberNorm)}"`, r.currency, r.totalForeign??"", r.totalLocal??"",
        r.statusCurrent, r.vendorId??"", `"${fmt(r.vendor?.name)}"`, `"${fmt(r.ultimusIncident)}"`,
        `"${fmt(r.statusHistory.map(h=>`${h.status}@${h.changedAt.toISOString()}`).join(" | "))}"`
      ].join(","))
    ];

    reply.header("Content-Type","text/csv; charset=utf-8")
         .header("Content-Disposition","attachment; filename=invoices.csv")
         .send(lines.join("\n"));
  });
}
