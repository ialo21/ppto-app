import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function analyzeEncodingIssues() {
  console.log("🔍 Analizando problemas de encoding en la base de datos...\n");

  try {
    // 1. Verificar encoding de la BD
    const encodingResult = await prisma.$queryRaw<Array<{ server_encoding: string; client_encoding: string }>>`
      SELECT current_setting('server_encoding') as server_encoding, 
             current_setting('client_encoding') as client_encoding
    `;
    console.log("📊 Configuración de encoding:");
    console.log(`   - Server: ${encodingResult[0].server_encoding}`);
    console.log(`   - Client: ${encodingResult[0].client_encoding}\n`);

    // 2. Buscar textos con caracteres potencialmente corruptos en Support
    console.log("🔎 Buscando registros con caracteres corruptos en Support...");
    const corruptedSupports = await prisma.support.findMany({
      where: {
        OR: [
          { name: { contains: "??" } },
          { name: { contains: "Ã±" } }, // ñ mal codificada
          { name: { contains: "Ã³" } }, // ó mal codificada
          { name: { contains: "Ã­" } }, // í mal codificada
          { name: { contains: "Ã©" } }, // é mal codificada
          { name: { contains: "Ãº" } }, // ú mal codificada
        ]
      },
      select: { id: true, code: true, name: true }
    });

    if (corruptedSupports.length > 0) {
      console.log(`   ❌ Encontrados ${corruptedSupports.length} registros con posibles problemas:`);
      corruptedSupports.forEach(s => {
        console.log(`      ID ${s.id} - ${s.code}: "${s.name}"`);
      });
    } else {
      console.log("   ✅ No se encontraron problemas evidentes en Support");
    }

    // 3. Buscar en otras tablas de catálogos
    console.log("\n🔎 Buscando en otras tablas...");
    
    const corruptedExpenseConcepts = await prisma.expenseConcept.findMany({
      where: {
        OR: [
          { name: { contains: "??" } },
          { name: { contains: "Ã±" } },
          { name: { contains: "Ã³" } },
        ]
      },
      select: { id: true, name: true }
    });

    if (corruptedExpenseConcepts.length > 0) {
      console.log(`   ❌ ExpenseConcept: ${corruptedExpenseConcepts.length} registros afectados`);
      corruptedExpenseConcepts.slice(0, 5).forEach(c => {
        console.log(`      ID ${c.id}: "${c.name}"`);
      });
    } else {
      console.log("   ✅ ExpenseConcept: sin problemas");
    }

    const corruptedExpensePackages = await prisma.expensePackage.findMany({
      where: {
        OR: [
          { name: { contains: "??" } },
          { name: { contains: "Ã±" } },
        ]
      },
      select: { id: true, name: true }
    });

    if (corruptedExpensePackages.length > 0) {
      console.log(`   ❌ ExpensePackage: ${corruptedExpensePackages.length} registros afectados`);
    } else {
      console.log("   ✅ ExpensePackage: sin problemas");
    }

    const corruptedManagements = await prisma.management.findMany({
      where: {
        OR: [
          { name: { contains: "??" } },
          { name: { contains: "Ã±" } },
        ]
      },
      select: { id: true, name: true }
    });

    if (corruptedManagements.length > 0) {
      console.log(`   ❌ Management: ${corruptedManagements.length} registros afectados`);
    } else {
      console.log("   ✅ Management: sin problemas");
    }

    const corruptedAreas = await prisma.area.findMany({
      where: {
        OR: [
          { name: { contains: "??" } },
          { name: { contains: "Ã±" } },
        ]
      },
      select: { id: true, name: true }
    });

    if (corruptedAreas.length > 0) {
      console.log(`   ❌ Area: ${corruptedAreas.length} registros afectados`);
    } else {
      console.log("   ✅ Area: sin problemas");
    }

    // 4. Verificar si hay registros con caracteres UTF-8 multi-byte mal interpretados
    console.log("\n🔎 Verificando patrones de UTF-8 mal interpretado...");
    const utf8Issues = await prisma.$queryRaw<Array<{ table_name: string; count: bigint }>>`
      SELECT 'Support' as table_name, COUNT(*) as count
      FROM "Support"
      WHERE name ~ '[À-ÿ]'
      UNION ALL
      SELECT 'ExpenseConcept', COUNT(*)
      FROM "ExpenseConcept"
      WHERE name ~ '[À-ÿ]'
      UNION ALL
      SELECT 'ExpensePackage', COUNT(*)
      FROM "ExpensePackage"
      WHERE name ~ '[À-ÿ]'
    `;

    console.log("   Registros con caracteres acentuados (normal en español):");
    utf8Issues.forEach(row => {
      console.log(`      ${row.table_name}: ${row.count} registros`);
    });

    console.log("\n✅ Análisis completado");

  } catch (error) {
    console.error("❌ Error durante el análisis:", error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeEncodingIssues();
