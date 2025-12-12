import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedOcStatusHistory() {
  console.log("🔍 Buscando OCs sin historial de estados...");

  const ocsWithoutHistory = await prisma.$queryRaw<Array<{ id: number; estado: string; fechaRegistro: Date }>>`
    SELECT o.id, o.estado, o."fechaRegistro"
    FROM "OC" o
    LEFT JOIN "OCStatusHistory" h ON h."ocId" = o.id
    WHERE h.id IS NULL
  `;

  if (ocsWithoutHistory.length === 0) {
    console.log("✅ Todas las OCs ya tienen historial de estados.");
    return;
  }

  console.log(`📝 Creando historial inicial para ${ocsWithoutHistory.length} OCs...`);

  for (const oc of ocsWithoutHistory) {
    await prisma.oCStatusHistory.create({
      data: {
        ocId: oc.id,
        status: oc.estado as any,
        changedAt: oc.fechaRegistro
      }
    });
  }

  console.log(`✅ Historial creado para ${ocsWithoutHistory.length} OCs`);
}

seedOcStatusHistory()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
