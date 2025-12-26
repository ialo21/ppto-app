import { PrismaClient } from "@prisma/client";

declare const process: { exit: (code: number) => never };

const prisma = new PrismaClient();

/**
 * Limpia labels legacy de períodos para forzar uso de formateo YYYY-MM en frontend
 * Todos los labels se establecen a NULL para que el sistema use year/month
 */
async function main() {
  console.log("🧹 Limpiando labels legacy de períodos...");

  const result = await prisma.period.updateMany({
    where: {
      label: {
        not: null
      }
    },
    data: {
      label: null
    }
  });

  console.log(`✅ ${result.count} períodos actualizados (label → NULL)`);
  console.log("   Frontend ahora generará formato YYYY-MM consistente");
}

main()
  .catch((e) => {
    console.error("❌ Error limpiando labels:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
