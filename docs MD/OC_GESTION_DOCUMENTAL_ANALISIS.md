# Análisis: Gestión Documental para Órdenes de Compra

## Objetivo

Reemplazar el modelo basado en enlaces (`linkCotizacion`) por un sistema de gestión documental directa con Google Drive, donde las cotizaciones se adjunten como archivos PDF y se gestionen automáticamente durante el ciclo de vida de la OC.

---

## 1. Estado Actual del Sistema

### 1.1 Modelo de Datos OC

**Archivo**: `packages/db/schema.prisma` (líneas 370-420)

```prisma
model OC {
  id                     Int       @id @default(autoincrement())
  budgetPeriodFromId     Int
  budgetPeriodToId       Int
  incidenteOc            String?   // ← Generado por RPA al procesar
  solicitudOc            String?   // ← Generado por RPA al procesar
  fechaRegistro          DateTime  @default(now())
  supportId              Int
  // ... otros campos ...
  linkCotizacion         String?   // ← CAMPO ACTUAL A REEMPLAZAR
  estado                 OcStatus  @default(PENDIENTE)
  // ...
}

enum OcStatus {
  PENDIENTE        // Estado inicial
  PROCESAR         // Marcado para procesamiento RPA
  EN_PROCESO       // RPA está procesando
  PROCESADO        // RPA completó → genera incidenteOc y solicitudOc
  APROBACION_VP    // Requiere aprobación VP
  ANULAR / ANULADO
  ATENDER_COMPRAS / ATENDIDO
}
```

### 1.2 Flujo Actual de Estados

```
CREACIÓN (Usuario)                    RPA (Robot)
     │                                    │
     ▼                                    │
  PENDIENTE ──► PROCESAR ──────────────► EN_PROCESO
                                              │
                                              ▼
                                         PROCESADO
                                     (genera incidenteOc)
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                              ATENDER_COMPRAS     APROBACION_VP
                                    │                   │
                                    ▼                   ▼
                                ATENDIDO           (continúa flujo)
```

### 1.3 Generación del Incidente

**Archivo**: `apps/api/src/rpa.ts` (líneas 307-317)

El RPA genera `incidenteOc` y `solicitudOc` cuando completa el procesamiento exitoso:

```typescript
if (data.ok) {
  const updateData: any = { estado: "PROCESADO" };
  if (data.solicitudOc) updateData.solicitudOc = data.solicitudOc;
  if (data.incidenteOc) updateData.incidenteOc = data.incidenteOc;  // ← HITO PRINCIPAL
  // ...
}
```

### 1.4 Frontend Actual

**Archivos principales**:
- `apps/web/src/pages/purchase-orders/OcSolicitudPage.tsx` - Formulario de solicitud
- `apps/web/src/pages/purchase-orders/OcGestionPage.tsx` - Gestión/edición
- `apps/web/src/pages/purchase-orders/OcListadoPage.tsx` - Listado

**Campo actual** (líneas 502-516 en OcSolicitudPage.tsx):
```tsx
<label>Link a la Cotización</label>
<InputWithError
  type="url"
  placeholder="https://..."
  value={form.linkCotizacion}
  onChange={(e) => setForm(f => ({ ...f, linkCotizacion: e.target.value }))}
/>
<p className="text-xs">
  Proporciona un enlace a Google Drive, Dropbox u otro servicio
</p>
```

---

## 2. Patrones Existentes Identificados

### 2.1 Carga de Archivos (Multipart)

**Archivo**: `apps/api/src/bulk.ts`

El sistema ya usa `@fastify/multipart` para cargas de archivos CSV:

```typescript
import multipart, { MultipartFile } from "@fastify/multipart";
```

Este patrón puede extenderse para PDFs.

### 2.2 Configuración de APIs Externas

**Archivo**: `apps/api/.env.example`

