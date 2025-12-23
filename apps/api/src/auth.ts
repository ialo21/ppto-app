import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { google } from "googleapis";

// Extender tipos de Fastify para incluir sesión correctamente
declare module "fastify" {
  interface Session {
    userId?: number;
    get(key: string): any;
    set(key: string, value: any): void;
    delete(): void;
    destroy(): void;
  }
  interface FastifyRequest {
    session: Session;
  }
}

const prisma = new PrismaClient();

// Tipo para usuario con roles y permisos incluidos
type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    }
  }
}>;

// Configuración de Google OAuth
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/auth/google/callback"
);

// Tipos
export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  permissions: string[];
  roles: { id: number; name: string }[];
}

// Helper para cargar usuario con roles y permisos
async function loadUserWithPermissions(where: { id?: number; email?: string }) {
  const user = await prisma.user.findFirst({
    where,
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  }) as UserWithRoles | null;

  if (!user || !user.active) return null;

  const permissions = new Set<string>();
  const roles: { id: number; name: string }[] = [];

  for (const userRole of user.userRoles) {
    roles.push({ id: userRole.role.id, name: userRole.role.name });
    for (const rolePerm of userRole.role.permissions) {
      permissions.add(rolePerm.permission.key);
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    permissions: Array.from(permissions),
    roles
  } as AuthUser;
}

// Middleware para verificar autenticación
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.session.get("userId") as number | undefined;
  
  if (!userId) {
    return reply.code(401).send({ error: "No autenticado" });
  }
  
  // Cargar datos del usuario con permisos
  const user = await prisma.user.findUnique({
    where: { id: userId as number },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  }) as UserWithRoles | null;
  
  if (!user || !user.active) {
    request.session.destroy();
    return reply.code(401).send({ error: "Usuario no válido" });
  }
  
  // Construir objeto de usuario autenticado
  const permissions = new Set<string>();
  const roles: { id: number; name: string }[] = [];
  
  for (const userRole of user.userRoles) {
    roles.push({ id: userRole.role.id, name: userRole.role.name });
    for (const rolePerm of userRole.role.permissions) {
      permissions.add(rolePerm.permission.key);
    }
  }
  
  (request as any).user = {
    id: user.id,
    email: user.email,
    name: user.name,
    permissions: Array.from(permissions),
    roles
  } as AuthUser;
}

// Helper para verificar si el usuario tiene alguno de los permisos especificados
function hasAnyPermission(user: AuthUser, permissionKeys: string[]): boolean {
  for (const permissionKey of permissionKeys) {
    // Verificar permiso directo
    if (user.permissions.includes(permissionKey)) {
      return true;
    }
    
    // Si es un submódulo (contiene ':'), verificar también el permiso padre (acceso global)
    // Ej: si requiere 'ocs:listado' pero tiene 'ocs' → permitir acceso
    if (permissionKey.includes(':')) {
      const parentPermission = permissionKey.split(':')[0];
      if (user.permissions.includes(parentPermission)) {
        return true;
      }
    }
  }
  
  return false;
}

// Middleware para verificar permiso específico
// Soporta permisos jerárquicos: si se verifica 'ocs:listado', también acepta 'ocs' (permiso global)
export function requirePermission(permissionKey: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    
    const user = (request as any).user as AuthUser;
    if (!user) {
      return reply.code(403).send({ error: "No tienes permiso para acceder a este recurso" });
    }
    
    if (!hasAnyPermission(user, [permissionKey])) {
      return reply.code(403).send({ error: "No tienes permiso para acceder a este recurso" });
    }
  };
}

// Middleware para verificar que el usuario tenga AL MENOS UNO de los permisos especificados
// Útil para endpoints que pueden ser accedidos desde múltiples módulos
export function requireAnyPermission(permissionKeys: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    
    const user = (request as any).user as AuthUser;
    if (!user) {
      return reply.code(403).send({ error: "No tienes permiso para acceder a este recurso" });
    }
    
    if (!hasAnyPermission(user, permissionKeys)) {
      return reply.code(403).send({ error: "No tienes permiso para acceder a este recurso" });
    }
  };
}

