import { PrismaClient, Prisma, OcStatus } from "@prisma/client";

// Declaración para evitar error de TypeScript con process.exit
declare const process: { exit: (code: number) => never };

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

  // Gerencias y Áreas (skip si ya existen por nombre case-insensitive)
  let gerenciaTI = await prisma.management.findFirst({ 
    where: { 
      name: { 
        equals: "Gerencia TI", 
        mode: 'insensitive' 
      } 
    }, 
    include: { areas: true } 
  });
  if (!gerenciaTI) {
    try {
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
    } catch (e) {
      // Si falla por duplicado, obtener el existente
      gerenciaTI = await prisma.management.findFirst({ 
        where: { 
          name: { 
            equals: "Gerencia TI", 
            mode: 'insensitive' 
          } 
        }, 
        include: { areas: true } 
      });
    }
  }

  let gerenciaComercial = await prisma.management.findFirst({ 
    where: { 
      name: { 
        equals: "Gerencia Comercial", 
        mode: 'insensitive' 
      } 
    }, 
    include: { areas: true } 
  });
  if (!gerenciaComercial) {
    try {
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
    } catch (e) {
      // Si falla por duplicado, obtener el existente
      gerenciaComercial = await prisma.management.findFirst({ 
        where: { 
          name: { 
            equals: "Gerencia Comercial", 
            mode: 'insensitive' 
          } 
        }, 
        include: { areas: true } 
      });
    }
  }

  const areaCalidad = gerenciaTI?.areas.find(a => a.name === "Calidad");
  const areaInfraestructura = gerenciaTI?.areas.find(a => a.name === "Infraestructura");
  const areaMarketing = gerenciaComercial?.areas.find(a => a.name === "Marketing");

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

  // Sustentos (upsert por name único) - solo si existen las gerencias
  let supportQa, supportMarketing, supportCloud;
  
  if (gerenciaTI) {
    supportQa = await prisma.support.upsert({
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
    
    supportCloud = await prisma.support.upsert({
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
  }
  
  if (gerenciaComercial) {
    supportMarketing = await prisma.support.upsert({
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
  }

  // Asignaciones de presupuesto (enero 2026) - solo si no existen y los sustentos fueron creados
  const periodEne = await prisma.period.findFirst({ where: { year: 2026, month: 1 } });
  if (periodEne && (supportQa || supportMarketing || supportCloud)) {
    const allocCount = await prisma.budgetAllocation.count({ 
      where: { versionId: version.id, periodId: periodEne.id } 
    });
    if (allocCount === 0) {
      const allocData = [];
      if (supportQa) {
        allocData.push({
          versionId: version.id,
          supportId: supportQa.id,
          periodId: periodEne.id,
          amountLocal: new Prisma.Decimal(10000),
          currency: "PEN"
        });
      }
      if (supportMarketing) {
        allocData.push({
          versionId: version.id,
          supportId: supportMarketing.id,
          periodId: periodEne.id,
          amountLocal: new Prisma.Decimal(7500),
          currency: "PEN"
        });
      }
      if (supportCloud) {
        allocData.push({
          versionId: version.id,
          supportId: supportCloud.id,
          periodId: periodEne.id,
          amountLocal: new Prisma.Decimal(15000),
          currency: "PEN"
        });
      }
      if (allocData.length > 0) {
        await prisma.budgetAllocation.createMany({ data: allocData });
      }
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

  // Órdenes de Compra de ejemplo - solo si no existen y los sustentos fueron creados
  const periodFeb = await prisma.period.findFirst({ where: { year: 2026, month: 2 } });
  if (periodEne && periodFeb && (supportQa || supportCloud)) {
    const ocCount = await prisma.oC.count();
    if (ocCount === 0) {
      const ocData = [];
      if (supportQa) {
        ocData.push({
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
          estado: OcStatus.PENDIENTE,
          numeroOc: "OC-2026-0001",
          comentario: "Requiere aprobación urgente",
          articuloId: artServicios.id,
          cecoId: ccTi.id,
          linkCotizacion: "https://ejemplo.com/cotizacion/001"
        });
      }
      if (supportCloud) {
        ocData.push({
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
          estado: OcStatus.PROCESADO,
          numeroOc: "OC-2026-0002",
          comentario: null,
          articuloId: artLicencias.id,
          cecoId: ccTi.id,
          linkCotizacion: "https://aws.amazon.com/pricing"
        });
      }
      if (ocData.length > 0) {
        await prisma.oC.createMany({ data: ocData });
      }
    }
  }

  // ============ AUTENTICACIÓN Y ROLES ============
  
  // Crear permisos para todas las páginas/módulos
  // Estructura jerárquica: módulos principales y submódulos
  // - module: agrupa permisos en la UI (ej: todos los de OC tienen module='ocs')
  // - parentKey: indica el permiso padre (ej: 'ocs:listado' tiene parentKey='ocs')
  // - sortOrder: orden de visualización en la UI
  const permissions = [
    // Módulos principales (sin padre)
    { key: "dashboard", name: "Dashboard", description: "Vista principal con métricas y estadísticas", module: null, parentKey: null, sortOrder: 1 },
    { key: "assistant", name: "Asistente", description: "Asistente IA para consultas", module: null, parentKey: null, sortOrder: 2 },
    { key: "reports", name: "Reportes", description: "Reportes y análisis de datos", module: null, parentKey: null, sortOrder: 3 },
    { key: "facturas", name: "Facturas", description: "Gestión de facturas", module: null, parentKey: null, sortOrder: 4 },
    
    // Órdenes de Compra - Módulo padre (acceso global)
    { key: "ocs", name: "Órdenes de Compra", description: "Acceso completo a todos los submódulos de OC", module: "ocs", parentKey: null, sortOrder: 5 },
    // Órdenes de Compra - Submódulos
    { key: "ocs:listado", name: "OC - Listado", description: "Vista de consulta de órdenes de compra", module: "ocs", parentKey: "ocs", sortOrder: 1 },
    { key: "ocs:gestion", name: "OC - Gestión", description: "Registro y administración de órdenes de compra", module: "ocs", parentKey: "ocs", sortOrder: 2 },
    { key: "ocs:solicitud", name: "OC - Solicitud", description: "Solicitud de nuevas órdenes de compra", module: "ocs", parentKey: "ocs", sortOrder: 3 },
    
    // Facturas - Submódulos (ahora con estructura jerárquica)
    { key: "facturas:listado", name: "Facturas - Listado", description: "Vista de consulta de facturas", module: "facturas", parentKey: "facturas", sortOrder: 1 },
    { key: "facturas:gestion", name: "Facturas - Gestión", description: "Registro y administración de facturas", module: "facturas", parentKey: "facturas", sortOrder: 2 },
    
    // Aprobaciones - Módulo padre
    { key: "aprobaciones", name: "Aprobaciones", description: "Módulo de aprobaciones de facturas y OCs", module: null, parentKey: null, sortOrder: 5 },
    // Aprobaciones - Submódulos Facturas
    { key: "aprobaciones:facturas_head", name: "Aprobación Facturas - Head", description: "Aprobación de facturas nivel Head", module: "aprobaciones", parentKey: "aprobaciones", sortOrder: 1 },
    { key: "aprobaciones:facturas_vp", name: "Aprobación Facturas - VP", description: "Aprobación de facturas nivel VP (montos altos)", module: "aprobaciones", parentKey: "aprobaciones", sortOrder: 2 },
    // Aprobaciones - Submódulos OCs
    { key: "aprobaciones:ocs_vp", name: "Aprobación OCs - VP", description: "Aprobación de órdenes de compra nivel VP", module: "aprobaciones", parentKey: "aprobaciones", sortOrder: 3 },
    
    // Otros módulos principales
    { key: "provisiones", name: "Provisiones", description: "Gestión de provisiones", module: null, parentKey: null, sortOrder: 8 },
    { key: "ppto", name: "Presupuesto", description: "Gestión del presupuesto", module: null, parentKey: null, sortOrder: 9 },
    { key: "catalogos", name: "Catálogos", description: "Administración de catálogos maestros", module: null, parentKey: null, sortOrder: 10 },
    { key: "manage_roles", name: "Gestión de Roles", description: "Administrar roles y permisos (solo super admin)", module: null, parentKey: null, sortOrder: 99 }
  ];

  const createdPermissions = [];
  for (const perm of permissions) {
    const created = await prisma.permission.upsert({
      where: { key: perm.key },
      update: {
        name: perm.name,
        description: perm.description,
        module: perm.module,
        parentKey: perm.parentKey,
        sortOrder: perm.sortOrder
      },
      create: perm
    });
    createdPermissions.push(created);
  }
  
  // Migración automática: roles que tenían 'ocs' ahora reciben también los submódulos
  // Esto asegura compatibilidad hacia atrás
  const ocsPermission = createdPermissions.find(p => p.key === "ocs");
  const ocsSubPermissions = createdPermissions.filter(p => p.parentKey === "ocs");
  
  if (ocsPermission && ocsSubPermissions.length > 0) {
    // Buscar todos los roles que tienen el permiso 'ocs'
    const rolesWithOcs = await prisma.rolePermission.findMany({
      where: { permissionId: ocsPermission.id },
      select: { roleId: true }
    });
    
    // Para cada rol con 'ocs', asignar también los submódulos
    for (const { roleId } of rolesWithOcs) {
      for (const subPerm of ocsSubPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            ux_role_permission: {
              roleId: roleId,
              permissionId: subPerm.id
            }
          },
          update: {},
          create: {
            roleId: roleId,
            permissionId: subPerm.id
          }
        });
      }
    }
    console.log(`✅ Migración: ${rolesWithOcs.length} roles con 'ocs' ahora tienen submódulos`);
  }

  // Crear rol Super Admin (sistema, no se puede eliminar)
  const superAdminRole = await prisma.role.upsert({
    where: { name: "super_admin" },
    update: {},
    create: {
      name: "super_admin",
      description: "Administrador con acceso total al sistema",
      isSystem: true
    }
  });

  // Asignar todos los permisos al Super Admin
  for (const permission of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: { 
        ux_role_permission: {
          roleId: superAdminRole.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id
      }
    });
  }

  // Crear rol Viewer (sistema, rol por defecto para nuevos usuarios)
  const viewerRole = await prisma.role.upsert({
    where: { name: "viewer" },
    update: {},
    create: {
      name: "viewer",
      description: "Usuario con acceso de solo lectura a módulos básicos",
      isSystem: true
    }
  });

  // Asignar permisos limitados al Viewer: solo dashboard, assistant, reports
  const viewerPermissionKeys = ["dashboard", "assistant", "reports"];
  const viewerPermissions = createdPermissions.filter(p => viewerPermissionKeys.includes(p.key));
  
  for (const permission of viewerPermissions) {
    await prisma.rolePermission.upsert({
      where: { 
        ux_role_permission: {
          roleId: viewerRole.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: viewerRole.id,
        permissionId: permission.id
      }
    });
  }

  // Crear usuario Super Admin por defecto: iago.lopez@interseguro.com.pe
  const superAdminUser = await prisma.user.upsert({
    where: { email: "iago.lopez@interseguro.com.pe" },
    update: {},
    create: {
      email: "iago.lopez@interseguro.com.pe",
      name: "Iago Lopez",
      active: true
    }
  });

  // Asignar rol Super Admin al usuario
  await prisma.userRole.upsert({
    where: {
      ux_user_role: {
        userId: superAdminUser.id,
        roleId: superAdminRole.id
      }
    },
    update: {},
    create: {
      userId: superAdminUser.id,
      roleId: superAdminRole.id
    }
  });

  console.log("✅ Bootstrap seed completado (incluye permisos, roles y super admin)");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
