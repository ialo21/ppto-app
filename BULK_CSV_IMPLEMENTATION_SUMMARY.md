# Resumen de Implementación: Carga Masiva por CSV

## Fecha
4 de Noviembre, 2025

## Objetivo
Implementar una funcionalidad de carga masiva por CSV para todos los catálogos del sistema, siguiendo un enfoque de **descubrimiento sin suposiciones**.

## Descubrimiento Completado

### Entidades Soportadas (nombres exactos del esquema)

1. **Management** (Gerencias)
   - Campos obligatorios: `name` (único, case-insensitive)
   - Campos opcionales: `code`, `active`
   - Restricciones: Índice único `LOWER(name)`
   - Relaciones: Tiene muchas `Area`

2. **Area** (Áreas)
   - Campos obligatorios: `name` (único, case-insensitive), `managementId`
   - Campos opcionales: `code`, `active`
   - Restricciones: Índice único `LOWER(name)`
   - Relaciones: Pertenece a `Management` (CASCADE delete)

3. **ExpensePackage** (Paquetes de gasto)
   - Campos obligatorios: `name` (único, case-insensitive)
   - Restricciones: Índice único `LOWER(name)`
   - Relaciones: Tiene muchos `ExpenseConcept`

4. **ExpenseConcept** (Conceptos de gasto)
   - Campos obligatorios: `name`, `packageId`
   - Restricciones: Índice único compuesto `(packageId, LOWER(name))`
   - Relaciones: Pertenece a `ExpensePackage` (CASCADE delete)

5. **CostCenter** (Centros de costo)
   - Campos obligatorios: `code` (único), `name` (único, case-insensitive)
   - Restricciones: Índice único en `code` y `LOWER(name)`

6. **Articulo** (Artículos)
   - Campos obligatorios: `code` (único), `name` (único, case-insensitive)
   - Restricciones: Índice único en `code` y `LOWER(name)`

7. **Support** (Sustentos)
   - Campos obligatorios: `name` (único, case-insensitive)
   - Campos opcionales: `code`, `managementId`, `areaId`, `costCenterId`, `expensePackageId`, `expenseConceptId`, `expenseType`, `active`
   - Restricciones: Índice único `LOWER(name)`
   - Relaciones: Puede referenciar a todas las entidades anteriores

### Orden de Dependencias (derivado del esquema real)

**Nivel 1** (sin dependencias):
- Management
- ExpensePackage
- CostCenter
- Articulo

**Nivel 2** (dependen de Nivel 1):
- Area (requiere Management)
- ExpenseConcept (requiere ExpensePackage)

**Nivel 3** (puede depender de todo):
- Support (puede referenciar a Management, Area, CostCenter, ExpensePackage, ExpenseConcept)

## Implementación

### Backend

#### Archivo: `apps/api/src/bulk.ts`

Funcionalidades implementadas:
- **Parser CSV robusto**: Maneja UTF-8, BOM, comillas, escapado de caracteres especiales
- **Validación con Zod**: Schema `csvRowSchema` para cada fila del CSV
- **Procesamiento ordenado**: Las filas se ordenan automáticamente por tipo según dependencias
- **Upsert idempotente**: Crea o actualiza según claves lógicas (nombres)
- **Resolución de referencias**: Por nombres (case-insensitive), no por IDs
- **Dry-Run**: Simula la carga sin persistir cambios
- **Manejo de errores**: 
  - Nunca devuelve 500 por datos inválidos
  - Responde 422 con `issues` detallados por fila
  - Errores no abortan todo el lote (continúa procesando)

#### Endpoints

1. **GET `/bulk/template`**
   - Genera y descarga una plantilla CSV con cabeceras y ejemplos
   - Incluye 2-3 filas de ejemplo por cada tipo de entidad
   - UTF-8 con BOM para compatibilidad con Excel

2. **POST `/bulk/catalogs?dryRun=true|false`**
   - Acepta archivo CSV (multipart/form-data)
   - Límite: 5 MB, 1 archivo
   - Valida formato y referencias
   - Respuesta JSON con reporte detallado

#### Respuesta del endpoint

```json
{
  "dryRun": true|false,
  "summary": {
    "created": 10,
    "updated": 5,
    "skipped": 3,
    "errors": 2
  },
  "byType": {
    "Management": { "created": 2, "updated": 0, "skipped": 0, "errors": 0 },
    "Area": { "created": 5, "updated": 2, "skipped": 1, "errors": 1 },
    ...
  },
  "rows": [
    {
      "row": 2,
      "type": "Management",
      "action": "created",
      "message": "Gerencia \"Tecnología\" creada"
    },
    {
      "row": 5,
      "type": "Area",
      "action": "error",
      "message": "Gerencia \"Marketing\" no encontrada",
      "issues": [
        { "path": ["managementName"], "message": "Gerencia no existe" }
      ]
    }
  ]
}
```