export async function registerAuthRoutes(app: FastifyInstance) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  
  // Verificar si el correo pertenece al dominio permitido
  function isAllowedEmail(email: string): boolean {
    return email.endsWith("@interseguro.com.pe");
  }

  // Asegurar que el usuario super admin tenga el rol correspondiente
  async function ensureSuperAdminRole(userId: number, email: string) {
    if (email === "iago.lopez@interseguro.com.pe") {
      const superAdminRole = await prisma.role.findFirst({ 
        where: { name: "super_admin" } 
      });
      
      if (superAdminRole) {
        const existingAssignment = await prisma.userRole.findFirst({
          where: { userId, roleId: superAdminRole.id }
        });
        
        if (!existingAssignment) {
          await prisma.userRole.create({
            data: { userId, roleId: superAdminRole.id }
          });
        }
      }
    }
  }

  // Asignar rol viewer por defecto a usuarios nuevos (excepto super admin)
  async function ensureViewerRole(userId: number, email: string) {
    // No asignar viewer al super admin
    if (email === "iago.lopez@interseguro.com.pe") {
      return;
    }

    const viewerRole = await prisma.role.findFirst({ 
      where: { name: "viewer" } 
    });
    
    if (viewerRole) {
      const existingAssignment = await prisma.userRole.findFirst({
        where: { userId, roleId: viewerRole.id }
      });
      
      if (!existingAssignment) {
        await prisma.userRole.create({
          data: { userId, roleId: viewerRole.id }
        });
      }
    }
  }

  // GET /auth/me - Obtener información del usuario autenticado
  app.get("/auth/me", async (request, reply) => {
    const userId = request.session.get("userId") as number | undefined;
    
    if (!userId) {
      return reply.code(401).send({ error: "No autenticado" });
    }
    
    const user = await loadUserWithPermissions({ id: userId });
    
    if (!user) {
      request.session.destroy();
      return reply.code(401).send({ error: "Usuario no válido" });
    }
    
    return user;
  });

  // GET /auth/google - Iniciar flujo OAuth con Google
  app.get("/auth/google", async (request, reply) => {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    // Verificar si viene un email como hint (para relogin más rápido)
    const loginHint = (request.query as any).login_hint;

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'online', // 'online' no solicita refresh token persistente
      scope: scopes,
      hd: 'interseguro.com.pe', // Hint de dominio para restringir a Interseguro
      // Si hay login_hint, agregarlo para facilitar el relogin
      ...(loginHint && { login_hint: loginHint })
    });

    return reply.redirect(authUrl);
  });

  // GET /auth/google/callback - Callback de Google OAuth
  app.get("/auth/google/callback", async (request, reply) => {
    const { code, error } = request.query as { code?: string; error?: string };

    if (error) {
      return reply.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Acceso denegado')}`);
    }

    if (!code) {
      return reply.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Código no recibido')}`);
    }

    try {
      // Intercambiar código por tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Verificar el ID token
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return reply.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Token inválido')}`);
      }

      const email = payload.email;
      const name = payload.name || null;
      const googleId = payload.sub;

      // Validar dominio
      if (!email || !isAllowedEmail(email)) {
        return reply.redirect(
          `${frontendUrl}/login?error=${encodeURIComponent('Solo se permiten correos de @interseguro.com.pe')}`
        );
      }

      // Buscar o crear usuario
      let user = await prisma.user.findUnique({ where: { email } });
      let isNewUser = false;

      if (!user) {
        // Crear nuevo usuario
        user = await prisma.user.create({
          data: {
            email,
            name,
            googleId,
            active: true
          }
        });
        isNewUser = true;
      } else {
        // Actualizar googleId y nombre si cambió
        const updates: any = {};
        if (!user.googleId) updates.googleId = googleId;
        if (name && user.name !== name) updates.name = name;
        
        if (Object.keys(updates).length > 0) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updates
          });
        }
      }

      // Asegurar roles según el tipo de usuario
      await ensureSuperAdminRole(user.id, email);
      
      // Si es usuario nuevo (no super admin), asignar rol viewer por defecto
      if (isNewUser) {
        await ensureViewerRole(user.id, email);
      }

      // Crear sesión
      request.session.set("userId", user.id);

      // Redirigir al frontend
      return reply.redirect(frontendUrl);
      
    } catch (err: any) {
      console.error('Error en OAuth callback:', err);
      return reply.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent('Error al autenticar con Google')}`
      );
    }
  });

  // POST /auth/logout - Cerrar sesión
  app.post("/auth/logout", async (request, reply) => {
    try {
      // Destruir la sesión usando el método destroy de @fastify/session
      // Esto automáticamente limpia la cookie de sesión
      request.session.destroy();
      return reply.code(200).send({ success: true });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Incluso si hay error, responder exitosamente para que el cliente pueda limpiar su estado
      return reply.code(200).send({ success: true });
    }
  });
}
