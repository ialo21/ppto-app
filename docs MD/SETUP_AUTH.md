# Guía de Setup: Sistema de Autenticación y Roles con Google OAuth 2.0

Este documento describe los pasos necesarios para configurar y ejecutar el sistema de autenticación real con Google OAuth 2.0 y gestión de roles implementado en PPTO App.

## ⚠️ IMPORTANTE: OAuth Real con Google Workspace

Este sistema usa **Google OAuth 2.0 REAL** para autenticación, restringido al dominio `@interseguro.com.pe`.  
**NO es una simulación**. Requiere credenciales válidas de Google Cloud Console.

## Pasos de Configuración

### 1. Instalar dependencias del backend

```powershell
cd apps/api
pnpm install
```

Esto instalará las nuevas dependencias:
- `@fastify/cookie`: Para manejo de cookies
- `@fastify/session`: Para gestión de sesiones
- `googleapis`: Para integración con Google OAuth 2.0

### 2. Configurar credenciales de Google OAuth 2.0

#### Crear proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google+ API** (o People API):
   - Menú → APIs & Services → Library
   - Busca "Google+ API" o "People API"
   - Click en "Enable"

#### Configurar pantalla de consentimiento OAuth

1. Menú → APIs & Services → OAuth consent screen
2. Selecciona **Internal** (solo usuarios de tu organización)
3. Completa:
   - **App name**: PORTAL PPTO
   - **User support email**: tu-email@interseguro.com.pe
   - **Developer contact**: tu-email@interseguro.com.pe
4. Scopes: Agregar `.../auth/userinfo.email` y `.../auth/userinfo.profile`
5. Guarda y continúa

#### Crear credenciales OAuth 2.0

1. Menú → APIs & Services → Credentials
2. Click en "+ CREATE CREDENTIALS" → "OAuth client ID"
3. Tipo de aplicación: **Web application**
4. Nombre: "PPTO App Local Dev"
5. **Authorized JavaScript origins**:
   ```
   http://localhost:3001
   http://localhost:5173
   ```
6. **Authorized redirect URIs**:
   ```
   http://localhost:3001/auth/google/callback
   ```
7. Click en "CREATE"
8. **Copia el Client ID y Client Secret** que se generan

#### Configurar variables de entorno

1. Copia el archivo de ejemplo:
   ```powershell
   cp apps\api\.env.example apps\api\.env
   ```

2. Edita `apps/api/.env` y completa:
   ```env
   DATABASE_URL="postgresql://ppto:password@localhost:5432/ppto"
   
   # Google OAuth 2.0 - PEGA TUS CREDENCIALES AQUÍ
   GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="tu-client-secret"
   GOOGLE_REDIRECT_URI="http://localhost:3001/auth/google/callback"
   
   # Session Secret (genera uno aleatorio para producción)
   SESSION_SECRET="ppto-app-secret-change-in-production-min-32-chars"
   ```

3. **NO COMMITEES EL ARCHIVO `.env`** (ya está en `.gitignore`)

### 3. Ejecutar migración de base de datos

```powershell
# Desde la raíz del proyecto
pnpm db:migrate
```

Esto creará las nuevas tablas:
- `User`: Usuarios del sistema
- `Role`: Roles de permisos
- `Permission`: Permisos individuales
- `UserRole`: Relación M:N entre usuarios y roles
- `RolePermission`: Relación M:N entre roles y permisos

### 4. Ejecutar el seed para inicializar datos

```powershell
# Desde la raíz del proyecto
pnpm seed:bootstrap
```

Esto creará automáticamente:
- 9 permisos predefinidos (dashboard, assistant, reports, facturas, ocs, provisiones, ppto, catalogos, manage_roles)
- Rol `super_admin` con todos los permisos
- Usuario `iago.lopez@interseguro.com.pe` con rol super_admin

### 5. Iniciar la aplicación

```powershell
# Base de datos (si no está corriendo)
pnpm db:up

# Aplicación completa (backend + frontend)
pnpm dev
```

