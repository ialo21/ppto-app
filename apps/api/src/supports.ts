import { FastifyInstance } from "fastify";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
const prisma = new PrismaClient();

const expenseTypeEnum = z.enum(["ADMINISTRATIVO", "PRODUCTO", "DISTRIBUIBLE"]);

const upsertSupportSchema = z.object({
  id: z.number().int().positive().optional(),
  code: z.string().trim().min(1).optional(),
  name: z.string().min(1).trim(),
  // NUEVO: usar IDs en lugar de strings
  managementId: z.number().int().positive().nullable().optional(),
  areaId: z.number().int().positive().nullable().optional(),
  // DEPRECATED: mantener compatibilidad con datos legacy
  management: z.string().trim().nullable().optional(),
  area: z.string().trim().nullable().optional(),
  costCenterId: z.number().int().positive().nullable().optional(),  // DEPRECATED: usar costCenterIds (M:N)
  costCenterIds: z.array(z.number().int().positive()).optional(),  // M:N: array de IDs de CECOs
  expensePackageId: z.number().int().positive().nullable().optional(),
  expenseConceptId: z.number().int().positive().nullable().optional(),
  expenseType: expenseTypeEnum.optional(),
  active: z.boolean().optional()
});

const formatSupportCode = (n: number) => `S-${String(n).padStart(4, "0")}`;

async function nextSupportCode(tx: Prisma.TransactionClient) {
  const maxId = await tx.support.aggregate({ _max: { id: true } });
  return formatSupportCode((maxId._max.id ?? 0) + 1);
}

