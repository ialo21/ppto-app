import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Periodos 2026
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  for (let m=1; m<=12; m++) {
    await prisma.period.create({
      data: { year: 2026, month: m, label: `${months[m-1]}26` }
    });
  }

  // TC referencial: USD 3.75 hasta 30/06 y 3.70 desde 01/07; PEN=1 implícito
  await prisma.fxReference.createMany({
    data: [
      { currency: "USD", rate: new Prisma.Decimal(3.75), effectiveFrom: new Date("2026-01-01"), effectiveTo: new Date("2026-06-30") },
      { currency: "USD", rate: new Prisma.Decimal(3.70), effectiveFrom: new Date("2026-07-01"), effectiveTo: null as any }
    ] as any
  });

  // Versión de presupuesto activa
  const v = await prisma.budgetVersion.create({
    data: { name: "Original 2026", status: "ACTIVE" }
  });

  // Un sustento de ejemplo
  const s = await prisma.support.create({
    data: { code: "S-0001", name: "Servicios Externos QA" }
  });

  // Asignación PPTO ene 2026
  const pEne = await prisma.period.findFirst({ where: { year: 2026, month: 1 }});
  if (pEne) {
    await prisma.budgetAllocation.create({
      data: {
        versionId: v.id,
        supportId: s.id,
        periodId: pEne.id,
        amountLocal: new Prisma.Decimal(10000),
        currency: "PEN"
      }
    });
  }
}

main().finally(() => prisma.$disconnect());