## Pruebas del Sistema con OAuth Real

### Prueba 1: Login como Super Admin con Google OAuth

1. Abre el navegador en `http://localhost:5173`
2. Deberías ser redirigido a `/login`
3. Click en **"Continuar con Google"**
4. Serás redirigido a Google para seleccionar tu cuenta
5. **Selecciona tu cuenta** `iago.lopez@interseguro.com.pe` (o cualquier cuenta @interseguro.com.pe)
6. Google te pedirá permisos para acceder a tu email y perfil → **Permite**
7. Serás redirigido automáticamente al Dashboard del Portal PPTO
8. Verifica:
   - ✅ Tu nombre/email aparece arriba derecha
   - ✅ Ves todas las páginas en el sidebar (Dashboard, Asistente, Reportes, etc.)
   - ✅ Al hacer click en tu nombre → aparece "Administrar Roles"

**Nota:** Si es la primera vez que `iago.lopez@interseguro.com.pe` inicia sesión:
- Se creará automáticamente el usuario en la BD
- Se le asignará automáticamente el rol `super_admin`

### Prueba 2: Crear un Rol con Permisos Limitados

1. Como super admin, click en tu nombre (arriba derecha) → "Administrar Roles"
2. Click en "Nuevo Rol"
3. Completa:
   - **Nombre**: `Analista`
   - **Descripción**: `Analista con acceso limitado`
   - **Permisos**: Marca solo `Dashboard`, `Reportes` y `Facturas`
4. Click en "Crear Rol"

### Prueba 3: Asignar Rol a un Usuario Nuevo

1. Cierra sesión (menú usuario → Cerrar Sesión)
2. Click en "Continuar con Google"
3. **Selecciona otra cuenta** de Google con dominio @interseguro.com.pe
   - Ejemplo: `otro.usuario@interseguro.com.pe`
4. Permite los permisos
5. Notarás que el usuario NO tiene permisos (el sidebar estará vacío)
4. Cierra sesión y vuelve a entrar como `iago.lopez@interseguro.com.pe` (super admin)
5. Ve a "Administrar Roles" → pestaña "Usuarios"
6. Busca al usuario que acabas de crear (ej: `otro.usuario@interseguro.com.pe`)
7. En el dropdown "Asignar rol...", selecciona "Analista"
8. Cierra sesión
9. Inicia sesión de nuevo con Google usando `otro.usuario@interseguro.com.pe`
9. Ahora verás solo Dashboard, Reportes y Facturas en el sidebar

### Prueba 4: Probar restricción de dominio

1. Cierra sesión
2. Click en "Continuar con Google"
3. **Intenta seleccionar una cuenta que NO sea @interseguro.com.pe**
   - Ejemplo: `tu.cuenta@gmail.com`
4. Después de permitir permisos, serás redirigido a `/login` con error:
   - ✅ **"Solo se permiten correos de @interseguro.com.pe"**
5. Este es el comportamiento esperado → el sistema rechaza dominios no autorizados

### Prueba 5: Validar Protección de Rutas

1. Como usuario con permisos limitados (ej: `otro.usuario@interseguro.com.pe` con rol "Analista")
2. Intenta navegar manualmente a `http://localhost:5173/ppto` (una página sin permiso)
3. Deberías permanecer en la página actual o ver contenido restringido
4. Solo verás en el sidebar las páginas para las que tienes permiso

## Características Implementadas

### Autenticación con Google OAuth 2.0
- ✅ **Google OAuth 2.0 REAL** (no simulado)
- ✅ Flujo completo: redirect → autorización → callback → sesión
- ✅ Validación de `id_token` con verificación de firma
- ✅ Restricción estricta a dominio `@interseguro.com.pe`
- ✅ Creación automática de usuarios al primer login
- ✅ Actualización automática de `name` y `googleId` en logins subsecuentes
- ✅ Sesiones persistentes con cookies (7 días)
- ✅ Protección de rutas en frontend con `ProtectedRoute`
- ✅ Middleware `requireAuth` y `requirePermission` en backend