```env
# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

Ya existe integración OAuth con Google, lo que facilita extender a Google Drive API.

### 2.3 Relaciones M:N

El sistema usa tablas pivot para relaciones muchos-a-muchos:
- `OCCostCenter` (OC ↔ CostCenter)
- `SupportCostCenter` (Support ↔ CostCenter)

Este patrón es ideal para OC ↔ Documentos.

---

## 3. Arquitectura Propuesta

### 3.1 Nuevo Modelo de Datos

```prisma
// Modelo genérico de documento (escalable a otros módulos)
model Document {
  id              Int       @id @default(autoincrement())
  
  // Identificación en Drive
  driveFileId     String    @unique  // ID del archivo en Google Drive
  driveFolderId   String?             // Carpeta actual en Drive
  
  // Metadatos
  filename        String              // Nombre original del archivo
  mimeType        String              // application/pdf, etc.
  sizeBytes       Int?                // Tamaño en bytes
  
  // Trazabilidad
  uploadedBy      Int?                // Usuario que subió
  uploadedAt      DateTime  @default(now())
  
  // Categorización
  category        DocumentCategory    // COTIZACION, FACTURA, etc.
  
  // Relaciones
  ocDocuments     OCDocument[]        // M:N con OC
  
  @@index([driveFileId], name: "ix_document_drive_file")
  @@index([category], name: "ix_document_category")
}

enum DocumentCategory {
  COTIZACION
  FACTURA
  CONTRATO
  OTRO
}

// Tabla pivot: OC ↔ Document
model OCDocument {
  id          Int       @id @default(autoincrement())
  ocId        Int
  oc          OC        @relation(fields: [ocId], references: [id], onDelete: Cascade)
  documentId  Int
  document    Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())

  @@unique([ocId, documentId], name: "ux_oc_document_pair")
  @@index([ocId], name: "ix_ocdocument_oc")
  @@index([documentId], name: "ix_ocdocument_document")
}

// Actualizar modelo OC para incluir la relación
model OC {
  // ... campos existentes ...
  linkCotizacion  String?   // DEPRECATED: mantener para migración
  documents       OCDocument[]  // NUEVO: M:N con Document
}
```

### 3.2 Configuración de Google Drive

**Variables de entorno** (añadir a `.env.example`):

```env
# Google Drive API Configuration
# Carpeta raíz para documentos de OCs (configurada por negocio)
GDRIVE_OC_ROOT_FOLDER_ID="your-folder-id"

# Carpeta de cotizaciones pendientes (dentro de la raíz)
GDRIVE_OC_COTIZACIONES_FOLDER_ID="your-folder-id"

# Service Account (para operaciones sin usuario)
GDRIVE_SERVICE_ACCOUNT_KEY_PATH="./credentials/service-account.json"
# O inline:
# GDRIVE_SERVICE_ACCOUNT_KEY_JSON='{"type":"service_account",...}'
```

### 3.3 Servicio de Google Drive

**Nuevo archivo**: `apps/api/src/services/google-drive.service.ts`

```typescript
import { google, drive_v3 } from 'googleapis';

interface DriveConfig {
  rootFolderId: string;
  cotizacionesFolderId: string;
}

interface UploadResult {
  fileId: string;
  folderId: string;
  webViewLink: string;
}

class GoogleDriveService {
  private drive: drive_v3.Drive;
  private config: DriveConfig;

  constructor() {
    // Inicializar con Service Account o OAuth
    this.config = {
      rootFolderId: process.env.GDRIVE_OC_ROOT_FOLDER_ID!,
      cotizacionesFolderId: process.env.GDRIVE_OC_COTIZACIONES_FOLDER_ID!
    };
  }

