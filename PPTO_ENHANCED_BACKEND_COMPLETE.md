# ✅ Backend PPTO Mejorado - Completado

## Resumen

Se ha completado exitosamente la implementación del backend para las mejoras del módulo PPTO, incluyendo:
- Carga masiva CSV reutilizando pipeline de Catálogos
- Vista anual (matriz 12 meses)
- Filtros avanzados en vista mensual

## 🎯 Cambios Implementados

### 1. Extensión de Bulk CSV para Presupuesto

**Archivo**: `apps/api/src/bulk.ts`

#### Schema Budget Agregado

```typescript
const budgetSchema = z.object({
  type: z.literal("Budget"),
  supportName: z.string().min(1, "supportName es obligatorio"),
  costCenterCode: z.string().min(1, "costCenterCode es obligatorio"),
  ene: z.string().optional(),
  feb: z.string().optional(),
  // ... 12 meses ...
  dic: z.string().optional()
});
```

#### Función `processBudget`

Características:
- ✅ Resuelve `supportName` → `supportId` (case-insensitive)
- ✅ Resuelve `costCenterCode` → `costCenterId` (case-insensitive)
- ✅ Obtiene versión activa de presupuesto
- ✅ Obtiene períodos del año especificado
- ✅ Valida que los períodos existan
- ✅ Valida que los períodos no estén cerrados (isClosed)
- ✅ Procesa cada mes individualmente:
  - Valor vacío + `overwriteBlanks=true` → guarda 0
  - Valor vacío + `overwriteBlanks=false` → no toca
  - Valor presente → valida >= 0 y procesa
- ✅ Genera issues detallados por columna (mes)
- ✅ Upsert en transacción usando constraint único

#### Endpoints Agregados

**GET `/bulk/template/budget`**
- Descarga plantilla CSV con encabezados correctos
- Ejemplos de datos en filas

Formato:
```csv
supportName,costCenterCode,ene,feb,mar,abr,may,jun,jul,ago,sep,oct,nov,dic
```

**POST `/bulk/catalogs` con type=Budget**

Query params:
- `dryRun` (default: true) - Vista previa sin guardar
- `year` - **Requerido** - Año para el cual importar (ej: 2026)
- `overwriteBlanks` (default: false) - Si true, celdas vacías → 0

Respuesta (igual que otros tipos):
```json
{
  "dryRun": true/false,
  "summary": {
    "created": 10,
    "updated": 5,
    "skipped": 2,
    "errors": 1
  },
  "byType": {
    "Budget": { "created": 10, "updated": 5, "skipped": 2, "errors": 1 }
  },
  "rows": [
    {
      "row": 2,
      "type": "Budget",
      "action": "created",
      "message": "\"Licencias Microsoft\" - \"CC-001\": 12 meses procesados"
    },
    {
      "row": 3,
      "type": "Budget",
      "action": "error",
      "message": "Errores en fila: 2 problemas encontrados",
      "issues": [
        { "path": ["ene"], "message": "Periodo 2026-01 está cerrado" },
        { "path": ["mar"], "message": "Valor inválido: \"abc\"" }
      ]
    }
  ]
}
```

### 2. Vista Anual (Matriz)

**Archivo**: `apps/api/src/budgets-detailed.ts`

#### GET `/budgets/annual`

Query params:
- `year` - **Requerido** - Año a consultar
- `search` - Búsqueda por texto (sustento/CECO)
- `managementId` - Filtro por gerencia
- `areaId` - Filtro por área
- `packageId` - Filtro por paquete de gasto
- `conceptId` - Filtro por concepto de gasto

Respuesta:
```json
{
  "versionId": 1,
  "year": 2026,
  "rows": [
    {
      "supportId": 1,
      "supportName": "Licencias Microsoft",
      "supportCode": "SUP-001",
      "costCenterId": 5,
      "costCenterCode": "CC-001",
      "costCenterName": "Tecnología",
      "managementName": "Gerencia TI",
      "areaName": "Infraestructura",
      "months": {
        "01": { "periodId": 1, "isClosed": false, "amountPen": 5000 },
        "02": { "periodId": 2, "isClosed": false, "amountPen": 5000 },
        // ... 12 meses ...
        "12": { "periodId": 12, "isClosed": true, "amountPen": 5000 }
      },
      "totalYear": 60000
    }
  ],
  "monthTotals": {
    "01": 10000,
    "02": 10000,
    // ... 12 meses ...
    "12": 10000
  },
  "yearTotal": 120000
}
```

