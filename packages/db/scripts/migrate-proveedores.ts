/**
 * Script de migración: Extraer proveedores únicos de OCs existentes
 * 
 * Este script:
 * 1. Lee todas las OCs con campos proveedor/ruc (legacy)
 * 2. Crea registros únicos en la tabla Proveedor
 * 3. Actualiza las OCs para referenciar el nuevo proveedorId
 * 
 * Ejecución desde la raíz del proyecto:
 * cd packages/db && npx ts-node scripts/migrate-proveedores.ts --migrate
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateProveedores() {
  console.log("🚀 Iniciando migración de proveedores...\n");

  // 1. Obtener todas las OCs con proveedor/ruc
  const ocs = await prisma.oC.findMany({
    where: {
      proveedorId: null,
      ruc: { not: null }
    },
    select: {
      id: true,
      proveedor: true,
      ruc: true
    }
  });

  console.log(`📋 Encontradas ${ocs.length} OCs sin proveedorId asignado\n`);

  if (ocs.length === 0) {
    console.log("✅ No hay OCs para migrar. Todas ya tienen proveedorId.");
    return;
  }

  // 2. Agrupar por RUC para evitar duplicados
  const proveedoresByRuc = new Map<string, { razonSocial: string; ruc: string }>();
  
  for (const oc of ocs) {
    if (oc.ruc && oc.proveedor) {
      // Si ya existe el RUC, mantener el primer nombre encontrado
      if (!proveedoresByRuc.has(oc.ruc)) {
        proveedoresByRuc.set(oc.ruc, {
          razonSocial: oc.proveedor,
          ruc: oc.ruc
        });
      }
    }
  }

  console.log(`📊 Proveedores únicos encontrados: ${proveedoresByRuc.size}\n`);

  // 3. Crear proveedores y actualizar OCs
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [ruc, data] of proveedoresByRuc) {
    try {
      // Buscar o crear proveedor
      let proveedor = await prisma.proveedor.findUnique({ where: { ruc } });
      
      if (!proveedor) {
        proveedor = await prisma.proveedor.create({
          data: {
            razonSocial: data.razonSocial,
            ruc: ruc,
            active: true
          }
        });
        created++;
        console.log(`✅ Creado: ${data.razonSocial} (${ruc})`);
      } else {
        skipped++;
        console.log(`⏭️  Ya existe: ${proveedor.razonSocial} (${ruc})`);
      }

      // Actualizar OCs con este RUC
      const result = await prisma.oC.updateMany({
        where: {
          ruc: ruc,
          proveedorId: null
        },
        data: {
          proveedorId: proveedor.id
        }
      });
      
      updated += result.count;
    } catch (error) {
      console.error(`❌ Error con RUC ${ruc}:`, error);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📈 RESUMEN DE MIGRACIÓN:");
  console.log("=".repeat(50));
  console.log(`   Proveedores creados: ${created}`);
  console.log(`   Proveedores existentes (saltados): ${skipped}`);
  console.log(`   OCs actualizadas: ${updated}`);
  console.log("=".repeat(50));
}

// Verificar estado actual
async function checkStatus() {
  const totalOcs = await prisma.oC.count();
  const ocsWithProveedorId = await prisma.oC.count({ where: { proveedorId: { not: null } } });
  const ocsWithLegacy = await prisma.oC.count({ 
    where: { 
      proveedorId: null,
      ruc: { not: null }
    } 
  });
  const totalProveedores = await prisma.proveedor.count();

  console.log("\n📊 ESTADO ACTUAL:");
  console.log("=".repeat(50));
  console.log(`   Total OCs: ${totalOcs}`);
  console.log(`   OCs con proveedorId: ${ocsWithProveedorId}`);
  console.log(`   OCs con datos legacy (sin proveedorId): ${ocsWithLegacy}`);
  console.log(`   Total proveedores en catálogo: ${totalProveedores}`);
  console.log("=".repeat(50));
}

async function main() {
  try {
    await checkStatus();
    
    const args = (globalThis as any).process?.argv?.slice(2) ?? [];
    if (args.includes("--migrate")) {
      await migrateProveedores();
      await checkStatus();
    } else {
      console.log("\n💡 Para ejecutar la migración, usa: npx ts-node scripts/migrate-proveedores.ts --migrate\n");
    }
  } catch (error) {
    console.error("Error durante la migración:", error);
    (globalThis as any).process?.exit?.(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
