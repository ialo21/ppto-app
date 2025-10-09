import { PrismaClient, Prisma } from "@prisma/client";
export const prisma = new PrismaClient();

/**
 * Valida que GASTO(PROCESADO en período contable) + PROVISION (signo) <= PPTO (versión ACTIVE)
 * Si excede, lanza error salvo que allowOverride=true
 */
export async function checkOverspend(opts: {
  supportId: number,
  accountingPeriodId: number,
  deltaLocal: Prisma.Decimal | number,
  allowOverride?: boolean
}) {
  const { supportId, accountingPeriodId } = opts;
  const delta = new Prisma.Decimal(opts.deltaLocal);

  const active = await prisma.budgetVersion.findFirst({ where: { status: "ACTIVE" }});
  if (!active) return; // si no hay versión, no valida (MVP)

  const alloc = await prisma.budgetAllocation.findFirst({
    where: { supportId, periodId: accountingPeriodId, versionId: active.id }
  });
  const budget = new Prisma.Decimal(alloc?.amountLocal ?? 0);

  const gasto = await prisma.controlLine.aggregate({
    _sum: { amountLocal: true },
    where: { type: "GASTO", state: "PROCESADO", accountingPeriodId, supportId }
  });
  const prov = await prisma.controlLine.aggregate({
    _sum: { amountLocal: true },
    where: { type: "PROVISION", accountingPeriodId, supportId }
  });

  const executedNow = new Prisma.Decimal(gasto._sum.amountLocal ?? 0)
    .plus(new Prisma.Decimal(prov._sum.amountLocal ?? 0));

  const newExecuted = executedNow.plus(delta);
  const available = budget.minus(executedNow);

  if (newExecuted.gt(budget) && !opts.allowOverride) {
    throw Object.assign(new Error(`Sobreejecución: disponible ${available.toFixed(2)} < intento ${delta.toFixed(2)}`), { statusCode: 400 });
  }
}
