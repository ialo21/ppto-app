import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Limpiar datos existentes respetando dependencias
  await prisma.invoiceStatusHistory.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.controlLine.deleteMany();
  await prisma.budgetAllocation.deleteMany();
  await prisma.budgetVersion.deleteMany();
  await prisma.support.deleteMany();
  await prisma.expenseConcept.deleteMany();
  await prisma.expensePackage.deleteMany();
  await prisma.costCenter.deleteMany();
  await prisma.accountingClosure.deleteMany();
  await prisma.fxReference.deleteMany();
  await prisma.period.deleteMany();

  // Periodos 2026
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  for (let m = 1; m <= 12; m++) {
    await prisma.period.create({
      data: { year: 2026, month: m, label: `${months[m - 1]}26` }
    });
  }

  // Tipo de cambio referencial
  await prisma.fxReference.createMany({
    data: [
      { currency: "USD", rate: new Prisma.Decimal(3.75), effectiveFrom: new Date("2026-01-01"), effectiveTo: new Date("2026-06-30") },
      { currency: "USD", rate: new Prisma.Decimal(3.70), effectiveFrom: new Date("2026-07-01"), effectiveTo: null as any }
    ] as any
  });

  // Version de presupuesto activa
  const version = await prisma.budgetVersion.create({
    data: { name: "Original 2026", status: "ACTIVE" }
  });

  // Datos maestros
  const [ccTi, ccMarketing] = await Promise.all([
    prisma.costCenter.create({ data: { code: "CC-TI", name: "TI Corporativo" } }),
    prisma.costCenter.create({ data: { code: "CC-MKT", name: "Marketing" } })
  ]);

  const pkgServicios = await prisma.expensePackage.create({
    data: {
      name: "Servicios Profesionales",
      concepts: {
        create: [{ name: "QA Externo" }, { name: "Consultoria Marketing" }]
      }
    },
    include: { concepts: true }
  });

  const pkgOperacion = await prisma.expensePackage.create({
    data: {
      name: "Operacion TI",
      concepts: {
        create: [{ name: "Licencias SaaS" }, { name: "Servicios Cloud" }]
      }
    },
    include: { concepts: true }
  });

  const conceptQa = pkgServicios.concepts.find(c => c.name === "QA Externo");
  const conceptMarketing = pkgServicios.concepts.find(c => c.name === "Consultoria Marketing");
  const conceptCloud = pkgOperacion.concepts.find(c => c.name === "Servicios Cloud");

  const [supportQa, supportMarketing, supportCloud] = await Promise.all([
    prisma.support.create({
      data: {
        code: "S-0001",
        name: "Servicios Externos QA",
        management: "Gerencia TI",
        area: "Calidad",
        costCenterId: ccTi.id,
        expensePackageId: pkgServicios.id,
        expenseConceptId: conceptQa?.id,
        expenseType: "ADMINISTRATIVO"
      }
    }),
    prisma.support.create({
      data: {
        code: "S-0002",
        name: "Marketing Digital",
        management: "Gerencia Comercial",
        area: "Marketing",
        costCenterId: ccMarketing.id,
        expensePackageId: pkgServicios.id,
        expenseConceptId: conceptMarketing?.id,
        expenseType: "PRODUCTO"
      }
    }),
    prisma.support.create({
      data: {
        code: "S-0003",
        name: "Servicios Cloud",
        management: "Gerencia TI",
        area: "Infraestructura",
        costCenterId: ccTi.id,
        expensePackageId: pkgOperacion.id,
        expenseConceptId: conceptCloud?.id,
        expenseType: "DISTRIBUIBLE"
      }
    })
  ]);

  // Asignaciones de presupuesto (enero 2026)
  const periodEne = await prisma.period.findFirst({ where: { year: 2026, month: 1 } });
  if (periodEne) {
    await prisma.budgetAllocation.createMany({
      data: [
        {
          versionId: version.id,
          supportId: supportQa.id,
          periodId: periodEne.id,
          amountLocal: new Prisma.Decimal(10000),
          currency: "PEN"
        },
        {
          versionId: version.id,
          supportId: supportMarketing.id,
          periodId: periodEne.id,
          amountLocal: new Prisma.Decimal(7500),
          currency: "PEN"
        },
        {
          versionId: version.id,
          supportId: supportCloud.id,
          periodId: periodEne.id,
          amountLocal: new Prisma.Decimal(15000),
          currency: "PEN"
        }
      ]
    });
  }
}

main().finally(() => prisma.$disconnect());
