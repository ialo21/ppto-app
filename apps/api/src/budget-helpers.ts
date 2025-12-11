/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BUDGET HELPERS - Funciones auxiliares para manejo de PPTO y RPPTO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Estas funciones encapsulan la lógica de negocio relacionada con la selección
 * entre presupuesto original (PPTO) y presupuesto revisado (RPPTO).
 * 
 * REGLA DE NEGOCIO PRINCIPAL:
 * - Si existe RPPTO para un año, el sistema usa RPPTO como presupuesto activo
 * - Si NO existe RPPTO, el sistema usa PPTO (comportamiento original)
 * - Ambos tipos se mantienen en BD para referencia histórica
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Tipo de presupuesto: PPTO (original) o RPPTO (revisado)
 */
export type BudgetType = "PPTO" | "RPPTO";

/**
 * Determina si existe RPPTO para un año específico
 * 
 * @param year - Año a consultar
 * @param versionId - ID de versión de presupuesto (opcional, usa ACTIVE si no se especifica)
 * @returns true si existe al menos un registro de RPPTO para ese año
 */
export async function hasRPPTO(year: number, versionId?: number): Promise<boolean> {
  // Si no se especifica versión, usar la versión ACTIVE
  let effectiveVersionId = versionId;
  if (!effectiveVersionId) {
    const activeVersion = await prisma.budgetVersion.findFirst({
      where: { status: "ACTIVE" }
    });
    effectiveVersionId = activeVersion?.id;
  }

  if (!effectiveVersionId) return false;

  // Obtener todos los períodos del año
  const periods = await prisma.period.findMany({
    where: { year },
    select: { id: true }
  });

  if (periods.length === 0) return false;

  const periodIds = periods.map(p => p.id);

  // Verificar si existe algún registro con budgetType='RPPTO' para ese año
  const rppto = await prisma.budgetAllocation.findFirst({
    where: {
      versionId: effectiveVersionId,
      periodId: { in: periodIds },
      budgetType: "RPPTO"
    }
  });

  return rppto !== null;
}

/**
 * Obtiene el tipo de presupuesto a usar para un año
 * 
 * LÓGICA:
 * - Si existe RPPTO para el año → retorna 'RPPTO'
 * - Si NO existe RPPTO → retorna 'PPTO'
 * 
 * @param year - Año a consultar
 * @param versionId - ID de versión de presupuesto (opcional)
 * @returns 'RPPTO' o 'PPTO'
 */
export async function getActiveBudgetType(year: number, versionId?: number): Promise<BudgetType> {
  const hasR = await hasRPPTO(year, versionId);
  return hasR ? "RPPTO" : "PPTO";
}

/**
 * Obtiene el tipo de presupuesto a usar para un conjunto de períodos
 * 
 * @param periodIds - Array de IDs de períodos
 * @param versionId - ID de versión de presupuesto (opcional)
 * @returns 'RPPTO' o 'PPTO'
 */
export async function getActiveBudgetTypeForPeriods(
  periodIds: number[],
  versionId?: number
): Promise<BudgetType> {
  if (periodIds.length === 0) return "PPTO";

  // Obtener el año del primer período (asumimos que todos son del mismo año)
  const period = await prisma.period.findUnique({
    where: { id: periodIds[0] },
    select: { year: true }
  });

  if (!period) return "PPTO";

  return getActiveBudgetType(period.year, versionId);
}

/**
 * Verifica si existe PPTO para un año específico
 * Útil para validaciones antes de eliminar
 * 
 * @param year - Año a consultar
 * @param versionId - ID de versión de presupuesto (opcional)
 * @returns true si existe al menos un registro de PPTO para ese año
 */
export async function hasPPTO(year: number, versionId?: number): Promise<boolean> {
  let effectiveVersionId = versionId;
  if (!effectiveVersionId) {
    const activeVersion = await prisma.budgetVersion.findFirst({
      where: { status: "ACTIVE" }
    });
    effectiveVersionId = activeVersion?.id;
  }

  if (!effectiveVersionId) return false;

  const periods = await prisma.period.findMany({
    where: { year },
    select: { id: true }
  });

  if (periods.length === 0) return false;

  const periodIds = periods.map(p => p.id);

  const ppto = await prisma.budgetAllocation.findFirst({
    where: {
      versionId: effectiveVersionId,
      periodId: { in: periodIds },
      budgetType: "PPTO"
    }
  });

  return ppto !== null;
}

/**
 * Obtiene resumen de ambos tipos de presupuesto para un año
 * Útil para mostrar en UI
 * 
 * @param year - Año a consultar
 * @param versionId - ID de versión de presupuesto (opcional)
 * @returns Objeto con totales de PPTO y RPPTO
 */
export async function getBudgetTypeSummary(year: number, versionId?: number) {
  let effectiveVersionId = versionId;
  if (!effectiveVersionId) {
    const activeVersion = await prisma.budgetVersion.findFirst({
      where: { status: "ACTIVE" }
    });
    effectiveVersionId = activeVersion?.id;
  }

  if (!effectiveVersionId) {
    return { hasPPTO: false, hasRPPTO: false, totalPPTO: 0, totalRPPTO: 0 };
  }

  const periods = await prisma.period.findMany({
    where: { year },
    select: { id: true }
  });

  if (periods.length === 0) {
    return { hasPPTO: false, hasRPPTO: false, totalPPTO: 0, totalRPPTO: 0 };
  }

  const periodIds = periods.map(p => p.id);

  // Totales de PPTO
  const pptoSum = await prisma.budgetAllocation.aggregate({
    where: {
      versionId: effectiveVersionId,
      periodId: { in: periodIds },
      budgetType: "PPTO"
    },
    _sum: { amountLocal: true }
  });

  // Totales de RPPTO
  const rpptoSum = await prisma.budgetAllocation.aggregate({
    where: {
      versionId: effectiveVersionId,
      periodId: { in: periodIds },
      budgetType: "RPPTO"
    },
    _sum: { amountLocal: true }
  });

  const totalPPTO = Number(pptoSum._sum.amountLocal ?? 0);
  const totalRPPTO = Number(rpptoSum._sum.amountLocal ?? 0);

  return {
    hasPPTO: totalPPTO > 0,
    hasRPPTO: totalRPPTO > 0,
    totalPPTO,
    totalRPPTO,
    activeBudgetType: totalRPPTO > 0 ? "RPPTO" : "PPTO"
  };
}
