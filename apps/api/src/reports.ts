import { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { requireAuth, requirePermission } from "./auth";

const prisma = new PrismaClient();

/**
 * /reports/execution?periodId=XX[&versionId=YY]
 * - periodId: mes a reportar (contable)
 * - versionId opcional: si no se pasa, usa la versión ACTIVE
 * Retorna filas por sustento: { supportId, supportName, budget, executed_real, provisions, available }
 */
export async function registerReportRoutes(app: FastifyInstance) {
  app.get("/reports/execution", { preHandler: [requireAuth, requirePermission("reports")] }, async (req, reply) => {
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

  /**
   * GET /reports/dashboard
   * Endpoint mejorado para Dashboard Financiero con soporte completo de filtros
   * 
   * Query params:
   * - year: Año a consultar (default: año actual)
   * - mode: "execution" | "contable" (default: "execution")
   * - versionId: ID de versión de presupuesto (default: versión ACTIVE)
   * - supportId: Filtro por sustento
   * - costCenterId: Filtro por centro de costo
   * - managementId: Filtro por gerencia
   * - areaId: Filtro por área
   * - packageId: Filtro por paquete de gasto
   * 
   * Response:
   * - year, versionId, mode
   * - series: Array de datos mensuales
   * - totals: Totales YTD
   */
  app.get("/reports/dashboard", async (req, reply) => {
    const q = req.query as any;
    const year = Number(q.year) || new Date().getFullYear();
    const mode = q.mode === "contable" ? "contable" : "execution";

    // Versión activa por defecto
    let versionId: number | null = q.versionId ? Number(q.versionId) : null;
    if (!versionId) {
      const active = await prisma.budgetVersion.findFirst({ where: { status: "ACTIVE" } });
      versionId = active?.id ?? null;
    }

    // Filtros opcionales (ahora soportan arrays separados por comas)
    const supportIds = q.supportIds ? q.supportIds.split(',').map((id: string) => Number(id)).filter((id: number) => !isNaN(id)) : [];
    const costCenterIds = q.costCenterIds ? q.costCenterIds.split(',').map((id: string) => Number(id)).filter((id: number) => !isNaN(id)) : [];
    const managementIds = q.managementIds ? q.managementIds.split(',').map((id: string) => Number(id)).filter((id: number) => !isNaN(id)) : [];
    const areaIds = q.areaIds ? q.areaIds.split(',').map((id: string) => Number(id)).filter((id: number) => !isNaN(id)) : [];
    const packageIds = q.packageIds ? q.packageIds.split(',').map((id: string) => Number(id)).filter((id: number) => !isNaN(id)) : [];
    
    // Filtros de rango de períodos (mes desde/hasta)
    const periodFromId = q.periodFromId ? Number(q.periodFromId) : null;
    const periodToId = q.periodToId ? Number(q.periodToId) : null;

    // Traer todos los períodos del año en orden
    const allPeriods = await prisma.period.findMany({
      where: { year },
      orderBy: { month: "asc" }
    });
    
    // Filtrar períodos por rango si se especifica
    let periods = allPeriods;
    if (periodFromId && periodToId) {
      const fromPeriod = allPeriods.find(p => p.id === periodFromId);
      const toPeriod = allPeriods.find(p => p.id === periodToId);
      
      if (fromPeriod && toPeriod) {
        const fromValue = fromPeriod.year * 100 + fromPeriod.month;
        const toValue = toPeriod.year * 100 + toPeriod.month;
        
        periods = allPeriods.filter(p => {
          const pValue = p.year * 100 + p.month;
          return pValue >= fromValue && pValue <= toValue;
        });
      }
    } else if (periodFromId) {
      const fromPeriod = allPeriods.find(p => p.id === periodFromId);
      if (fromPeriod) {
        const fromValue = fromPeriod.year * 100 + fromPeriod.month;
        periods = allPeriods.filter(p => {
          const pValue = p.year * 100 + p.month;
          return pValue >= fromValue;
        });
      }
    } else if (periodToId) {
      const toPeriod = allPeriods.find(p => p.id === periodToId);
      if (toPeriod) {
        const toValue = toPeriod.year * 100 + toPeriod.month;
        periods = allPeriods.filter(p => {
          const pValue = p.year * 100 + p.month;
          return pValue <= toValue;
        });
      }
    }

    const series = [];

    for (const p of periods) {
      // ──────────────────────────────────────────────────────────────
      // PRESUPUESTO con filtros aplicados
      // ──────────────────────────────────────────────────────────────
      const budgetWhere: any = { versionId, periodId: p.id };
      if (costCenterIds.length > 0) budgetWhere.costCenterId = { in: costCenterIds };

      // Filtros que requieren JOIN con support
      let budgetAllocations = versionId
        ? await prisma.budgetAllocation.findMany({
            where: budgetWhere,
            include: { support: true }
          })
        : [];

      // Aplicar filtros de support (ahora con arrays)
      if (supportIds.length > 0 || managementIds.length > 0 || areaIds.length > 0 || packageIds.length > 0) {
        budgetAllocations = budgetAllocations.filter(alloc => {
          if (supportIds.length > 0 && !supportIds.includes(alloc.supportId)) return false;
          if (managementIds.length > 0 && alloc.support?.managementId && !managementIds.includes(alloc.support.managementId)) return false;
          if (areaIds.length > 0 && alloc.support?.areaId && !areaIds.includes(alloc.support.areaId)) return false;
          if (packageIds.length > 0 && alloc.support?.expensePackageId && !packageIds.includes(alloc.support.expensePackageId)) return false;
          return true;
        });
      }

      const budget = budgetAllocations.reduce((sum, alloc) => 
        sum + Number(alloc.amountLocal ?? 0), 0
      );

      // ──────────────────────────────────────────────────────────────
      // EJECUTADO Y PROVISIONES según modo
      // ──────────────────────────────────────────────────────────────
      let executed = 0;
      let provisions = 0;

      if (mode === "execution") {
        // ──────────────────────────────────────────────────────────────
        // Modo Ejecución (OPERATIVO, NO CONTABLE)
        // ──────────────────────────────────────────────────────────────
        // Usa distribución de facturas por períodos PPTO (InvoicePeriod)
        // NO considera provisiones (solo PPTO vs Ejecutado Real)
        // ──────────────────────────────────────────────────────────────
        
        // Traer todas las facturas que tienen este período en su distribución
        let invoices = await prisma.invoice.findMany({
          where: {
            periods: {
              some: { periodId: p.id }
            }
          },
          include: {
            periods: true,
            oc: {
              include: { support: true }
            }
          }
        });

        // Filtrar por support (ahora con arrays)
        invoices = invoices.filter(inv => {
          const support = inv.oc?.support;
          if (!support) return false;
          if (supportIds.length > 0 && !supportIds.includes(support.id)) return false;
          if (managementIds.length > 0 && support.managementId && !managementIds.includes(support.managementId)) return false;
          if (areaIds.length > 0 && support.areaId && !areaIds.includes(support.areaId)) return false;
          if (packageIds.length > 0 && support.expensePackageId && !packageIds.includes(support.expensePackageId)) return false;
          return true;
        });

        // Calcular ejecutado distribuyendo el monto de cada factura entre sus períodos
        executed = invoices.reduce((sum, inv) => {
          // Monto en PEN (usar montoPEN_tcReal si existe, sino montoPEN_tcEstandar)
          const montoPEN = Number(inv.montoPEN_tcReal ?? inv.montoPEN_tcEstandar ?? 0);
          
          // Número de períodos en los que se distribuye esta factura
          const numPeriods = inv.periods.length || 1;
          
          // Monto prorrateado a este período
          const amountThisPeriod = montoPEN / numPeriods;
          
          return sum + amountThisPeriod;
        }, 0);

        // En modo Ejecución NO se consideran provisiones
        provisions = 0;

      } else {
        // Modo Contable: usa mes contable de facturas
        const mesContable = `${p.year}-${String(p.month).padStart(2, "0")}`;

        // Ejecutado contable desde facturas
        const invoicesWhere: any = { mesContable };
        
        let invoices = await prisma.invoice.findMany({
          where: invoicesWhere,
          include: { 
            oc: { 
              include: { support: true } 
            } 
          }
        });

        // Filtros de sustento/área/gerencia/paquete (ahora con arrays)
        invoices = invoices.filter(inv => {
          const support = inv.oc?.support;
          if (!support) return false;
          if (supportIds.length > 0 && !supportIds.includes(support.id)) return false;
          if (managementIds.length > 0 && support.managementId && !managementIds.includes(support.managementId)) return false;
          if (areaIds.length > 0 && support.areaId && !areaIds.includes(support.areaId)) return false;
          if (packageIds.length > 0 && support.expensePackageId && !packageIds.includes(support.expensePackageId)) return false;
          return true;
        });

        executed = invoices.reduce((sum, inv) => 
          sum + Number(inv.montoPEN_tcReal ?? inv.montoPEN_tcEstandar ?? 0), 0
        );

        // Provisiones desde tabla provisions
        const provisionsWhere: any = { periodoContable: mesContable };
        
        let provs = await prisma.provision.findMany({
          where: provisionsWhere,
          include: { sustento: true }
        });

        // Filtros (ahora con arrays)
        provs = provs.filter(prov => {
          const sustento = prov.sustento;
          if (!sustento) return false;
          if (supportIds.length > 0 && !supportIds.includes(sustento.id)) return false;
          if (managementIds.length > 0 && sustento.managementId && !managementIds.includes(sustento.managementId)) return false;
          if (areaIds.length > 0 && sustento.areaId && !areaIds.includes(sustento.areaId)) return false;
          if (packageIds.length > 0 && sustento.expensePackageId && !packageIds.includes(sustento.expensePackageId)) return false;
          return true;
        });

        provisions = provs.reduce((sum, prov) => 
          sum + Number(prov.montoPen ?? 0), 0
        );
      }

      // ──────────────────────────────────────────────────────────────
      // CALCULAR MÉTRICAS
      // ──────────────────────────────────────────────────────────────
      const available = budget - executed - provisions;
      const resultadoContable = executed + provisions; // Para modo contable

      series.push({
        periodId: p.id,
        label: p.label ?? `${p.year}-${String(p.month).padStart(2, "0")}`,
        budget,
        executed,
        provisions,
        available,
        resultadoContable
      });
    }

    // Totales YTD
    const totals = series.reduce((acc, r) => ({
      budget: acc.budget + r.budget,
      executed: acc.executed + r.executed,
      provisions: acc.provisions + r.provisions,
      available: acc.available + r.available,
      resultadoContable: acc.resultadoContable + r.resultadoContable
    }), { 
      budget: 0, 
      executed: 0, 
      provisions: 0, 
      available: 0,
      resultadoContable: 0
    });

    return { 
      year, 
      versionId, 
      mode,
      filters: {
        supportIds,
        costCenterIds,
        managementIds,
        areaIds,
        packageIds,
        periodFromId,
        periodToId
      },
      series, 
      totals 
    };
  });

  /**
   * GET /reports/dashboard/detail
   * Endpoint para obtener datos desglosados por sustento/gerencia para tabla de detalles
   * 
   * Utiliza los mismos parámetros que /reports/dashboard
   * Retorna filas agrupadas por sustento con: sustento, gerencia, área, budget, executed, provisions, diferencia
   */
  app.get("/reports/dashboard/detail", async (req, reply) => {
    const q = req.query as any;
    const year = Number(q.year) || new Date().getFullYear();
    const mode = q.mode === "contable" ? "contable" : "execution";

    // Versión activa por defecto
    let versionId: number | null = q.versionId ? Number(q.versionId) : null;
    if (!versionId) {
      const active = await prisma.budgetVersion.findFirst({ where: { status: "ACTIVE" } });
      versionId = active?.id ?? null;
    }

    // Filtros opcionales (ahora soportan arrays separados por comas)
    const supportIds = q.supportIds ? q.supportIds.split(',').map((id: string) => Number(id)).filter((id: number) => !isNaN(id)) : [];
    const costCenterIds = q.costCenterIds ? q.costCenterIds.split(',').map((id: string) => Number(id)).filter((id: number) => !isNaN(id)) : [];
    const managementIds = q.managementIds ? q.managementIds.split(',').map((id: string) => Number(id)).filter((id: number) => !isNaN(id)) : [];
    const areaIds = q.areaIds ? q.areaIds.split(',').map((id: string) => Number(id)).filter((id: number) => !isNaN(id)) : [];
    const packageIds = q.packageIds ? q.packageIds.split(',').map((id: string) => Number(id)).filter((id: number) => !isNaN(id)) : [];
    const periodFromId = q.periodFromId ? Number(q.periodFromId) : null;
    const periodToId = q.periodToId ? Number(q.periodToId) : null;

    // Traer períodos del año filtrados por rango
    const allPeriods = await prisma.period.findMany({
      where: { year },
      orderBy: { month: "asc" }
    });

    let periods = allPeriods;
    if (periodFromId && periodToId) {
      const fromPeriod = allPeriods.find(p => p.id === periodFromId);
      const toPeriod = allPeriods.find(p => p.id === periodToId);
      
      if (fromPeriod && toPeriod) {
        const fromValue = fromPeriod.year * 100 + fromPeriod.month;
        const toValue = toPeriod.year * 100 + toPeriod.month;
        
        periods = allPeriods.filter(p => {
          const pValue = p.year * 100 + p.month;
          return pValue >= fromValue && pValue <= toValue;
        });
      }
    } else if (periodFromId) {
      const fromPeriod = allPeriods.find(p => p.id === periodFromId);
      if (fromPeriod) {
        const fromValue = fromPeriod.year * 100 + fromPeriod.month;
        periods = allPeriods.filter(p => {
          const pValue = p.year * 100 + p.month;
          return pValue >= fromValue;
        });
      }
    } else if (periodToId) {
      const toPeriod = allPeriods.find(p => p.id === periodToId);
      if (toPeriod) {
        const toValue = toPeriod.year * 100 + toPeriod.month;
        periods = allPeriods.filter(p => {
          const pValue = p.year * 100 + p.month;
          return pValue <= toValue;
        });
      }
    }

    const periodIds = periods.map(p => p.id);

    // Map para acumular datos por sustento
    const supportDataMap = new Map<number, {
      supportId: number;
      supportCode: string;
      supportName: string;
      managementName: string;
      areaName: string;
      budget: number;
      executed: number;
      provisions: number;
    }>();

    // ──────────────────────────────────────────────────────────────
    // 1. PRESUPUESTO con filtros aplicados
    // ──────────────────────────────────────────────────────────────
    const budgetWhere: any = { versionId, periodId: { in: periodIds } };
    if (costCenterIds.length > 0) budgetWhere.costCenterId = { in: costCenterIds };

    let budgetAllocations = versionId
      ? await prisma.budgetAllocation.findMany({
          where: budgetWhere,
          include: { 
            support: {
              include: {
                managementRef: true,
                areaRef: true
              }
            }
          }
        })
      : [];

    // Aplicar filtros de support (ahora con arrays)
    if (supportIds.length > 0 || managementIds.length > 0 || areaIds.length > 0 || packageIds.length > 0) {
      budgetAllocations = budgetAllocations.filter(alloc => {
        if (supportIds.length > 0 && !supportIds.includes(alloc.supportId)) return false;
        if (managementIds.length > 0 && alloc.support?.managementId && !managementIds.includes(alloc.support.managementId)) return false;
        if (areaIds.length > 0 && alloc.support?.areaId && !areaIds.includes(alloc.support.areaId)) return false;
        if (packageIds.length > 0 && alloc.support?.expensePackageId && !packageIds.includes(alloc.support.expensePackageId)) return false;
        return true;
      });
    }

    // Acumular presupuesto por sustento
    budgetAllocations.forEach(alloc => {
      const sid = alloc.supportId;
      if (!supportDataMap.has(sid)) {
        supportDataMap.set(sid, {
          supportId: sid,
          supportCode: alloc.support?.code || "",
          supportName: alloc.support?.name || `S-${sid}`,
          managementName: alloc.support?.managementRef?.name || "",
          areaName: alloc.support?.areaRef?.name || "",
          budget: 0,
          executed: 0,
          provisions: 0
        });
      }
      const data = supportDataMap.get(sid)!;
      data.budget += Number(alloc.amountLocal ?? 0);
    });

    // ──────────────────────────────────────────────────────────────
    // 2. EJECUTADO Y PROVISIONES según modo
    // ──────────────────────────────────────────────────────────────
    if (mode === "execution") {
      // Modo Ejecución: facturas por distribución de períodos PPTO
      let invoices = await prisma.invoice.findMany({
        where: {
          periods: {
            some: { periodId: { in: periodIds } }
          }
        },
        include: {
          periods: true,
          oc: {
            include: { 
              support: {
                include: {
                  managementRef: true,
                  areaRef: true
                }
              } 
            }
          }
        }
      });

      // Filtrar por support (ahora con arrays)
      invoices = invoices.filter(inv => {
        const support = inv.oc?.support;
        if (!support) return false;
        if (supportIds.length > 0 && !supportIds.includes(support.id)) return false;
        if (managementIds.length > 0 && support.managementId && !managementIds.includes(support.managementId)) return false;
        if (areaIds.length > 0 && support.areaId && !areaIds.includes(support.areaId)) return false;
        if (packageIds.length > 0 && support.expensePackageId && !packageIds.includes(support.expensePackageId)) return false;
        return true;
      });

      // Acumular ejecutado por sustento
      invoices.forEach(inv => {
        const support = inv.oc?.support;
        if (!support) return;

        const sid = support.id;
        const montoPEN = Number(inv.montoPEN_tcReal ?? inv.montoPEN_tcEstandar ?? 0);
        
        // Contar cuántos períodos de esta factura están en el rango filtrado
        const relevantPeriods = inv.periods.filter(p => periodIds.includes(p.periodId));
        const numPeriods = inv.periods.length || 1;
        const numRelevantPeriods = relevantPeriods.length;
        
        // Prorratear el monto: solo consideramos la parte que cae en el rango
        const amountForRange = (montoPEN / numPeriods) * numRelevantPeriods;

        if (!supportDataMap.has(sid)) {
          supportDataMap.set(sid, {
            supportId: sid,
            supportCode: support.code || "",
            supportName: support.name || `S-${sid}`,
            managementName: support.managementRef?.name || "",
            areaName: support.areaRef?.name || "",
            budget: 0,
            executed: 0,
            provisions: 0
          });
        }
        const data = supportDataMap.get(sid)!;
        data.executed += amountForRange;
      });

      // En modo Ejecución NO se consideran provisiones

    } else {
      // Modo Contable: facturas y provisiones por mes contable
      const mesContableList = periods.map(p => `${p.year}-${String(p.month).padStart(2, "0")}`);

      // Ejecutado contable desde facturas
      let invoices = await prisma.invoice.findMany({
        where: {
          mesContable: { in: mesContableList }
        },
        include: { 
          oc: { 
            include: { 
              support: {
                include: {
                  managementRef: true,
                  areaRef: true
                }
              } 
            } 
          } 
        }
      });

      // Filtros de sustento/área/gerencia/paquete (ahora con arrays)
      invoices = invoices.filter(inv => {
        const support = inv.oc?.support;
        if (!support) return false;
        if (supportIds.length > 0 && !supportIds.includes(support.id)) return false;
        if (managementIds.length > 0 && support.managementId && !managementIds.includes(support.managementId)) return false;
        if (areaIds.length > 0 && support.areaId && !areaIds.includes(support.areaId)) return false;
        if (packageIds.length > 0 && support.expensePackageId && !packageIds.includes(support.expensePackageId)) return false;
        return true;
      });

      // Acumular ejecutado contable por sustento
      invoices.forEach(inv => {
        const support = inv.oc?.support;
        if (!support) return;

        const sid = support.id;
        const montoPEN = Number(inv.montoPEN_tcReal ?? inv.montoPEN_tcEstandar ?? 0);

        if (!supportDataMap.has(sid)) {
          supportDataMap.set(sid, {
            supportId: sid,
            supportCode: support.code || "",
            supportName: support.name || `S-${sid}`,
            managementName: support.managementRef?.name || "",
            areaName: support.areaRef?.name || "",
            budget: 0,
            executed: 0,
            provisions: 0
          });
        }
        const data = supportDataMap.get(sid)!;
        data.executed += montoPEN;
      });

      // Provisiones desde tabla provisions
      let provs = await prisma.provision.findMany({
        where: {
          periodoContable: { in: mesContableList }
        },
        include: { 
          sustento: {
            include: {
              managementRef: true,
              areaRef: true
            }
          } 
        }
      });

      // Filtros (ahora con arrays)
      provs = provs.filter(prov => {
        const sustento = prov.sustento;
        if (!sustento) return false;
        if (supportIds.length > 0 && !supportIds.includes(sustento.id)) return false;
        if (managementIds.length > 0 && sustento.managementId && !managementIds.includes(sustento.managementId)) return false;
        if (areaIds.length > 0 && sustento.areaId && !areaIds.includes(sustento.areaId)) return false;
        if (packageIds.length > 0 && sustento.expensePackageId && !packageIds.includes(sustento.expensePackageId)) return false;
        return true;
      });

      // Acumular provisiones por sustento
      provs.forEach(prov => {
        const sustento = prov.sustento;
        if (!sustento) return;

        const sid = sustento.id;
        const montoPen = Number(prov.montoPen ?? 0);

        if (!supportDataMap.has(sid)) {
          supportDataMap.set(sid, {
            supportId: sid,
            supportCode: sustento.code || "",
            supportName: sustento.name || `S-${sid}`,
            managementName: sustento.managementRef?.name || "",
            areaName: sustento.areaRef?.name || "",
            budget: 0,
            executed: 0,
            provisions: 0
          });
        }
        const data = supportDataMap.get(sid)!;
        data.provisions += montoPen;
      });
    }

    // ──────────────────────────────────────────────────────────────
    // 3. CONSTRUIR RESULTADO
    // ──────────────────────────────────────────────────────────────
    const rows = Array.from(supportDataMap.values()).map(data => {
      const diferencia = data.budget - data.executed - data.provisions;
      return {
        supportId: data.supportId,
        supportCode: data.supportCode,
        supportName: data.supportName,
        managementName: data.managementName,
        areaName: data.areaName,
        budget: data.budget,
        executed: data.executed,
        provisions: data.provisions,
        diferencia
      };
    });

    // Ordenar por nombre de sustento
    rows.sort((a, b) => {
      if (a.managementName !== b.managementName) {
        return a.managementName.localeCompare(b.managementName);
      }
      return a.supportName.localeCompare(b.supportName);
    });

    // Totales
    const totals = rows.reduce((acc, r) => ({
      budget: acc.budget + r.budget,
      executed: acc.executed + r.executed,
      provisions: acc.provisions + r.provisions,
      diferencia: acc.diferencia + r.diferencia
    }), { budget: 0, executed: 0, provisions: 0, diferencia: 0 });

    return { 
      year, 
      versionId, 
      mode,
      rows, 
      totals 
    };
  });
}
