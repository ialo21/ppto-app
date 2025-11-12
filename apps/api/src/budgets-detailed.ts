import { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { ensureYearPeriods } from "./periods";

const prisma = new PrismaClient();

// Schema for listing detailed budget allocations
const listDetailedSchema = z.object({
  periodId: z.coerce.number(),
  year: z.coerce.number().optional(), // Optional: to auto-create periods for year
  versionId: z.coerce.number().optional(),
  search: z.string().optional(),
  managementId: z.coerce.number().optional(),
  areaId: z.coerce.number().optional(),
  packageId: z.coerce.number().optional(),
  conceptId: z.coerce.number().optional()
});

// Schema for batch upsert of detailed allocations
const batchUpsertSchema = z.object({
  versionId: z.number().optional(),
  periodId: z.number(),
  items: z.array(z.object({
    supportId: z.number(),
    costCenterId: z.number(),
    amountPen: z.number().min(0)
  }))
});

export async function registerDetailedBudgetRoutes(app: FastifyInstance) {
  /**
   * GET /budgets/detailed?periodId=X[&versionId=Y][&search=text]
   * Returns all possible (support, costCenter) combinations for a period
   * with current budget allocation amounts (0 if not set)
   */
  app.get("/budgets/detailed", async (req, reply) => {
    const q = listDetailedSchema.safeParse(req.query);
    if (!q.success) return reply.code(400).send(q.error);
    
    const { periodId, year, search, managementId, areaId, packageId, conceptId } = q.data;
    let versionId = q.data.versionId;
    
    // Ensure year periods exist if year param provided
    if (year) {
      await ensureYearPeriods(year);
    }
    
    // Get active version if not specified
    if (!versionId) {
      const v = await prisma.budgetVersion.findFirst({ where: { status: "ACTIVE" } });
      if (!v) return reply.code(400).send({ error: "No hay versión ACTIVE" });
      versionId = v.id;
    }

    // Get period info to check if closed
    const period = await prisma.period.findUnique({
      where: { id: periodId },
      include: { closures: true }
    });
    
    if (!period) return reply.code(404).send({ error: "Período no encontrado" });
    
    const isClosed = !!period.closures;

    // Build where clause with filters
    const whereClause: any = { active: true };
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } }
      ];
    }
    
    if (managementId) whereClause.managementId = managementId;
    if (areaId) whereClause.areaId = areaId;
    if (packageId) whereClause.expensePackageId = packageId;
    if (conceptId) whereClause.expenseConceptId = conceptId;

    // Get all supports with their related cost centers (M:N)
    const supportsWithCostCenters = await prisma.support.findMany({
      where: whereClause,
      include: {
        costCenters: {
          include: {
            costCenter: true
          }
        },
        managementRef: true,
        areaRef: true,
        expensePackage: true,
        expenseConcept: true
      },
      orderBy: { name: "asc" }
    });

    // Get existing budget allocations for this period
    const existingAllocations = await prisma.budgetAllocation.findMany({
      where: {
        versionId,
        periodId,
        costCenterId: { not: null }
      }
    });

    // Create a map for quick lookup: "supportId-costCenterId" -> amount
    const allocationMap = new Map<string, Prisma.Decimal>();
    existingAllocations.forEach(alloc => {
      if (alloc.costCenterId) {
        const key = `${alloc.supportId}-${alloc.costCenterId}`;
        allocationMap.set(key, alloc.amountLocal);
      }
    });

    // Build the result: one row per (support, costCenter) combination
    const rows: any[] = [];
    const supportsWithoutCostCenters: any[] = [];

    supportsWithCostCenters.forEach(support => {
      if (support.costCenters.length === 0) {
        // Track supports without cost centers
        supportsWithoutCostCenters.push({
          supportId: support.id,
          supportCode: support.code,
          supportName: support.name,
          management: support.managementRef?.name,
          area: support.areaRef?.name
        });
      } else {
        support.costCenters.forEach(scc => {
          const key = `${support.id}-${scc.costCenter.id}`;
          const amount = allocationMap.get(key) || new Prisma.Decimal(0);
          
          // Apply search filter for cost center if provided
          if (search) {
            const ccMatches = 
              scc.costCenter.code?.toLowerCase().includes(search.toLowerCase()) ||
              scc.costCenter.name?.toLowerCase().includes(search.toLowerCase());
            
            if (!ccMatches) return; // skip this row if doesn't match
          }
          
          rows.push({
            supportId: support.id,
            supportCode: support.code,
            supportName: support.name,
            costCenterId: scc.costCenter.id,
            costCenterCode: scc.costCenter.code,
            costCenterName: scc.costCenter.name,
            amountPen: Number(amount),
            management: support.managementRef?.name,
            area: support.areaRef?.name
          });
        });
      }
    });

    return {
      versionId,
      periodId,
      period: {
        year: period.year,
        month: period.month,
        label: period.label
      },
      isClosed,
      rows,
      supportsWithoutCostCenters
    };
  });

  /**
   * PUT /budgets/detailed/batch
   * Batch upsert of budget allocations by (support, costCenter, period)
   * Uses transaction for atomicity
   */
  app.put("/budgets/detailed/batch", async (req, reply) => {
    const p = batchUpsertSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send(p.error);
    
    let { versionId, periodId, items } = p.data;
    
    // Get active version if not specified
    if (!versionId) {
      const v = await prisma.budgetVersion.findFirst({ where: { status: "ACTIVE" } });
      if (!v) return reply.code(400).send({ error: "No hay versión ACTIVE" });
      versionId = v.id;
    }

    // Check if period is closed
    const closure = await prisma.accountingClosure.findUnique({
      where: { periodId }
    });
    
    if (closure) {
      return reply.code(400).send({ 
        error: "El período está cerrado y no puede ser modificado" 
      });
    }

    // Validate that all cost centers exist
    const costCenterIds = [...new Set(items.map(i => i.costCenterId))];
    const costCenters = await prisma.costCenter.findMany({
      where: { id: { in: costCenterIds } }
    });
    
    if (costCenters.length !== costCenterIds.length) {
      return reply.code(400).send({ error: "Algunos centros de costo no existen" });
    }

    // Validate that all supports exist
    const supportIds = [...new Set(items.map(i => i.supportId))];
    const supports = await prisma.support.findMany({
      where: { id: { in: supportIds } }
    });
    
    if (supports.length !== supportIds.length) {
      return reply.code(400).send({ error: "Algunos sustentos no existen" });
    }

    // Perform batch upsert in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const out = [];
      
      for (const it of items) {
        const row = await tx.budgetAllocation.upsert({
          where: {
            ux_alloc_version_period_support_ceco: {
              versionId,
              periodId,
              supportId: it.supportId,
              costCenterId: it.costCenterId
            }
          },
          update: { 
            amountLocal: new Prisma.Decimal(it.amountPen)
          },
          create: {
            versionId,
            periodId,
            supportId: it.supportId,
            costCenterId: it.costCenterId,
            amountLocal: new Prisma.Decimal(it.amountPen),
            currency: "PEN"
          }
        });
        out.push(row);
      }
      
      return out;
    });

    return { 
      success: true,
      count: result.length,
      rows: result 
    };
  });

  /**
   * GET /budgets/annual?year=YYYY[&filters...]
   * Returns matrix view with all months for a year
   */
  app.get("/budgets/annual", async (req, reply) => {
    const year = Number((req.query as any).year);
    const search = (req.query as any).search;
    const managementId = (req.query as any).managementId ? Number((req.query as any).managementId) : undefined;
    const areaId = (req.query as any).areaId ? Number((req.query as any).areaId) : undefined;
    const packageId = (req.query as any).packageId ? Number((req.query as any).packageId) : undefined;
    const conceptId = (req.query as any).conceptId ? Number((req.query as any).conceptId) : undefined;

    if (!year) return reply.code(400).send({ error: "year es requerido" });

    // Ensure all 12 periods exist for the year
    await ensureYearPeriods(year);

    // Get active version
    const version = await prisma.budgetVersion.findFirst({ where: { status: "ACTIVE" } });
    if (!version) return reply.code(400).send({ error: "No hay versión ACTIVE" });

    // Get all periods for the year
    const periods = await prisma.period.findMany({
      where: { year },
      include: { closures: true },
      orderBy: { month: "asc" }
    });

    // Build filters
    const whereClause: any = { active: true };
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } }
      ];
    }
    if (managementId) whereClause.managementId = managementId;
    if (areaId) whereClause.areaId = areaId;
    if (packageId) whereClause.expensePackageId = packageId;
    if (conceptId) whereClause.expenseConceptId = conceptId;

    // Get supports with cost centers
    const supports = await prisma.support.findMany({
      where: whereClause,
      include: {
        costCenters: {
          include: {
            costCenter: true
          }
        },
        managementRef: true,
        areaRef: true
      },
      orderBy: { name: "asc" }
    });

    // Get all allocations for the year
    const periodIds = periods.map(p => p.id);
    const allocations = await prisma.budgetAllocation.findMany({
      where: {
        versionId: version.id,
        periodId: { in: periodIds },
        costCenterId: { not: null }
      }
    });

    // Build lookup map: "supportId-costCenterId-periodId" -> amount
    const allocationMap = new Map<string, number>();
    allocations.forEach(alloc => {
      if (alloc.costCenterId) {
        const key = `${alloc.supportId}-${alloc.costCenterId}-${alloc.periodId}`;
        allocationMap.set(key, Number(alloc.amountLocal));
      }
    });

    // Build rows
    const rows: any[] = [];
    const monthTotals: Record<string, number> = {};
    let yearTotal = 0;

    // Initialize month totals
    for (let month = 1; month <= 12; month++) {
      monthTotals[String(month).padStart(2, "0")] = 0;
    }

    supports.forEach(support => {
      if (support.costCenters.length === 0) return; // Skip supports without cost centers

      support.costCenters.forEach(scc => {
        const months: Record<string, any> = {};
        let totalRow = 0;

        periods.forEach(period => {
          const key = `${support.id}-${scc.costCenter.id}-${period.id}`;
          const amount = allocationMap.get(key) || 0;
          const monthKey = String(period.month).padStart(2, "0");

          months[monthKey] = {
            periodId: period.id,
            isClosed: !!period.closures,
            amountPen: amount
          };

          totalRow += amount;
          monthTotals[monthKey] += amount;
          yearTotal += amount;
        });

        rows.push({
          supportId: support.id,
          supportName: support.name,
          supportCode: support.code,
          costCenterId: scc.costCenter.id,
          costCenterCode: scc.costCenter.code,
          costCenterName: scc.costCenter.name,
          managementName: support.managementRef?.name,
          areaName: support.areaRef?.name,
          months,
          totalYear: totalRow
        });
      });
    });

    return {
      versionId: version.id,
      year,
      rows,
      monthTotals,
      yearTotal
    };
  });

  /**
   * PUT /budgets/annual/batch
   * Batch upsert for annual matrix
   */
  app.put("/budgets/annual/batch", async (req, reply) => {
    const changes = (req.body as any).changes;

    if (!Array.isArray(changes)) {
      return reply.code(400).send({ error: "changes debe ser un array" });
    }

    // Get active version
    const version = await prisma.budgetVersion.findFirst({ where: { status: "ACTIVE" } });
    if (!version) return reply.code(400).send({ error: "No hay versión ACTIVE" });

    // Check if periods are closed
    const periodIds = [...new Set(changes.map((c: any) => c.periodId))];
    const closures = await prisma.accountingClosure.findMany({
      where: { periodId: { in: periodIds } }
    });

    const closedPeriods = new Set(closures.map(c => c.periodId));

    // Filter out closed periods
    const validChanges = changes.filter((c: any) => !closedPeriods.has(c.periodId));

    if (validChanges.length === 0) {
      return reply.code(400).send({ error: "Todos los períodos están cerrados" });
    }

    // Perform batch upsert
    const result = await prisma.$transaction(async (tx) => {
      const out = [];

      for (const change of validChanges) {
        const row = await tx.budgetAllocation.upsert({
          where: {
            ux_alloc_version_period_support_ceco: {
              versionId: version.id,
              periodId: change.periodId,
              supportId: change.supportId,
              costCenterId: change.costCenterId
            }
          },
          update: {
            amountLocal: new Prisma.Decimal(change.amountPen)
          },
          create: {
            versionId: version.id,
            periodId: change.periodId,
            supportId: change.supportId,
            costCenterId: change.costCenterId,
            amountLocal: new Prisma.Decimal(change.amountPen),
            currency: "PEN"
          }
        });
        out.push(row);
      }

      return out;
    });

    return {
      success: true,
      count: result.length,
      skipped: changes.length - validChanges.length
    };
  });
}