### Frontend

#### Archivo: `apps/web/src/pages/SettingsPage.tsx`

Componente nuevo: `BulkUploadSection`

Funcionalidades implementadas:
- **Selector de archivo**: Drag & drop + input file (solo .csv, max 5 MB)
- **Switch Dry-Run**: Activado por defecto para vista previa segura
- **Botón "Descargar Plantilla"**: Descarga el CSV de ejemplo desde el backend
- **Botón "Vista Previa"**: Procesa el CSV en modo Dry-Run
- **Botón "Confirmar y Guardar"**: Aparece solo si Dry-Run exitoso (sin errores)
- **Resumen visual**: Tarjetas con totales por acción (creados, actualizados, omitidos, errores)
- **Resumen por tipo**: Grid con estadísticas por cada tipo de entidad
- **Tabla de detalle**:
  - Filtros por tipo de entidad y acción
  - Paginación (20 filas por página)
  - Coloración por acción (verde=created, azul=updated, amarillo=skipped, rojo=error)
  - Muestra `issues` detallados para errores
- **Invalidación de queries**: Refresca automáticamente todos los catálogos tras carga exitosa

### Documentación

#### Archivo: `apps/web/src/pages/catalogs/BULK_CSV_README.md`

Incluye:
- Descripción completa de todas las entidades soportadas
- Tabla de cabeceras del CSV con descripción, obligatoriedad y valores válidos
- Reglas de validación por cada tipo de entidad
- Orden de dependencias recomendado
- Explicación detallada del modo Dry-Run
- Ejemplos de CSV por cada caso de uso (gerencias, áreas, paquetes, conceptos, sustentos completos)
- Manejo de errores y códigos HTTP
- Límites y consideraciones técnicas
- Guía paso a paso de uso en la UI
- Documentación de los endpoints API
- Solución de problemas comunes

## Cabeceras Finales del CSV

```
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
```

### Descripción de las columnas

- **type**: Tipo de entidad (Management, Area, ExpensePackage, ExpenseConcept, CostCenter, Articulo, Support)
- **name**: Nombre del ítem (obligatorio, único por tipo, case-insensitive)
- **code**: Código alfanumérico (obligatorio para CostCenter y Articulo, opcional para otros)
- **managementName**: Referencia a gerencia por nombre (obligatorio para Area, opcional para Support)
- **areaName**: Referencia a área por nombre (opcional para Support)
- **packageName**: Referencia a paquete por nombre (obligatorio para ExpenseConcept, opcional para Support)
- **conceptName**: Referencia a concepto por nombre (opcional para Support, requiere packageName)
- **costCenterCode**: Referencia a centro de costo por código (opcional para Support)
- **expenseType**: Tipo de gasto (ADMINISTRATIVO, PRODUCTO, DISTRIBUIBLE - solo para Support)
- **active**: Estado activo (true/false/1/0/yes/no/sí/si, default: true)

## Validaciones y Restricciones (del esquema real)

### Unicidad case-insensitive
Todos los nombres se validan con índices `LOWER(name)`:
- Management.name
- Area.name
- ExpensePackage.name
- ExpenseConcept.name (único por packageId)
- CostCenter.name
- Articulo.name
- Support.name

### Códigos únicos
- CostCenter.code (obligatorio, único)
- Articulo.code (obligatorio, único)
- Support.code (opcional, único si se proporciona)

### Relaciones CASCADE
- Area.managementId → Management.id (ON DELETE CASCADE)
- ExpenseConcept.packageId → ExpensePackage.id (ON DELETE CASCADE)
- Support.* → SET NULL o CASCADE según el campo

## Cómo probar en local

1. **Iniciar la base de datos**:
   ```bash
   pnpm db:up
   ```

2. **Aplicar migraciones** (si aún no están aplicadas):
   ```bash
   pnpm migrate:deploy
   ```

3. **Iniciar el servidor de desarrollo**:
   ```bash
   pnpm dev
   ```
   Esto inicia:
   - API en `http://localhost:3001`
   - Web en `http://localhost:5173`

4. **Navegar a Catálogos**:
   - Ir a `http://localhost:5173`
   - Click en "Catálogos" en el menú
   - Click en la pestaña "Carga masiva (CSV)"

5. **Descargar plantilla**:
   - Click en "📥 Descargar Plantilla CSV"
   - Se descarga `catalogs_template.csv` con ejemplos

6. **Editar el CSV**:
   - Abrir con Excel, LibreOffice, o un editor de texto
   - Modificar/agregar datos según necesites
   - Guardar como UTF-8

7. **Probar Dry-Run**:
   - Subir el CSV editado
   - Dejar marcado "Modo Vista Previa"
   - Click en "Vista Previa"
   - Revisar el reporte de resultados