### Roles y Permisos
- ✅ Sistema de roles flexible
- ✅ Permisos granulares por página/módulo
- ✅ Rol super_admin predefinido e inmutable
- ✅ Asignación múltiple de roles por usuario
- ✅ Página de administración de roles (solo super admin)

### Seguridad
- ✅ Sidebar dinámico según permisos
- ✅ Redirección automática si intenta acceder a página sin permiso
- ✅ Endpoints protegidos con middleware `requirePermission`
- ✅ No se puede eliminar rol super_admin
- ✅ No se puede desactivar al usuario super admin principal

## Estructura de Archivos Modificados/Creados

### Backend (apps/api)
```
src/
├── auth.ts                    # Lógica de autenticación y middleware
├── roles.ts                   # Endpoints de gestión de roles
├── index.ts                   # Configuración de sesiones y CORS
└── package.json               # + dependencias @fastify/cookie y @fastify/session
```

### Frontend (apps/web)
```
src/
├── contexts/
│   └── AuthContext.tsx        # Contexto de autenticación
├── pages/
│   ├── LoginPage.tsx          # Página de login
│   └── RolesPage.tsx          # Administración de roles
├── lib/
│   └── api.ts                 # + configuración withCredentials
└── main.tsx                   # + AuthProvider, rutas protegidas, sidebar dinámico
```

### Base de Datos (packages/db)
```
├── schema.prisma              # + modelos User, Role, Permission, etc.
└── seed.ts                    # + inicialización de permisos y super admin
```

## Notas Importantes

### Seguridad de Cookies

En **desarrollo** (`NODE_ENV !== "production"`):
- `secure: false` (permite HTTP)
- `sameSite: "lax"`
- `httpOnly: true`

En **producción** debes configurar:
```javascript
secure: true, // Solo HTTPS
sameSite: "strict",
httpOnly: true
```

### Variables de Entorno en Producción

1. **SESSION_SECRET**: Genera un secret aleatorio de 32+ caracteres
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **GOOGLE_REDIRECT_URI**: Cambia a tu dominio de producción
   ```env
   GOOGLE_REDIRECT_URI="https://ppto.interseguro.com.pe/auth/google/callback"
   ```

3. **Actualiza las Authorized Redirect URIs en Google Cloud Console** para incluir tu dominio de producción

### URLs Hardcodeadas (Frontend y Backend)

Actualmente hay URLs hardcodeadas para desarrollo:

**Backend** (`apps/api/src/auth.ts`):
- Línea 188: `http://localhost:5173/login?error=...`
- Línea 192: `http://localhost:5173/login?error=...`
- Línea 208: `http://localhost:5173/login?error=...`
- Línea 218: `http://localhost:5173/login?error=...`
- Línea 256: `http://localhost:5173/` (redirect después de login)
- Línea 261: `http://localhost:5173/login?error=...`

**Frontend** (`apps/web/src/pages/LoginPage.tsx`):
- Línea 30: `http://localhost:3001/auth/google`

**Frontend** (`apps/web/src/contexts/AuthContext.tsx`):
- Línea 46: `http://localhost:3001/auth/google`

**Frontend** (`apps/web/src/lib/api.ts`):
- Línea 4: `baseURL: "http://localhost:3001"`

**Para producción**, crea variables de entorno:
```env
# Backend
FRONTEND_URL="https://ppto.interseguro.com.pe"

# Frontend (Vite)
VITE_API_URL="https://api-ppto.interseguro.com.pe"
```

### Permisos Disponibles (Seed Automático)

Estos permisos se crean automáticamente al ejecutar `pnpm seed:bootstrap`:

