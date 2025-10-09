import { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { checkOverspend } from "./overspend";

const prisma = new PrismaClient();

const listByPeriodSchema = z.object({ periodId: z.number() });

const processSchema = z.object({
  accountingPeriodId: z.number(),
  fxRateFinal: z.number().optional() // USD => requerido; PEN => 1
});

const markProvisionadoSchema = z.object({
  accountingPeriodId: z.number()
});

const createProvisionSchema = z.object({
  supportId: z.number(),
  periodId: z.number(),              // mes operativo al que corresponde la provisión/liberación
  accountingPeriodId: z.number(),    // mes contable del cierre
  amountLocal: z.number(),           // + provisión / - liberación
  description: z.string().optional()
});

const bulkProvisionSchema = z.object({
  items: z.array(createProvisionSchema)
});

export async function registerControlLineRoutes(app: FastifyInstance) {
  // Listar por período (operativo)
  app.get("/control-lines", async (req, reply) => {
    const periodId = Number((req.query as any)?.periodId);
    if (!periodId) return reply.code(400).send({ error: "periodId requerido" });
    const rows = await prisma.controlLine.findMany({
      where: { periodId },
      orderBy: { id: "desc" },
      include: { support: true, invoice: true, po: true, period: true, accountingPeriod: true }
    });
    return rows;
  });

  // Procesar: fija mes contable + TC final y recalcula monto local
  app.patch("/control-lines/:id/process", async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = processSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error);

    const cl = await prisma.controlLine.findUnique({ where: { id }});
    if (!cl) return reply.code(404).send({ error: "control line not found" });

    const fxFinal = cl.currency === "USD"
      ? new Prisma.Decimal(parsed.data.fxRateFinal ?? 3.70)
      : new Prisma.Decimal(1);

    let amountLocal = cl.amountLocal;
    if (cl.amountForeign != null) {
      amountLocal = new Prisma.Decimal(cl.amountForeign).mul(fxFinal);
    }

    // Verificar sobreejecución
    const delta = new Prisma.Decimal(amountLocal).minus(cl.amountLocal);
    await checkOverspend({
      supportId: cl.supportId,
      accountingPeriodId: parsed.data.accountingPeriodId,
      deltaLocal: delta
    });

    const updated = await prisma.controlLine.update({
      where: { id },
      data: {
        state: "PROCESADO",
        accountingPeriodId: parsed.data.accountingPeriodId,
        fxRateFinal: fxFinal,
        amountLocal
      }
    });

    return updated;
  });

  // Marcar PROVISIONADO: asigna mes contable, sin TC final (no recalcula)
  app.patch("/control-lines/:id/provisionado", async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = markProvisionadoSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error);

    const cl = await prisma.controlLine.findUnique({ where: { id }});
    if (!cl) return reply.code(404).send({ error: "control line not found" });

    const updated = await prisma.controlLine.update({
      where: { id },
      data: {
        state: "PROVISIONADO",
        accountingPeriodId: parsed.data.accountingPeriodId
      }
    });

    return updated;
  });

  // Crear PROVISION individual (+ provisión / - liberación)
  app.post("/control-lines/provision", async (req, reply) => {
    const parsed = createProvisionSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error);
    const { supportId, periodId, accountingPeriodId, amountLocal, description } = parsed.data;

    // Validación: amountLocal no puede ser 0
    if (Math.abs(amountLocal) === 0) {
      return reply.code(400).send({ error: "amountLocal no puede ser 0" });
    }

    // Verificar sobreejecución
    await checkOverspend({
      supportId,
      accountingPeriodId,
      deltaLocal: amountLocal
    });

    const created = await prisma.controlLine.create({
      data: {
        supportId,
        type: "PROVISION",
        state: "PROVISIONADO",
        periodId,
        accountingPeriodId,
        description: description ?? null,
        currency: "PEN",                 // provisión contable en moneda local
        amountForeign: null,
        fxRateProvisional: new Prisma.Decimal(1),
        fxRateFinal: new Prisma.Decimal(1),
        amountLocal: new Prisma.Decimal(amountLocal)
      }
    });

    return created;
  });

  // Bulk PROVISION (desde UI simple)
  app.post("/control-lines/provision/bulk", async (req, reply) => {
    const parsed = bulkProvisionSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error);
    const data = parsed.data.items;

    const created = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const it of data) {
        // Validación: amountLocal no puede ser 0
        if (Math.abs(it.amountLocal) === 0) {
          throw new Error(`amountLocal no puede ser 0 para supportId ${it.supportId}`);
        }

        // Verificar sobreejecución para cada item
        await checkOverspend({
          supportId: it.supportId,
          accountingPeriodId: it.accountingPeriodId,
          deltaLocal: it.amountLocal
        });

        const row = await tx.controlLine.create({
          data: {
            supportId: it.supportId,
            type: "PROVISION",
            state: "PROVISIONADO",
            periodId: it.periodId,
            accountingPeriodId: it.accountingPeriodId,
            description: it.description ?? null,
            currency: "PEN",
            amountForeign: null,
            fxRateProvisional: new Prisma.Decimal(1),
            fxRateFinal: new Prisma.Decimal(1),
            amountLocal: new Prisma.Decimal(it.amountLocal)
          }
        });
        results.push(row);
      }
      return results;
    });

    return { count: created.length, items: created };
  });

  // GET /control-lines/export/csv?periodId=&accountingPeriodId=&type=&state=
  app.get("/control-lines/export/csv", async (req, reply) => {
    const { periodId, accountingPeriodId, type, state } = req.query as any;

    const where:any = {};
    if (periodId) where.periodId = Number(periodId);
    if (accountingPeriodId) where.accountingPeriodId = Number(accountingPeriodId);
    if (type) where.type = String(type).toUpperCase();
    if (state) where.state = String(state).toUpperCase();

    const rows = await prisma.controlLine.findMany({
      where,
      orderBy: [{ id: "asc" }],
      include: { support: true, period: true, accountingPeriod: true, invoice: true }
    });

    const header = [
      "ID","Type","State","SupportID","SupportName",
      "Period","AccountingPeriod",
      "Currency","AmountForeign","FxProv","FxFinal","AmountLocal",
      "InvoiceId","Description","CreatedAt"
    ];

    const fmt = (v:any) => (v==null?"":String(v).replace(/"/g,'""'));
    const lines = [
      header.join(","),
      ...rows.map(r => [
        r.id, r.type, r.state, r.supportId, `"${fmt(r.support?.name)}"`,
        `"${r.period?.label||""}"`, `"${r.accountingPeriod?.label||""}"`,
        r.currency||"", r.amountForeign??"", r.fxRateProvisional??"", r.fxRateFinal??"", r.amountLocal,
        r.invoiceId??"", `"${fmt(r.description)}"`, r.createdAt.toISOString()
      ].join(","))
    ];

    reply.header("Content-Type","text/csv; charset=utf-8")
         .header("Content-Disposition","attachment; filename=control_lines.csv")
         .send(lines.join("\n"));
  });
}