8. **Confirmar carga**:
   - Si todo está OK (sin errores), click en "✓ Confirmar y Guardar"
   - Los catálogos se actualizarán automáticamente en la UI

## Pruebas recomendadas

### Caso 1: Crear jerarquía completa
```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
Management,Gerencia Test,,,,,,,,true
Area,Área Test 1,,Gerencia Test,,,,,true
Area,Área Test 2,,Gerencia Test,,,,,true
ExpensePackage,Paquete Test,,,,,,,,
ExpenseConcept,Concepto Test 1,,,,Paquete Test,,,,
ExpenseConcept,Concepto Test 2,,,,Paquete Test,,,,
CostCenter,Centro Test,CC-TEST,,,,,,,
Articulo,Artículo Test,ART-TEST,,,,,,,
Support,Sustento Test,SUP-TEST,Gerencia Test,Área Test 1,Paquete Test,Concepto Test 1,CC-TEST,ADMINISTRATIVO,true
```

### Caso 2: Error de referencia faltante
```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
Area,Área Huérfana,,Gerencia Inexistente,,,,,true
```
Resultado esperado: Error "Gerencia \"Gerencia Inexistente\" no encontrada"

### Caso 3: Actualización de existente
```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
Management,Gerencia Existente,,,,,,,,true
```
Si ya existe, resultado esperado: Skipped "Gerencia \"Gerencia Existente\" ya existe"

### Caso 4: Duplicado en mismo CSV
```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
Management,Gerencia Duplicada,,,,,,,,true
Management,Gerencia Duplicada,,,,,,,,true
```
Primera fila: Created, Segunda fila: Skipped

## Archivos modificados/creados

### Backend
- ✅ `apps/api/src/bulk.ts` (nuevo, 850+ líneas)
- ✅ `apps/api/src/index.ts` (agregado import y registro de rutas)
- ✅ `apps/api/package.json` (agregada dependencia `@fastify/multipart`)

### Frontend
- ✅ `apps/web/src/pages/SettingsPage.tsx` (agregada sección bulk + componente `BulkUploadSection`)

### Documentación
- ✅ `apps/web/src/pages/catalogs/BULK_CSV_README.md` (nuevo, documentación completa)
- ✅ `BULK_CSV_IMPLEMENTATION_SUMMARY.md` (este archivo)

## Estado de entrega

✅ **Endpoint de carga**: Implementado y funcional
✅ **Generación de plantilla**: CSV con ejemplos reales
✅ **Parser CSV robusto**: UTF-8, BOM, comillas, escapado
✅ **Validaciones**: Exactamente según el esquema de Prisma
✅ **Resolución de dependencias**: Orden automático por tipo
✅ **Dry-Run**: Vista previa sin persistir
✅ **UI completa**: Upload, preview, confirmación, filtros, paginación
✅ **Manejo de errores**: 422 con issues detallados, nunca 500
✅ **Documentación**: README completo con ejemplos
✅ **Build exitoso**: `pnpm build` sin errores
✅ **Sin cambios en schema**: No se modificó `schema.prisma`
✅ **Invalidación de queries**: Refresco automático de UI tras carga

## Criterios de aceptación cumplidos

✅ CSV y plantilla reflejan exactamente el esquema real (sin inventar nada)
✅ Dry-Run muestra reporte por fila antes de confirmar
✅ Confirmar persiste respetando dependencias y unicidad
✅ Sin duplicados (validación case-insensitive según índices)
✅ Catálogos en UI se refrescan automáticamente
✅ Sin 500 por datos inválidos (422 con issues)
✅ No se rompe nada existente (UI ni API actuales)

## Notas adicionales

- **Idioma**: Toda la UI y mensajes están en español
- **Compatibilidad**: CSV funciona con Excel, LibreOffice, Google Sheets
- **Performance**: Límite 5 MB es suficiente para miles de registros
- **Seguridad**: Validaciones en backend evitan inyección de datos inválidos
- **UX**: Dry-Run por defecto evita errores accidentales
- **Extensibilidad**: Fácil agregar nuevos tipos de entidad en el futuro

## Próximos pasos sugeridos (opcional)

1. Agregar autenticación/autorización para el endpoint `/bulk/*`
2. Logging de quién realizó cada carga masiva
3. Historial de cargas previas con posibilidad de rollback
4. Validaciones de negocio adicionales si se requieren
5. Export de catálogos existentes a CSV para facilitar edición
6. Soporte para archivos Excel (.xlsx) directamente
7. Webhook o notificación por email tras completar carga grande

---

**Implementado por**: Claude Sonnet 4.5
**Fecha**: 4 de Noviembre, 2025
**Versión**: 1.0

