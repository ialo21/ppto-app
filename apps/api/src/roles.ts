import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { requireAuth, requirePermission } from "./auth";

const prisma = new PrismaClient();

export async function registerRoleRoutes(app: FastifyInstance) {
  
  // GET /permissions - Listar todos los permisos disponibles (lista plana)
  app.get("/permissions", { preHandler: [requireAuth, requirePermission("manage_roles")] }, async () => {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
    return permissions;
  });

  // GET /permissions/tree - Listar permisos en estructura jerárquica para UI de roles
  // Retorna módulos con sus submódulos anidados
  app.get("/permissions/tree", { preHandler: [requireAuth, requirePermission("manage_roles")] }, async () => {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });

    // Construir estructura jerárquica
    // 1. Permisos sin padre (módulos principales o permisos simples)
    // 2. Permisos con padre (submódulos)
    
    type PermissionNode = {
      id: number;
      key: string;
      name: string;
      description: string | null;
      module: string | null;
      parentKey: string | null;
      sortOrder: number;
      children: PermissionNode[];
    };

    const permissionMap = new Map<string, PermissionNode>();
    const rootPermissions: PermissionNode[] = [];

    // Primera pasada: crear nodos
    for (const perm of permissions) {
      permissionMap.set(perm.key, {
        id: perm.id,
        key: perm.key,
        name: perm.name,
        description: perm.description,
        module: perm.module,
        parentKey: perm.parentKey,
        sortOrder: perm.sortOrder,
        children: []
      });
    }

    // Segunda pasada: construir jerarquía
    for (const perm of permissions) {
      const node = permissionMap.get(perm.key)!;
      
      if (perm.parentKey && permissionMap.has(perm.parentKey)) {
        // Es un submódulo, agregarlo al padre
        const parent = permissionMap.get(perm.parentKey)!;
        parent.children.push(node);
      } else {
        // Es un módulo principal o permiso sin padre
        rootPermissions.push(node);
      }
    }

    // Ordenar children por sortOrder
    for (const node of permissionMap.values()) {
      node.children.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return rootPermissions;
  });

  // GET /roles - Listar todos los roles
  app.get("/roles", { preHandler: [requireAuth, requirePermission("manage_roles")] }, async () => {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        userRoles: {
          include: {
            user: true
          }
        }
      },
      orderBy: { name: "asc" }
    });
    
    return roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map(rp => rp.permission),
      userCount: role.userRoles.length,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    }));
  });

  // GET /roles/:id - Obtener un rol específico con detalles
  app.get("/roles/:id", { preHandler: [requireAuth, requirePermission("manage_roles")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const role = await prisma.role.findUnique({
      where: { id: Number(id) },
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        userRoles: {
          include: {
            user: true
          }
        }
      }
    });
    
    if (!role) {
      return reply.code(404).send({ error: "Rol no encontrado" });
    }
    
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map(rp => rp.permission),
      users: role.userRoles.map(ur => ({
        id: ur.user.id,
        email: ur.user.email,
        name: ur.user.name
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    };
  });

  // POST /roles - Crear un nuevo rol
  app.post("/roles", { preHandler: [requireAuth, requirePermission("manage_roles")] }, async (request, reply) => {
    const { name, description, permissionIds } = request.body as { 
      name: string; 
      description?: string; 
      permissionIds?: number[] 
    };
    
    if (!name || !name.trim()) {
      return reply.code(400).send({ error: "El nombre del rol es obligatorio" });
    }
    
    // Verificar si el rol ya existe
    const existing = await prisma.role.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return reply.code(409).send({ error: "Ya existe un rol con ese nombre" });
    }
    
    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isSystem: false
      }
    });
    
    // Asignar permisos si se proporcionaron
    if (permissionIds && permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId: role.id,
          permissionId
        })),
        skipDuplicates: true
      });
    }
    
    // Cargar el rol con sus permisos
    const createdRole = await prisma.role.findUnique({
      where: { id: role.id },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });
    
    return createdRole;
  });

  // PUT /roles/:id - Actualizar un rol
  app.put("/roles/:id", { preHandler: [requireAuth, requirePermission("manage_roles")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, description, permissionIds } = request.body as { 
      name?: string; 
      description?: string; 
      permissionIds?: number[] 
    };
    
    const role = await prisma.role.findUnique({ where: { id: Number(id) } });
    
    if (!role) {
      return reply.code(404).send({ error: "Rol no encontrado" });
    }
    
    if (role.isSystem && name && name !== role.name) {
      return reply.code(403).send({ error: "No se puede cambiar el nombre de un rol del sistema" });
    }
    
    // Actualizar datos básicos
    const updateData: any = {};
    if (name && name.trim()) {
      // Verificar que no exista otro rol con ese nombre
      const existing = await prisma.role.findUnique({ where: { name: name.trim() } });
      if (existing && existing.id !== role.id) {
        return reply.code(409).send({ error: "Ya existe otro rol con ese nombre" });
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    
    if (Object.keys(updateData).length > 0) {
      await prisma.role.update({
        where: { id: role.id },
        data: updateData
      });
    }
    
    // Actualizar permisos si se proporcionaron
    if (permissionIds !== undefined) {
      // Eliminar permisos actuales
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id }
      });
      
      // Crear nuevos permisos
      if (permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map(permissionId => ({
            roleId: role.id,
            permissionId
          })),
          skipDuplicates: true
        });
      }
    }
    
    // Cargar el rol actualizado
    const updatedRole = await prisma.role.findUnique({
      where: { id: role.id },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });
    
    return updatedRole;
  });

  // DELETE /roles/:id - Eliminar un rol
  app.delete("/roles/:id", { preHandler: [requireAuth, requirePermission("manage_roles")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const role = await prisma.role.findUnique({
      where: { id: Number(id) },
      include: {
        userRoles: true
      }
    });
    
    if (!role) {
      return reply.code(404).send({ error: "Rol no encontrado" });
    }
    
    if (role.isSystem) {
      return reply.code(403).send({ error: "No se puede eliminar un rol del sistema" });
    }
    
    if (role.userRoles.length > 0) {
      return reply.code(409).send({ 
        error: `No se puede eliminar el rol porque tiene ${role.userRoles.length} usuario(s) asignado(s)` 
      });
    }
    
    await prisma.role.delete({
      where: { id: role.id }
    });
    
    return { success: true, message: "Rol eliminado correctamente" };
  });

  // GET /users - Listar todos los usuarios
  app.get("/users", { preHandler: [requireAuth, requirePermission("manage_roles")] }, async () => {
    const users = await prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      },
      orderBy: { email: "asc" }
    });
    
    return users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      active: user.active,
      roles: user.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name
      })),
      createdAt: user.createdAt
    }));
  });

  // POST /users/:userId/roles - Asignar rol a un usuario
  app.post("/users/:userId/roles", { preHandler: [requireAuth, requirePermission("manage_roles")] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { roleId } = request.body as { roleId: number };
    
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) {
      return reply.code(404).send({ error: "Usuario no encontrado" });
    }
    
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return reply.code(404).send({ error: "Rol no encontrado" });
    }
    
    // Verificar si ya tiene el rol
    const existing = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: role.id
      }
    });
    
    if (existing) {
      return reply.code(409).send({ error: "El usuario ya tiene este rol asignado" });
    }
    
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id
      }
    });
    
    return { success: true, message: "Rol asignado correctamente" };
  });

  // DELETE /users/:userId/roles/:roleId - Remover rol de un usuario
  app.delete("/users/:userId/roles/:roleId", { preHandler: [requireAuth, requirePermission("manage_roles")] }, async (request, reply) => {
    const { userId, roleId } = request.params as { userId: string; roleId: string };
    
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: Number(userId),
        roleId: Number(roleId)
      }
    });
    
    if (!userRole) {
      return reply.code(404).send({ error: "El usuario no tiene este rol asignado" });
    }
    
    await prisma.userRole.delete({
      where: { id: userRole.id }
    });
    
    return { success: true, message: "Rol removido correctamente" };
  });

  // PUT /users/:userId/active - Activar/desactivar usuario
  app.put("/users/:userId/active", { preHandler: [requireAuth, requirePermission("manage_roles")] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { active } = request.body as { active: boolean };
    
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) {
      return reply.code(404).send({ error: "Usuario no encontrado" });
    }
    
    // No permitir desactivar al super admin principal
    if (user.email === "iago.lopez@interseguro.com.pe" && !active) {
      return reply.code(403).send({ error: "No se puede desactivar al super administrador principal" });
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: { active }
    });
    
    return { success: true, message: active ? "Usuario activado" : "Usuario desactivado" };
  });
}