  // Subir archivo a carpeta de cotizaciones pendientes
  async uploadCotizacion(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult>;

  // Crear carpeta para incidente
  async createIncidentFolder(incidentId: string): Promise<string>;

  // Mover archivos a carpeta de incidente
  async moveFilesToIncidentFolder(
    fileIds: string[],
    incidentFolderId: string
  ): Promise<void>;

  // Obtener link de visualización
  async getViewLink(fileId: string): Promise<string>;
}
```

### 3.4 Endpoints API

**Nuevo archivo**: `apps/api/src/oc-documents.ts`

```typescript
// POST /ocs/:id/documents
// Subir uno o más PDFs como cotizaciones
// Content-Type: multipart/form-data

// GET /ocs/:id/documents
// Listar documentos adjuntos a una OC

// DELETE /ocs/:id/documents/:documentId
// Eliminar un documento de la OC (y de Drive)

// POST /ocs/:id/documents/organize
// Reorganizar documentos (mover a carpeta de incidente)
// Llamado automáticamente cuando se genera el incidenteOc
```

### 3.5 Flujo de Documentos

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CREACIÓN DE OC                               │
│                                                                     │
│  Usuario adjunta PDFs → Suben a /Cotizaciones_Pendientes/{oc_id}/  │
│                         (carpeta temporal en Drive)                 │
│                                                                     │
│  Se crean registros en Document + OCDocument                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ESTADO: PENDIENTE / PROCESAR                     │
│                                                                     │
│  Documentos permanecen en carpeta temporal                          │
│  Usuario puede ver/agregar/eliminar documentos                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│           RPA PROCESA → GENERA incidenteOc (ej: INC-2026-001)       │
│                                                                     │
│  AUTOMÁTICO (en rpa.ts):                                            │
│  1. Crear carpeta /Incidentes/INC-2026-001/                         │
│  2. Mover todos los PDFs de la OC a esa carpeta                     │
│  3. Actualizar Document.driveFolderId                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ESTADO: PROCESADO+                             │
│                                                                     │
│  Documentos organizados en /Incidentes/{incidenteOc}/               │
│  Trazabilidad completa: OC ↔ incidente ↔ documentos                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Componentes Frontend

### 4.1 Componente de Adjuntos

**Nuevo archivo**: `apps/web/src/components/OcFileUploader.tsx`

```tsx
interface OcFileUploaderProps {
  ocId?: number;           // null si es OC nueva
  documents: Document[];   // Documentos ya adjuntos
  onUpload: (files: File[]) => Promise<void>;
  onRemove: (documentId: number) => Promise<void>;
  disabled?: boolean;      // Deshabilitar si OC está procesada
}

// Características:
// - Drag & drop de PDFs
// - Vista previa de nombres de archivo
// - Indicador de subida en progreso
// - Botón para ver en Drive (link externo)
// - Botón para eliminar (solo si estado permite)
```

### 4.2 Integración en Formularios

**OcSolicitudPage.tsx** - Reemplazar campo `linkCotizacion`:

```tsx
// ANTES
<Input type="url" placeholder="https://..." />

// DESPUÉS
<OcFileUploader
  documents={[]}
  onUpload={handleUploadCotizaciones}
  disabled={false}
/>
```

**OcGestionPage.tsx** - Mostrar documentos existentes:

```tsx
<OcFileUploader
  ocId={oc.id}
  documents={oc.documents}
  onUpload={handleUploadCotizaciones}
  onRemove={handleRemoveDocument}
  disabled={!['PENDIENTE', 'PROCESAR'].includes(oc.estado)}
/>
```

---

## 5. Plan de Implementación

### Fase 1: Base de Datos y Backend
1. ✅ Crear migración Prisma (Document, OCDocument)
2. ✅ Configurar googleapis package
3. ✅ Implementar GoogleDriveService
4. ✅ Crear endpoints /ocs/:id/documents
5. ✅ Modificar rpa.ts para reorganizar documentos al generar incidente

### Fase 2: Frontend
1. ✅ Crear componente OcFileUploader
2. ✅ Integrar en OcSolicitudPage
3. ✅ Integrar en OcGestionPage
4. ✅ Mostrar documentos en OcListadoPage

### Fase 3: Migración y Limpieza
1. ✅ Script para migrar linkCotizacion existentes (opcional)
2. ✅ Deprecar campo linkCotizacion (mantener para compatibilidad)
3. ✅ Documentación de configuración Drive

---

## 6. Consideraciones Técnicas

### 6.1 Seguridad
- **Service Account**: Usar cuenta de servicio para operaciones de Drive
- **Permisos**: Solo usuarios con permiso `ocs` pueden ver/subir documentos
- **Validación**: Solo aceptar PDFs, tamaño máximo configurable

### 6.2 Configuración sin Hardcodear
- Carpetas de Drive configurables via `.env`
- Nombres de carpetas construidos dinámicamente desde datos de OC/incidente
- Sin rutas hardcodeadas en código

### 6.3 Escalabilidad
- Modelo `Document` genérico para futuros usos (facturas, contratos)
- Categorías extensibles via enum
- Tabla pivot permite múltiples documentos por OC

### 6.4 Preservación del Flujo Actual
- ❌ No altera estados ni aprobaciones
- ❌ No modifica procesamiento RPA (solo agrega paso de organización)
- ❌ No rompe funcionalidad existente
- ✅ Campo linkCotizacion se mantiene (deprecated)

---

## 7. Dependencias a Instalar

```bash
# Backend
pnpm -C apps/api add googleapis @types/multer

# Frontend (si se usa componente de drag & drop)
pnpm -C apps/web add react-dropzone lucide-react
```

---

## 8. Archivos a Crear/Modificar

### Crear:
- `packages/db/migrations/YYYYMMDD_add_documents/migration.sql`
- `apps/api/src/services/google-drive.service.ts`
- `apps/api/src/oc-documents.ts`
- `apps/web/src/components/OcFileUploader.tsx`

### Modificar:
- `packages/db/schema.prisma` (añadir Document, OCDocument)
- `apps/api/.env.example` (añadir variables de Drive)
- `apps/api/src/index.ts` (registrar nuevas rutas)
- `apps/api/src/rpa.ts` (añadir reorganización de documentos)
- `apps/web/src/pages/purchase-orders/OcSolicitudPage.tsx`
- `apps/web/src/pages/purchase-orders/OcGestionPage.tsx`

---

## 9. Resumen Ejecutivo

| Aspecto | Estado Actual | Propuesta |
|---------|---------------|-----------|
| **Cotizaciones** | Link manual externo | PDFs adjuntos directamente |
| **Almacenamiento** | Usuario gestiona | Google Drive centralizado |
| **Organización** | Manual por usuario | Automática al generar incidente |
| **Trazabilidad** | Ninguna | OC ↔ incidente ↔ documentos |
| **UX** | Copiar/pegar URL | Drag & drop nativo |

**Resultado esperado**: Sistema de gestión documental integrado que reduce errores humanos, centraliza documentación y automatiza la organización según el ciclo de vida de la OC.

---

*Documento generado el 18/12/2024 - Análisis completo del repositorio ppto-app*

---

## 10. Instrucciones de Configuración y Despliegue

### 10.1 Aplicar Migración de Base de Datos

```bash
cd packages/db
npx prisma migrate deploy
npx prisma generate
```

### 10.2 Configurar Google Drive (Opcional)

1. **Crear Service Account en Google Cloud Console**:
   - Ir a https://console.cloud.google.com/
   - Crear proyecto o usar existente
   - Habilitar Google Drive API
   - Crear Service Account y descargar JSON de credenciales

2. **Crear carpeta raíz en Drive**:
   - Crear carpeta "OCs_Documentos" (o nombre deseado)
   - Compartir con el email del Service Account (con permisos de Editor)
   - Copiar ID de carpeta de la URL

3. **Configurar variables de entorno** en `apps/api/.env`:
   ```env
   GDRIVE_ENABLED=true
   GDRIVE_OC_ROOT_FOLDER_ID=<ID_de_carpeta>
   GDRIVE_SERVICE_ACCOUNT_PATH=./credentials/service-account.json
   ```

### 10.3 Sin Google Drive (Modo Fallback)

Si `GDRIVE_ENABLED=false`, el sistema:
- Muestra mensaje informativo en el componente de adjuntos
- No bloquea la creación/edición de OCs
- Mantiene compatibilidad con el campo `linkCotizacion` legacy

### 10.4 Verificar Implementación

```bash
# Backend
cd apps/api
pnpm dev

# Frontend  
cd apps/web
pnpm dev
```

Probar en:
- **Solicitud OC** (`/ocs/solicitud`): Crear OC con PDFs adjuntos
- **Gestión OC** (`/ocs/gestion`): Editar OC existente y gestionar documentos

---

## 11. Archivos Creados/Modificados

### Creados:
- `packages/db/migrations/20251218100000_add_documents_system/migration.sql`
- `apps/api/src/google-drive.ts` - Servicio de Google Drive
- `apps/api/src/oc-documents.ts` - Endpoints de documentos
- `apps/web/src/components/OcFileUploader.tsx` - Componente de adjuntos

### Modificados:
- `packages/db/schema.prisma` - Modelos Document, OCDocument, enum DocumentCategory
- `apps/api/.env.example` - Variables de Google Drive
- `apps/api/src/index.ts` - Registro de rutas
- `apps/api/src/rpa.ts` - Reorganización automática de documentos
- `apps/web/src/pages/purchase-orders/OcSolicitudPage.tsx` - Integración uploader
- `apps/web/src/pages/purchase-orders/OcGestionPage.tsx` - Integración uploader

---

*Documento generado el 18/12/2024 - Análisis e implementación de gestión documental para OCs*
