/**
 * Script de reparación de encoding UTF-8
 * 
 * Problema: Los datos del backup fueron mal interpretados durante la restauración.
 * El archivo SQL estaba en UTF-8, pero PowerShell 'type' lo leyó como Latin-1.
 * 
 * Solución: Este script repara los registros conocidos que tienen ?? en lugar de tildes.
 * 
 * Uso: npx tsx scripts/fix-encoding.ts [--dry-run]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const isDryRun = process.argv.includes("--dry-run");

// Mapeo de textos corruptos -> textos correctos
// Estos valores se obtuvieron del archivo de backup original
const SUPPORT_FIXES = [
  { id: 57, from: "Ingenier??a Social", to: "Ingeniería Social" },
  { id: 87, from: "Servicio env??o de correo transaccional", to: "Servicio envío de correo transaccional" },
  { id: 59, from: "Licencia ATS Selecci??n", to: "Licencia ATS Selección" },
  { id: 24, from: "Botmaker - Implementaci??n Y Operaci??n Whatsapp", to: "Botmaker - Implementación Y Operación Whatsapp" },
  { id: 48, from: "Gesti??n DNS P??blico", to: "Gestión DNS Público" },
  { id: 108, from: "Suscripci??n Acsendo", to: "Suscripción Acsendo" },
  { id: 110, from: "Suscripci??n Captcha", to: "Suscripción Captcha" },
];

const AREA_FIXES = [
  { id: 13, from: "Auditor??a", to: "Auditoría" },
];

async function fixEncodingIssues() {
  console.log("🔧 Iniciando reparación de encoding UTF-8...");
  
  if (isDryRun) {
    console.log("📋 Modo DRY-RUN: No se realizarán cambios en la BD\n");
  } else {
    console.log("⚠️  Modo PRODUCCIÓN: Se aplicarán cambios a la BD\n");
  }

  let fixed = 0;
  let errors = 0;

  try {
    console.log("🔍 Reparando tabla Support...");
    
    for (const fix of SUPPORT_FIXES) {
      try {
        // Verificar que el registro existe y tiene el texto corrupto
        const record = await prisma.support.findUnique({
          where: { id: fix.id },
          select: { id: true, name: true }
        });

        if (!record) {
          console.log(`   ⚠️  ID ${fix.id}: No encontrado (puede haber sido eliminado)`);
          continue;
        }

        if (record.name !== fix.from) {
          console.log(`   ℹ️  ID ${fix.id}: Ya corregido o texto diferente`);
          console.log(`       Actual: "${record.name}"`);
          console.log(`       Esperado corrupto: "${fix.from}"`);
          continue;
        }

        // Aplicar corrección
        if (!isDryRun) {
          await prisma.support.update({
            where: { id: fix.id },
            data: { name: fix.to }
          });
        }

        console.log(`   ✅ ID ${fix.id}: "${fix.from}" → "${fix.to}"`);
        fixed++;

      } catch (error) {
        console.error(`   ❌ ID ${fix.id}: Error al reparar`, error);
        errors++;
      }
    }

    // Buscar y reportar cualquier otro registro con ?? que no esté en la lista
    console.log("\n🔍 Buscando otros registros no contemplados...");
    
    const otherCorrupted = await prisma.support.findMany({
      where: {
        AND: [
          { name: { contains: "??" } },
          { id: { notIn: SUPPORT_FIXES.map(f => f.id) } }
        ]
      },
      select: { id: true, code: true, name: true }
    });

    if (otherCorrupted.length > 0) {
      console.log(`   ⚠️  Encontrados ${otherCorrupted.length} registros adicionales con ??:`);
      otherCorrupted.forEach(r => {
        console.log(`      ID ${r.id} - ${r.code}: "${r.name}"`);
      });
      console.log("   💡 Agrega estos registros al script si conoces el texto correcto");
    } else {
      console.log("   ✅ No hay otros registros con ??");
    }

    // Reparar tabla Area
    console.log("\n🔍 Reparando tabla Area...");
    
    for (const fix of AREA_FIXES) {
      try {
        const record = await prisma.area.findUnique({
          where: { id: fix.id },
          select: { id: true, name: true }
        });

        if (!record) {
          console.log(`   ⚠️  ID ${fix.id}: No encontrado`);
          continue;
        }

        if (record.name !== fix.from) {
          console.log(`   ℹ️  ID ${fix.id}: Ya corregido o texto diferente`);
          console.log(`       Actual: "${record.name}"`);
          continue;
        }

        if (!isDryRun) {
          await prisma.area.update({
            where: { id: fix.id },
            data: { name: fix.to }
          });
        }

        console.log(`   ✅ ID ${fix.id}: "${fix.from}" → "${fix.to}"`);
        fixed++;

      } catch (error) {
        console.error(`   ❌ ID ${fix.id}: Error al reparar`, error);
        errors++;
      }
    }

    // Verificar si hay otros registros corruptos en Area no contemplados
    const otherCorruptedAreas = await prisma.area.findMany({
      where: {
        AND: [
          { name: { contains: "??" } },
          { id: { notIn: AREA_FIXES.map(f => f.id) } }
        ]
      },
      select: { id: true, name: true }
    });

    if (otherCorruptedAreas.length > 0) {
      console.log(`   ⚠️  Encontrados ${otherCorruptedAreas.length} registros adicionales en Area:`);
      otherCorruptedAreas.forEach(r => {
        console.log(`      ID ${r.id}: "${r.name}"`);
      });
    } else {
      console.log("   ✅ No hay otros registros con ?? en Area");
    }

    // Resumen
    console.log("\n" + "=".repeat(60));
    console.log("📊 RESUMEN:");
    console.log(`   ✅ Registros reparados: ${fixed}`);
    console.log(`   ❌ Errores: ${errors}`);
    
    if (isDryRun) {
      console.log("\n💡 Ejecuta sin --dry-run para aplicar los cambios");
    } else {
      console.log("\n✅ Cambios aplicados exitosamente");
    }

  } catch (error) {
    console.error("\n❌ Error fatal durante la reparación:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEncodingIssues();