| Key | Nombre | Descripción | Sidebar |
|-----|--------|-------------|----------|
| `dashboard` | Dashboard | Vista principal con métricas y estadísticas | ✅ |
| `assistant` | Asistente | Asistente IA para consultas | ✅ |
| `reports` | Reportes | Reportes y análisis de datos | ✅ |
| `facturas` | Facturas | Gestión de facturas | ✅ |
| `ocs` | Órdenes de Compra | Gestión de órdenes de compra | ✅ |
| `provisiones` | Provisiones | Gestión de provisiones | ✅ |
| `ppto` | Presupuesto | Gestión de presupuesto | ✅ |
| `catalogos` | Catálogos | Catálogos maestros (gerencias, áreas, etc.) | ✅ |
| `manage_roles` | Administrar Roles | Gestión de roles y permisos | ❌ (solo en menú usuario) |

El rol **`super_admin`** tiene TODOS estos permisos asignados automáticamente.

## Solución de Problemas

### Error: "Cannot find module 'googleapis'"
Ejecuta: `cd apps/api && pnpm install`

### Error: "redirect_uri_mismatch" al intentar login
**Causa:** La URI de callback no coincide con la configurada en Google Cloud Console

**Solución:**
1. Verifica que en Google Cloud Console → Credentials → Tu OAuth Client → Authorized redirect URIs esté:
   ```
   http://localhost:3001/auth/google/callback
   ```
2. Verifica que `GOOGLE_REDIRECT_URI` en `.env` sea EXACTAMENTE igual

### Error: "invalid_client" o "unauthorized_client"
**Causa:** El Client ID o Client Secret son incorrectos

**Solución:**
1. Ve a Google Cloud Console → Credentials
2. Copia de nuevo el Client ID y Client Secret
3. Actualiza `apps/api/.env`
4. Reinicia el servidor: `pnpm dev`

### Error: "Solo se permiten correos de @interseguro.com.pe"
**Causa:** Intentaste loguearte con una cuenta que no es del dominio permitido

**Solución:**
- Usa solo cuentas de Google Workspace del dominio `@interseguro.com.pe`
- Si necesitas probar con otro dominio (solo desarrollo), modifica `isAllowedEmail()` en `apps/api/src/auth.ts`

### El sidebar no muestra páginas
**Causa:** El usuario no tiene roles asignados

**Solución:**
1. Inicia sesión como `iago.lopez@interseguro.com.pe` (super admin)
2. Ve a "Administrar Roles" → pestaña "Usuarios"
3. Asigna un rol al usuario

### No puedo acceder a "Administrar Roles"
**Causa:** Solo usuarios con permiso `manage_roles` pueden acceder

**Solución:**
- Por defecto, solo `super_admin` tiene este permiso
- Si necesitas dar acceso a otro rol, ve a "Administrar Roles" → editar rol → marcar permiso `manage_roles`

### La sesión se pierde al recargar la página
**Causa:** Las cookies no se están enviando correctamente

**Solución:**
1. Verifica que `apps/web/src/lib/api.ts` tenga `withCredentials: true`
2. Verifica que CORS en backend (`apps/api/src/index.ts`) tenga `credentials: true`
3. Limpia las cookies del navegador y vuelve a intentar

## Siguientes Pasos Recomendados

1. ✅ **OAuth real implementado** - Ya funcional con Google Workspace
2. **Agregar auditoría**: Registrar quién creó/modificó/eliminó roles o asignó permisos
3. **Refresh tokens**: Implementar renovación automática de sesión antes de expirar
4. **Personalización de roles**: Permitir crear permisos personalizados dinámicamente
5. **Notificaciones**: Enviar emails cuando se asignan/remueven roles
6. **Dashboard de actividad**: Ver qué usuarios están activos y sus últimas acciones
7. **Rate limiting**: Proteger endpoints de autenticación contra fuerza bruta
8. **Logs de acceso**: Registrar intentos de login exitosos y fallidos
9. **Externalizar URLs**: Mover todas las URLs hardcodeadas a variables de entorno
10. **2FA opcional**: Agregar autenticación de dos factores para super admins
