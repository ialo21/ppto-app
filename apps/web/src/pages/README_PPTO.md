# Página PPTO - Documentación

## Descripción General

La página PPTO (`/ppto`) es una interfaz unificada para gestionar presupuestos mensuales y anuales con capacidades de edición en línea, filtros avanzados y carga masiva desde CSV.

## Características Principales

### 1. **Vista Mensual (Detalle)**
- Tabla editable con columnas: Sustento | CECO | Monto (PEN) | Gerencia | Área
- Edición inline solo si el período NO está cerrado (`isClosed = false`)
- Validación en tiempo real (≥0, máximo 2 decimales)
- Ordenamiento por columna (Sustento, CECO, Monto)
- Total dinámico del resultado filtrado
- Dirty state visual y botón "Guardar cambios" habilitado solo si hay cambios válidos

### 2. **Vista Anual (Matriz)**
- Matriz de 12 meses (Ene-Dic) con columnas fijas: Sustento | CECO
- Columnas dinámicas para cada mes
- Columna de total anual por fila
- Fila de totales por mes y total anual
- Edición inline bloqueada para meses cerrados (tooltip "Período cerrado")
- Guardado batch de cambios múltiples

### 3. **Controles y Filtros**
- **Año**: Selector dinámico desde la tabla `Period` (sin hardcode)
- **Período (Mes)**: Solo en vista mensual, periodos del año seleccionado
- **Toggle Mensual | Anual**: Persiste en `localStorage.ppto.viewMode`
- **Búsqueda**: Texto libre para filtrar por sustento o CECO
- **Filtros**: Gerencia, Área, Paquete, Concepto (cascada: Área depende de Gerencia, Concepto de Paquete)

### 4. **Carga Masiva (CSV)**
- Reutiliza componente `BulkUploader`
- Formato CSV: `supportName,costCenterCode,ene,feb,mar,abr,may,jun,jul,ago,sep,oct,nov,dic`
- Parámetros:
  - `year`: Tomado del año seleccionado en la UI
  - `overwriteBlanks`: Switch "Sobrescribir vacíos como 0" (default: `false`)
- Dry-run (preview) antes de confirmar
- Validación y reporte de errores por columna
- Invalidación de caché tras carga exitosa

### 5. **Persistencia y Auto-selección**
- **localStorage**:
  - `ppto.viewMode`: "monthly" | "annual"
  - `ppto.year`: Año seleccionado
  - `ppto.periodId`: Período seleccionado (solo mensual)
- **Auto-selección al entrar**:
  - **Año**: Año actual si existe en la BD, si no el más reciente
  - **Período**: Último período abierto del año; si todos cerrados, el último del año

### 6. **Accesibilidad y UX**
- **Enter**: Mover al siguiente input (abajo)
- **Shift+Enter**: Mover al input anterior (arriba)
- **Esc**: Cancelar edición de celda actual
- Tooltips en celdas de meses cerrados
- Estados vacíos claros con CTA a gestión de períodos
- Feedback visual: celdas dirty (fondo amarillo), errores (borde rojo)

## Endpoints Utilizados

### Vista Mensual
#### GET `/budgets/detailed`
**Params**:
- `periodId` (number, required)
- `versionId` (number, optional)
- `search` (string, optional)
- `managementId` (number, optional)
- `areaId` (number, optional)
- `packageId` (number, optional)
- `conceptId` (number, optional)

**Response**:
```typescript
{
  versionId: number;
  periodId: number;
  period: { id, year, month, label?, closures };
  isClosed: boolean;
  rows: Array<{
    supportId: number;
    supportCode: string | null;
    supportName: string;
    costCenterId: number;
    costCenterCode: string;
    costCenterName: string | null;
    amountPen: number;
    management?: string;
    area?: string;
  }>;
  supportsWithoutCostCenters?: Array<{ supportId, supportName, supportCode }>;
}
```

#### PUT `/budgets/detailed/batch`
**Body**:
```typescript
{
  periodId: number;
  items: Array<{
    supportId: number;
    costCenterId: number;
    amountPen: number;
  }>;
}
```

**Response**:
```typescript
{
  versionId: number;
  count: number; // number of upserts
}
```

### Vista Anual
#### GET `/budgets/annual`
**Params**:
- `year` (number, required)
- `search` (string, optional)
- `managementId` (number, optional)
- `areaId` (number, optional)
- `packageId` (number, optional)
- `conceptId` (number, optional)

