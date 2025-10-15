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
  costCenterId: z.number().int().positive().nullable().optional(),
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
      costCenter: true,
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
    
    const { id, expenseConceptId, expensePackageId, costCenterId, expenseType, managementId, areaId, management, area, ...rest } = p.data;
    const { code, ...fields } = rest;

    const data: any = {
      ...fields,
      costCenterId: costCenterId ?? null,
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
      if (id) {
        return await prisma.support.update({ where: { id }, data });
      } else {
        return await prisma.$transaction(async tx => {
          const generated = trimmedCode || await nextSupportCode(tx);
          return tx.support.create({ data: { ...data, code: generated, expenseType: expenseType ?? "ADMINISTRATIVO" } });
        });
      }
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
      await prisma.support.delete({ where: { id }});
      return { ok: true };
    } catch {
      return reply.code(400).send({ error: "no se pudo eliminar (en uso?)" });
    }
  });
}












