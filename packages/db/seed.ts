import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Bootstrap seed - Idempotente
 * Crea datos mínimos necesarios sin destruir datos existentes.
 * Seguro ejecutar múltiples veces.
 */
async function main() {
  console.log("🌱 Iniciando bootstrap seed (idempotente)...");

  // Periodos 2026 (upsert por year+month)
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  for (let m = 1; m <= 12; m++) {
    await prisma.period.upsert({
      where: { 
        // Prisma requiere unique constraint; usamos findFirst + create condicional
        id: (await prisma.period.findFirst({ where: { year: 2026, month: m } }))?.id || 0
      },
      update: {},
      create: { year: 2026, month: m, label: `${months[m - 1]}26` }
    }).catch(async () => {
      // Si falla upsert (id=0 no existe), verificar si ya existe
      const existing = await prisma.period.findFirst({ where: { year: 2026, month: m } });
      if (!existing) {
        await prisma.period.create({ data: { year: 2026, month: m, label: `${months[m - 1]}26` } });
      }
    });
  }

  // Tipo de cambio referencial (skip si ya existe)
  const fxCount = await prisma.fxReference.count();
  if (fxCount === 0) {
    await prisma.fxReference.createMany({
      data: [
        { currency: "USD", rate: new Prisma.Decimal(3.75), effectiveFrom: new Date("2026-01-01"), effectiveTo: new Date("2026-06-30") },
        { currency: "USD", rate: new Prisma.Decimal(3.70), effectiveFrom: new Date("2026-07-01"), effectiveTo: null as any }
      ] as any
    });
  }

  // Version de presupuesto activa (upsert por nombre)
  let version = await prisma.budgetVersion.findFirst({ where: { name: "Original 2026" } });
  if (!version) {
    version = await prisma.budgetVersion.create({
      data: { name: "Original 2026", status: "ACTIVE" }
    });
  }

  // Gerencias y Áreas (upsert por nombre)
  let gerenciaTI = await prisma.management.findFirst({ 
    where: { name: "Gerencia TI" }, 
    include: { areas: true } 
  });
  if (!gerenciaTI) {
    gerenciaTI = await prisma.management.create({
    data: {
      code: "GER-TI",
      name: "Gerencia TI",
      areas: {
        create: [
          { code: "AREA-TI-CAL", name: "Calidad" },
          { code: "AREA-TI-INF", name: "Infraestructura" },
          { code: "AREA-TI-DEV", name: "Desarrollo" }
        ]
      }
    },
    include: { areas: true }
    });
  }

  let gerenciaComercial = await prisma.management.findFirst({ 
    where: { name: "Gerencia Comercial" }, 
    include: { areas: true } 
  });
  if (!gerenciaComercial) {
    gerenciaComercial = await prisma.management.create({
    data: {
      code: "GER-COM",
      name: "Gerencia Comercial",
      areas: {
        create: [
          { code: "AREA-COM-MKT", name: "Marketing" },
          { code: "AREA-COM-VTA", name: "Ventas" }
        ]
      }
    },
    include: { areas: true }
    });
  }

  const areaCalidad = gerenciaTI.areas.find(a => a.name === "Calidad");
  const areaInfraestructura = gerenciaTI.areas.find(a => a.name === "Infraestructura");
  const areaMarketing = gerenciaComercial.areas.find(a => a.name === "Marketing");

  // Datos maestros (upsert por code único)
  const ccTi = await prisma.costCenter.upsert({
    where: { code: "CC-TI" },
    update: {},
    create: { code: "CC-TI", name: "TI Corporativo" }
  });
  const ccMarketing = await prisma.costCenter.upsert({
    where: { code: "CC-MKT" },
    update: {},
    create: { code: "CC-MKT", name: "Marketing" }
  });

  let pkgServicios = await prisma.expensePackage.findFirst({ 
    where: { name: "Servicios Profesionales" }, 
    include: { concepts: true } 
  });
  if (!pkgServicios) {
    pkgServicios = await prisma.expensePackage.create({
    data: {
      name: "Servicios Profesionales",
      concepts: {
        create: [{ name: "QA Externo" }, { name: "Consultoria Marketing" }]
      }
    },
    include: { concepts: true }
    });
  }

  let pkgOperacion = await prisma.expensePackage.findFirst({ 
    where: { name: "Operacion TI" }, 
    include: { concepts: true } 
  });
  if (!pkgOperacion) {
    pkgOperacion = await prisma.expensePackage.create({
    data: {
      name: "Operacion TI",
      concepts: {
        create: [{ name: "Licencias SaaS" }, { name: "Servicios Cloud" }]
      }
    },
    include: { concepts: true }
    });
  }

  const conceptQa = pkgServicios.concepts.find(c => c.name === "QA Externo");
  const conceptMarketing = pkgServicios.concepts.find(c => c.name === "Consultoria Marketing");
  const conceptCloud = pkgOperacion.concepts.find(c => c.name === "Servicios Cloud");

  // Sustentos (upsert por name único)
  const supportQa = await prisma.support.upsert({
    where: { name: "Servicios Externos QA" },
    update: {},
    create: {
      code: "S-0001",
      name: "Servicios Externos QA",
      management: "Gerencia TI",  // legacy
      area: "Calidad",  // legacy
      managementId: gerenciaTI.id,
      areaId: areaCalidad?.id,
      costCenterId: ccTi.id,
      expensePackageId: pkgServicios.id,
      expenseConceptId: conceptQa?.id,
      expenseType: "ADMINISTRATIVO"
    }
  });
  const supportMarketing = await prisma.support.upsert({
    where: { name: "Marketing Digital" },
    update: {},
    create: {
      code: "S-0002",
      name: "Marketing Digital",
      management: "Gerencia Comercial",  // legacy
      area: "Marketing",  // legacy
      managementId: gerenciaComercial.id,
      areaId: areaMarketing?.id,
      costCenterId: ccMarketing.id,
      expensePackageId: pkgServicios.id,
      expenseConceptId: conceptMarketing?.id,
      expenseType: "PRODUCTO"
    }
  });
  const supportCloud = await prisma.support.upsert({
    where: { name: "Servicios Cloud" },
    update: {},
    create: {
      code: "S-0003",
      name: "Servicios Cloud",
      management: "Gerencia TI",  // legacy
      area: "Infraestructura",  // legacy
      managementId: gerenciaTI.id,
      areaId: areaInfraestructura?.id,
      costCenterId: ccTi.id,
      expensePackageId: pkgOperacion.id,
      expenseConceptId: conceptCloud?.id,
      expenseType: "DISTRIBUIBLE"
    }
  });

  // Asignaciones de presupuesto (enero 2026) - solo si no existen
  const periodEne = await prisma.period.findFirst({ where: { year: 2026, month: 1 } });
  if (periodEne) {
    const allocCount = await prisma.budgetAllocation.count({ 
      where: { versionId: version.id, periodId: periodEne.id } 
    });
    if (allocCount === 0) {
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

  // Artículos (upsert por code único)
  const artServicios = await prisma.articulo.upsert({
    where: { code: "ART-001" },
    update: {},
    create: { code: "ART-001", name: "Servicios Profesionales" }
  });
  const artLicencias = await prisma.articulo.upsert({
    where: { code: "ART-002" },
    update: {},
    create: { code: "ART-002", name: "Licencias de Software" }
  });
  const artHardware = await prisma.articulo.upsert({
    where: { code: "ART-003" },
    update: {},
    create: { code: "ART-003", name: "Hardware y Equipos" }
  });

  // Órdenes de Compra de ejemplo - solo si no existen
  const periodFeb = await prisma.period.findFirst({ where: { year: 2026, month: 2 } });
  if (periodEne && periodFeb) {
    const ocCount = await prisma.oC.count();
    if (ocCount === 0) {
      await prisma.oC.createMany({
      data: [
        {
          budgetPeriodFromId: periodEne.id,
          budgetPeriodToId: periodFeb.id,
          incidenteOc: "INC-2026-001",
          solicitudOc: "SOL-2026-001",
          fechaRegistro: new Date("2026-01-15"),
          supportId: supportQa.id,
          periodoEnFechasText: "Enero - Febrero 2026",
          descripcion: "Contratación de servicios de QA externos para proyecto crítico",
          nombreSolicitante: "Juan Pérez",
          correoSolicitante: "juan.perez@empresa.com",
          proveedor: "QA Solutions SAC",
          ruc: "20123456789",
          moneda: "PEN",
          importeSinIgv: new Prisma.Decimal(8500),
          estado: "PENDIENTE",
          numeroOc: "OC-2026-0001",
          comentario: "Requiere aprobación urgente",
          articuloId: artServicios.id,
          cecoId: ccTi.id,
          linkCotizacion: "https://ejemplo.com/cotizacion/001"
        },
        {
          budgetPeriodFromId: periodEne.id,
          budgetPeriodToId: periodEne.id,
          incidenteOc: "INC-2026-002",
          solicitudOc: "SOL-2026-002",
          fechaRegistro: new Date("2026-01-20"),
          supportId: supportCloud.id,
          periodoEnFechasText: "Enero 2026",
          descripcion: "Renovación de servicios cloud AWS",
          nombreSolicitante: "María García",
          correoSolicitante: "maria.garcia@empresa.com",
          proveedor: "Amazon Web Services",
          ruc: "20987654321",
          moneda: "USD",
          importeSinIgv: new Prisma.Decimal(3200),
          estado: "PROCESADO",
          numeroOc: "OC-2026-0002",
          comentario: null,
          articuloId: artLicencias.id,
          cecoId: ccTi.id,
          linkCotizacion: "https://aws.amazon.com/pricing"
        }
      ]
      });
    }
  }

  console.log("✅ Bootstrap seed completado");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
