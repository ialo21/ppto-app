import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createTempUser() {
  console.log("🔧 Creando usuario temporal para bypass de OAuth...");

  // Buscar rol super_admin
  const superAdminRole = await prisma.role.findFirst({
    where: { name: "super_admin" }
  });

  if (!superAdminRole) {
    console.error("❌ No se encontró el rol super_admin. Ejecuta el seed primero.");
    process.exit(1);
  }

  // Crear o actualizar usuario temporal
  const user = await prisma.user.upsert({
    where: { email: "admin@temp.local" },
    update: {
      active: true,
      name: "Admin Temporal"
    },
    create: {
      email: "admin@temp.local",
      name: "Admin Temporal",
      active: true
    }
  });

  // Asignar rol super_admin si no lo tiene
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: superAdminRole.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      roleId: superAdminRole.id
    }
  });

  console.log("✅ Usuario temporal creado:");
  console.log(`   Email: admin@temp.local`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Rol: super_admin`);
  console.log("\n📝 Para usarlo, necesitas crear una sesión manualmente o usar el endpoint de desarrollo.");
}

createTempUser()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