Características:
- ✅ Retorna matriz completa del año (12 meses)
- ✅ Una fila por (sustento, CECO)
- ✅ Indica si cada mes está cerrado
- ✅ Totales por fila y por mes
- ✅ Total anual
- ✅ Soporta todos los filtros

#### PUT `/budgets/annual/batch`

Body:
```json
{
  "changes": [
    {
      "supportId": 1,
      "costCenterId": 5,
      "periodId": 1,
      "amountPen": 5500
    },
    {
      "supportId": 1,
      "costCenterId": 5,
      "periodId": 2,
      "amountPen": 5200
    }
  ]
}
```

Respuesta:
```json
{
  "success": true,
  "count": 2,
  "skipped": 0
}
```

Características:
- ✅ Guardado batch en transacción
- ✅ Filtra automáticamente meses cerrados (los omite)
- ✅ Upsert por (versionId, periodId, supportId, costCenterId)
- ✅ Retorna count de guardados y skipped

### 3. Filtros en Vista Mensual

**Archivo**: `apps/api/src/budgets-detailed.ts`

#### GET `/budgets/detailed` (mejorado)

Query params agregados:
- `managementId` - Filtro por gerencia
- `areaId` - Filtro por área
- `packageId` - Filtro por paquete de gasto
- `conceptId` - Filtro por concepto de gasto

Los filtros se aplican a los sustentos antes de generar las combinaciones (sustento, CECO).

## 📊 Validaciones Implementadas

### Carga CSV Budget

| Validación | Comportamiento |
|------------|----------------|
| `supportName` no encontrado | Error: "Sustento no encontrado" |
| `costCenterCode` no encontrado | Error: "CECO no existe" |
| Período no existe para mes | Issue en columna del mes |
| Período cerrado | Issue en columna del mes, no guarda |
| Valor negativo | Issue: "Valor negativo no permitido" |
| Valor no numérico | Issue: "Valor inválido" |
| Celda vacía + `overwriteBlanks=false` | No procesa ese mes |
| Celda vacía + `overwriteBlanks=true` | Guarda 0 |
| Sin versión ACTIVE | Error general |
| Sin períodos para año | Error general |

### Vista Anual

| Validación | Comportamiento |
|------------|----------------|
| `year` faltante | Error 400 |
| Sin versión ACTIVE | Error 400 |
| Período cerrado en batch | Se omite automáticamente, se cuenta en `skipped` |

## 🔄 Compatibilidad

✅ **100% Compatible** con implementación anterior:
- Vista mensual sigue funcionando igual
- Agregados solo nuevos filtros opcionales
- Nueva vista anual no afecta la mensual
- Bulk reutiliza pipeline existente de Catálogos

## 📝 Ejemplos de Uso

### 1. Carga CSV Dry-Run

```bash
# 1. Descargar plantilla
GET /bulk/template/budget

# 2. Editar CSV con datos

# 3. Dry-run
POST /bulk/catalogs?dryRun=true&year=2026&overwriteBlanks=false
Content-Type: multipart/form-data
file: budget.csv

# 4. Confirmar (si sin errores)
POST /bulk/catalogs?dryRun=false&year=2026&overwriteBlanks=false
file: budget.csv
```

### 2. Vista Anual con Filtros

```bash
# Matriz completa del año
GET /budgets/annual?year=2026

# Con filtros
GET /budgets/annual?year=2026&managementId=1&search=microsoft

# Guardar cambios
PUT /budgets/annual/batch
{
  "changes": [...]
}
```

### 3. Vista Mensual con Filtros

```bash
# Mes con filtros
GET /budgets/detailed?periodId=123&managementId=1&areaId=5&search=licencias
```

## ✅ Estado

- [x] Bulk CSV para Budget implementado
- [x] Template CSV de Budget
- [x] Procesador de Budget con todas las validaciones
- [x] Soporte para year y overwriteBlanks
- [x] Vista anual GET endpoint
- [x] Vista anual batch PUT endpoint
- [x] Filtros en vista mensual
- [x] Sin errores de linting
- [x] Constraint único verificado

## 📋 Próximos Pasos (Frontend)

1. Crear componente reutilizable de BulkUploader
2. Mejorar BudgetPage con:
   - Toggle Mensual/Anual
   - Filtros (Gerencia, Área, Paquete, Concepto)
   - Vista anual (matriz 12 meses)
   - Carga masiva CSV integrada
   - Auto-selección de año/período
   - Persistencia en localStorage

---

**Fecha**: 11/11/2025
**Estado Backend**: ✅ COMPLETADO
**Sin errores de linting**: ✅