**Response**:
```typescript
{
  year: number;
  versionId: number;
  periods: Array<{ periodId, month, label?, isClosed }>;
  rows: Array<{
    supportId: number;
    supportName: string;
    supportCode: string | null;
    costCenterId: number;
    costCenterCode: string;
    costCenterName: string | null;
    managementName?: string;
    areaName?: string;
    months: Record<string, { // "01", "02", ..., "12"
      periodId: number;
      isClosed: boolean;
      amountPen: number;
    }>;
    totalYear: number;
  }>;
}
```

#### PUT `/budgets/annual/batch`
**Body**:
```typescript
{
  changes: Array<{
    supportId: number;
    costCenterId: number;
    periodId: number;
    amountPen: number;
  }>;
}
```

**Response**:
```typescript
{
  count: number; // successful upserts
  skipped: number; // periods closed
}
```

### Carga CSV
#### GET `/bulk/template/budget`
**Response**: CSV file download with headers and examples

#### POST `/bulk/catalogs?type=budget&year=YYYY&dryRun=true&overwriteBlanks=false`
**Body**: FormData with CSV file
- `type=budget` (required)
- `year` (number, required): Year for all months
- `dryRun` (boolean, default: `true`): Preview mode
- `overwriteBlanks` (boolean, default: `false`): Treat empty cells as 0

**Response**:
```typescript
{
  dryRun: boolean;
  summary: {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  byType: Record<string, { created, updated, skipped, errors }>;
  rows: Array<{
    row: number;
    type: string;
    action: "created" | "updated" | "skipped" | "error";
    message: string;
    issues?: Array<{ path: string[], message: string }>;
  }>;
}
```

### Otros Endpoints
#### GET `/periods/years`
**Response**:
```typescript
Array<{ year: number }>
```

#### GET `/periods`
**Response**:
```typescript
Array<{
  id: number;
  year: number;
  month: number;
  label?: string;
  closures?: any; // If not null, period is closed
}>
```

#### GET `/managements`, `/areas`, `/expense-packages`, `/cost-centers`
Standard catalog endpoints (see `useCatalogData.ts` hooks)

## Flujo de Usuario

### Escenario 1: Edición Mensual
1. Usuario entra a `/ppto`
2. Auto-selección de año actual y último mes abierto
3. Filtra por Gerencia y Área
4. Edita montos de 3 filas
5. Click "Guardar cambios"
6. Toast de éxito, tabla se refresca

### Escenario 2: Edición Anual
1. Toggle a "Anual"
2. Año 2025 seleccionado
3. Edita celdas de Ene, Feb, Mar en varias filas
4. Sistema bloquea meses cerrados
5. Click "Guardar cambios"
6. Notificación: "X actualizados, Y omitidos (períodos cerrados)"

### Escenario 3: Carga CSV
1. Selecciona año 2025
2. Descargar plantilla CSV
3. Completa archivo con datos
4. Activa "Sobrescribir vacíos como 0"
5. Vista previa (dry-run): muestra 10 errores en columna "abr"
6. Corrige archivo
7. Nueva vista previa: 0 errores
8. Confirmar
9. Sistema guarda y refresca vistas mensual/anual

## Validaciones

### Cliente
- Monto ≥ 0
- Máximo 2 decimales
- Inputs deshabilitados si `isClosed = true`

### Servidor
- Período existe y pertenece al año especificado (CSV)
- Sustento y CECO existen en BD
- Único constraint: `(versionId, periodId, supportId, costCenterId)`
- Períodos cerrados: rechaza cambios en `/batch` endpoints

## Cache Invalidation
Tras guardar cambios (mensual, anual o CSV), se invalidan:
- `["budgets-detailed", *]`
- `["budgets-annual", *]`

## Notas Técnicas

### Dirty State Management
- Vista mensual: `Map<"${supportId}-${costCenterId}", EditedValue>`
- Vista anual: `Map<"${supportId}-${costCenterId}-${month}", AnnualEditedValue>`

### Keyboard Navigation
- Usa `inputRefs` (`Map<key, HTMLInputElement>`) para focus management
- Enter/Shift+Enter navega en el array ordenado de filas

### Performance
- `useMemo` para cálculo de totales y ordenamiento
- Queries habilitadas condicionalmente (`enabled` flag)
- Paginación no implementada (asumir < 1000 filas por query)

## Mejoras Futuras
- Paginación para datasets grandes (>1000 filas)
- Exportar a Excel (vista mensual y anual)
- Historial de cambios (audit log)
- Comparación año vs año
- Gráficos de distribución por Gerencia/Área

