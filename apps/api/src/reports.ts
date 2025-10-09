import { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * /reports/execution?periodId=XX[&versionId=YY]
 * - periodId: mes a reportar (contable)
 * - versionId opcional: si no se pasa, usa la versión ACTIVE
 * Retorna filas por sustento: { supportId, supportName, budget, executed_real, provisions, available }
 */
export async function registerReportRoutes(app: FastifyInstance) {
  app.get("/reports/execution", async (req, reply) => {
    const q = req.query as any;
    const periodId = Number(q.periodId);
    if (!periodId) return reply.code(400).send({ error: "periodId requerido" });

    let versionId: number | null = q.versionId ? Number(q.versionId) : null;
    if (!versionId) {
      const active = await prisma.budgetVersion.findFirst({ where: { status: "ACTIVE" } });
      versionId = active?.id ?? null;
    }

    // Presupuesto por sustento en el período
    const budgetRows = versionId
      ? await prisma.budgetAllocation.findMany({
          where: { periodId, versionId },
          include: { support: true }
        })
      : [];

    // Gastos reales PROCESADOS (contables) en el período
    const executedRows = await prisma.controlLine.groupBy({
      by: ["supportId"],
      where: {
        type: "GASTO",
        state: "PROCESADO",
        accountingPeriodId: periodId
      },
      _sum: { amountLocal: true }
    });

    // Provisiones (con signo) en el período
    const provRows = await prisma.controlLine.groupBy({
      by: ["supportId"],
      where: {
        type: "PROVISION",
        accountingPeriodId: periodId
      },
      _sum: { amountLocal: true }
    });

    // Indexar por supportId
    const mapExecuted = new Map(executedRows.map(r => [r.supportId, r._sum.amountLocal || new Prisma.Decimal(0)]));
    const mapProv = new Map(provRows.map(r => [r.supportId, r._sum.amountLocal || new Prisma.Decimal(0)]));

    // Unir: incluye también sustentos con gasto/provisión aunque no tengan PPTO
    const supportIds = new Set<number>();
    budgetRows.forEach(b => supportIds.add(b.supportId));
    executedRows.forEach(e => supportIds.add(e.supportId));
    provRows.forEach(p => supportIds.add(p.supportId));

    // Obtener nombres de sustento
    const supports = await prisma.support.findMany({ where: { id: { in: Array.from(supportIds) } } });
    const mapSupport = new Map(supports.map(s => [s.id, s.name]));

    const rows = Array.from(supportIds).map(sid => {
      const b = budgetRows.find(x => x.supportId === sid);
      const budget = b?.amountLocal ?? new Prisma.Decimal(0);
      const executed = mapExecuted.get(sid) ?? new Prisma.Decimal(0);
      const provisions = mapProv.get(sid) ?? new Prisma.Decimal(0);
      const available = new Prisma.Decimal(budget).minus(executed).minus(provisions);
      return {
        supportId: sid,
        supportName: mapSupport.get(sid) || `S-${sid}`,
        budget: Number(budget),
        executed_real: Number(executed),
        provisions: Number(provisions),
        available: Number(available)
      };
    });

    // Totales
    const totals = rows.reduce((acc, r) => ({
      budget: acc.budget + r.budget,
      executed_real: acc.executed_real + r.executed_real,
      provisions: acc.provisions + r.provisions,
      available: acc.available + r.available
    }), { budget: 0, executed_real: 0, provisions: 0, available: 0 });

    return { periodId, versionId, rows, totals };
  });

  app.get("/reports/execution/csv", async (req, reply) => {
    const q = req.query as any;
    const periodId = Number(q.periodId);
    if (!periodId) return reply.code(400).send("periodId requerido");

    let versionId: number | null = q.versionId ? Number(q.versionId) : null;
    if (!versionId) {
      const active = await prisma.budgetVersion.findFirst({ where: { status: "ACTIVE" } });
      versionId = active?.id ?? null;
    }

    // Reutilizamos la lógica del endpoint JSON:
    const budgetRows = versionId
      ? await prisma.budgetAllocation.findMany({
          where: { periodId, versionId },
          include: { support: true }
        })
      : [];

    const executedRows = await prisma.controlLine.groupBy({
      by: ["supportId"],
      where: { type: "GASTO", state: "PROCESADO", accountingPeriodId: periodId },
      _sum: { amountLocal: true }
    });

    const provRows = await prisma.controlLine.groupBy({
      by: ["supportId"],
      where: { type: "PROVISION", accountingPeriodId: periodId },
      _sum: { amountLocal: true }
    });

    const mapExecuted = new Map(executedRows.map(r => [r.supportId, r._sum.amountLocal || 0]));
    const mapProv = new Map(provRows.map(r => [r.supportId, r._sum.amountLocal || 0]));
    const supportIds = new Set<number>();
    budgetRows.forEach(b => supportIds.add(b.supportId));
    executedRows.forEach(e => supportIds.add(e.supportId));
    provRows.forEach(p => supportIds.add(p.supportId));

    const supports = await prisma.support.findMany({ where: { id: { in: Array.from(supportIds) } } });
    const mapSupport = new Map(supports.map(s => [s.id, s.name]));

    const rows = Array.from(supportIds).map(sid => {
      const b = budgetRows.find(x => x.supportId === sid);
      const budget = Number(b?.amountLocal ?? 0);
      const executed = Number(mapExecuted.get(sid) ?? 0);
      const provisions = Number(mapProv.get(sid) ?? 0);
      const available = budget - executed - provisions;
      return {
        supportId: sid,
        supportName: mapSupport.get(sid) || `S-${sid}`,
        budget, executed, provisions, available
      };
    });

    // Totales
    const totals = rows.reduce((acc, r) => ({
      budget: acc.budget + r.budget,
      executed: acc.executed + r.executed,
      provisions: acc.provisions + r.provisions,
      available: acc.available + r.available
    }), { budget: 0, executed: 0, provisions: 0, available: 0 });

    const header = ["SupportID","SupportName","Budget","ExecutedReal","Provisions","Available"];
    const lines = [
      header.join(","),
      ...rows.map(r => [r.supportId, `"${r.supportName.replace(/"/g,'""')}"`, r.budget.toFixed(2), r.executed.toFixed(2), r.provisions.toFixed(2), r.available.toFixed(2)].join(",")),
      ["TOTAL","", totals.budget.toFixed(2), totals.executed.toFixed(2), totals.provisions.toFixed(2), totals.available.toFixed(2)].join(",")
    ];

    reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="execution_${periodId}${versionId ? "_v"+versionId : ""}.csv"`)
      .send(lines.join("\n"));
  });

  app.get("/reports/execution/series", async (req, reply) => {
    const q = req.query as any;
    const year = Number(q.year) || new Date().getFullYear();

    // versión activa por defecto
    let versionId: number | null = q.versionId ? Number(q.versionId) : null;
    if (!versionId) {
      const active = await prisma.budgetVersion.findFirst({ where: { status: "ACTIVE" } });
      versionId = active?.id ?? null;
    }

    // Traer períodos del año en orden
    const periods = await prisma.period.findMany({
      where: { year },
      orderBy: { month: "asc" }
    });

    // Para cada mes: totales de budget (versión), ejecutado (GASTO PROCESADO) y provisiones (signo)
    const series = [];
    for (const p of periods) {
      const budget = versionId
        ? await prisma.budgetAllocation.aggregate({
            where: { versionId, periodId: p.id },
            _sum: { amountLocal: true }
          })
        : { _sum: { amountLocal: 0 } };

      const executed = await prisma.controlLine.aggregate({
        where: { type: "GASTO", state: "PROCESADO", accountingPeriodId: p.id },
        _sum: { amountLocal: true }
      });

      const provisions = await prisma.controlLine.aggregate({
        where: { type: "PROVISION", accountingPeriodId: p.id },
        _sum: { amountLocal: true }
      });

      const b = Number(budget._sum.amountLocal ?? 0);
      const e = Number(executed._sum.amountLocal ?? 0);
      const pr = Number(provisions._sum.amountLocal ?? 0);
      series.push({
        periodId: p.id,
        label: p.label ?? `${p.year}-${String(p.month).padStart(2,"0")}`,
        budget: b,
        executed: e,
        provisions: pr,
        available: b - e - pr
      });
    }

    // Totales YTD
    const totals = series.reduce((acc, r) => ({
      budget: acc.budget + r.budget,
      executed: acc.executed + r.executed,
      provisions: acc.provisions + r.provisions,
      available: acc.available + r.available
    }), { budget: 0, executed: 0, provisions: 0, available: 0 });

    return { year, versionId, series, totals };
  });
}