export async function registerSupportRoutes(app: FastifyInstance) {
  app.get("/supports", async () => prisma.support.findMany({
    orderBy: { name: "asc" },
    include: {
      costCenter: true,  // DEPRECATED: relación 1:N legacy
      costCenters: {  // M:N: múltiples CECOs
        include: { costCenter: true }
      },
      expensePackage: true,
      expenseConcept: true,
      managementRef: true,
      areaRef: { include: { management: true } }
    }
  }));

  app.get("/supports/options", async () => {
    const [costCenters, packages, hierarchy] = await Promise.all([
      prisma.costCenter.findMany({ orderBy: { name: "asc" } }),
      prisma.expensePackage.findMany({
        orderBy: { name: "asc" },
        include: { concepts: { orderBy: { name: "asc" } } }
      }),
      prisma.support.findMany({
        where: { management: { not: null } },
        select: { management: true, area: true }
      })
    ]);

    const map = new Map<string, Set<string>>();
    hierarchy.forEach(item => {
      if (!item.management) return;
      const key = item.management;
      if (!map.has(key)) map.set(key, new Set<string>());
      if (item.area) map.get(key)!.add(item.area);
    });

    const managements = Array.from(map.entries())
      .map(([management, areas]) => ({
        management,
        areas: Array.from(areas).sort((a, b) => a.localeCompare(b))
      }))
      .sort((a, b) => a.management.localeCompare(b.management));

    return { costCenters, packages, managements };
  });

  app.post("/supports", async (req, reply) => {
    const p = upsertSupportSchema.safeParse(req.body);
    if (!p.success) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: p.error.errors.map(err => ({
          path: err.path,
          message: err.message
        }))
      });
    }
    
    const { id, expenseConceptId, expensePackageId, costCenterId, costCenterIds, expenseType, managementId, areaId, management, area, ...rest } = p.data;
    const { code, ...fields } = rest;

    const data: any = {
      ...fields,
      costCenterId: costCenterId ?? null,  // DEPRECATED: mantener por compatibilidad
      expensePackageId: expensePackageId ?? null,
      expenseConceptId: expenseConceptId ?? null,
      expenseType: expenseType ?? undefined,
      // Priorizar IDs sobre strings legacy
      managementId: managementId ?? null,
      areaId: areaId ?? null,
      // Si solo vienen strings legacy (compatibilidad), mantenerlos
      management: managementId != null ? null : (management ?? null),
      area: areaId != null ? null : (area ?? null)
    };

    // Validaciones de relaciones
    if (managementId != null) {
      const mgmt = await prisma.management.findUnique({ where: { id: managementId } });
      if (!mgmt) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["managementId"], message: "Gerencia no encontrada" }]
        });
      }
    }

    if (areaId != null) {
      const areaRecord = await prisma.area.findUnique({ where: { id: areaId } });
      if (!areaRecord) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["areaId"], message: "Área no encontrada" }]
        });
      }
    }

    if (costCenterId != null) {
      const cc = await prisma.costCenter.findUnique({ where: { id: costCenterId } });
      if (!cc) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["costCenterId"], message: "Centro de costo no encontrado" }]
        });
      }
    }

    // Validar costCenterIds (M:N)
    const uniqueCostCenterIds = costCenterIds ? [...new Set(costCenterIds)] : [];
    if (uniqueCostCenterIds.length > 0) {
      const foundCCs = await prisma.costCenter.findMany({
        where: { id: { in: uniqueCostCenterIds } }
      });
      if (foundCCs.length !== uniqueCostCenterIds.length) {
        const foundIds = new Set(foundCCs.map(cc => cc.id));
        const missingIds = uniqueCostCenterIds.filter(id => !foundIds.has(id));
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["costCenterIds"], message: `Centros de costo no encontrados: ${missingIds.join(", ")}` }]
        });
      }
    }

    if (expenseConceptId != null) {
      const concept = await prisma.expenseConcept.findUnique({ where: { id: expenseConceptId } });
      if (!concept) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["expenseConceptId"], message: "Concepto de gasto no encontrado" }]
        });
      }
      data.expenseConceptId = concept.id;
      data.expensePackageId = concept.packageId;
    } else if (expensePackageId != null) {
      const pkg = await prisma.expensePackage.findUnique({ where: { id: expensePackageId } });
      if (!pkg) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: [{ path: ["expensePackageId"], message: "Paquete de gasto no encontrado" }]
        });
      }
      data.expensePackageId = pkg.id;
      data.expenseConceptId = null;
    } else {
      data.expensePackageId = null;
      data.expenseConceptId = null;
    }

    if (data.expenseType === undefined) {
      delete data.expenseType;
    }

    const trimmedCode = code?.trim();
    if (trimmedCode) data.code = trimmedCode;

    try {
      return await prisma.$transaction(async tx => {
        let support: { id: number };
        
        if (id) {
          // Actualizar
          support = await tx.support.update({ where: { id }, data });
          
          // Actualizar asociaciones M:N con CECOs
          if (costCenterIds !== undefined) {
            // Eliminar asociaciones actuales
            await tx.supportCostCenter.deleteMany({ where: { supportId: id } });
            // Crear nuevas asociaciones
            if (uniqueCostCenterIds.length > 0) {
              await tx.supportCostCenter.createMany({
                data: uniqueCostCenterIds.map(ccId => ({ supportId: id, costCenterId: ccId })),
                skipDuplicates: true
              });
            }
          }
        } else {
          // Crear
          const generated = trimmedCode || await nextSupportCode(tx);
          support = await tx.support.create({ 
            data: { ...data, code: generated, expenseType: expenseType ?? "ADMINISTRATIVO" } 
          });
          
          // Crear asociaciones M:N con CECOs
          if (uniqueCostCenterIds.length > 0) {
            await tx.supportCostCenter.createMany({
              data: uniqueCostCenterIds.map(ccId => ({ supportId: support.id, costCenterId: ccId })),
              skipDuplicates: true
            });
          }
        }
        
        // Devolver con relaciones incluidas
        return await tx.support.findUnique({
          where: { id: support.id },
          include: {
            costCenter: true,
            costCenters: { include: { costCenter: true } },
            expensePackage: true,
            expenseConcept: true,
            managementRef: true,
            areaRef: true
          }
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return reply.code(409).send({ error: "Ya existe un sustento con ese nombre o codigo." });
      }
      throw err;
    }
  });

  app.delete("/supports/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    try {
      // Eliminar en cascada: facturas, OCs, asignaciones, líneas de control, vínculos M:N
      await prisma.$transaction(async (tx) => {
        // 1. Obtener IDs de OCs del sustento
        const ocs = await tx.oC.findMany({ where: { supportId: id }, select: { id: true } });
        const ocIds = ocs.map(o => o.id);

        // 2. Obtener IDs de facturas ligadas al sustento (con OC o sin OC pero de un futuro campo supportId)
        const invoices = await tx.invoice.findMany({
          where: {
            OR: [
              { ocId: { in: ocIds } }
              // Agregar { supportId: id } si se implementa supportId directo en Invoice
            ]
          },
          select: { id: true }
        });
        const invoiceIds = invoices.map(inv => inv.id);

        // 3. Eliminar distribuciones de facturas (InvoiceCostCenter, InvoicePeriod, InvoiceStatusHistory)
        if (invoiceIds.length > 0) {
          await tx.invoiceCostCenter.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
          await tx.invoicePeriod.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
          await tx.invoiceStatusHistory.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
          await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
        }

        // 4. Eliminar distribuciones de OCs (OCCostCenter) y OCs
        if (ocIds.length > 0) {
          await tx.oCCostCenter.deleteMany({ where: { ocId: { in: ocIds } } });
          await tx.oC.deleteMany({ where: { id: { in: ocIds } } });
        }

        // 5. Eliminar asignaciones de presupuesto (BudgetAllocation)
        await tx.budgetAllocation.deleteMany({ where: { supportId: id } });

        // 6. Eliminar líneas de control (ControlLine)
        await tx.controlLine.deleteMany({ where: { supportId: id } });

        // 7. Eliminar vínculos M:N (SupportCostCenter)
        await tx.supportCostCenter.deleteMany({ where: { supportId: id } });

        // 8. Eliminar el Support
        await tx.support.delete({ where: { id } });
      });

      return { ok: true };
    } catch (err) {
      // Error de registro no encontrado
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return reply.code(404).send({ error: "Sustento no encontrado" });
      }
      // Otros errores
      console.error("Error al eliminar sustento:", err);
      return reply.code(500).send({ error: "Error interno al eliminar sustento" });
    }
  });
}












