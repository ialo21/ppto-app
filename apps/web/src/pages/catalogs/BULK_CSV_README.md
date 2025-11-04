# Carga Masiva de Catálogos por CSV

## Descripción

Este módulo permite importar múltiples ítems de catálogos desde un archivo CSV. Soporta las siguientes entidades:
- **Management** (Gerencias)
- **Area** (Áreas organizacionales)
- **ExpensePackage** (Paquetes de gasto)
- **ExpenseConcept** (Conceptos de gasto)
- **CostCenter** (Centros de costo)
- **Articulo** (Artículos)
- **Support** (Sustentos)

## Formato del CSV

### Cabeceras obligatorias

```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
```

### Descripción de columnas

| Columna | Descripción | Obligatorio | Valores válidos |
|---------|-------------|-------------|-----------------|
| `type` | Tipo de entidad | Sí | `Management`, `Area`, `ExpensePackage`, `ExpenseConcept`, `CostCenter`, `Articulo`, `Support` |
| `name` | Nombre del ítem | Sí | Texto (único por entidad, case-insensitive) |
| `code` | Código del ítem | Depende | Requerido para `CostCenter` y `Articulo` |
| `managementName` | Nombre de la gerencia (referencia) | Condicional | Requerido para `Area` y opcional para `Support` |
| `areaName` | Nombre del área (referencia) | No | Opcional para `Support` |
| `packageName` | Nombre del paquete (referencia) | Condicional | Requerido para `ExpenseConcept` y opcional para `Support` |
| `conceptName` | Nombre del concepto (referencia) | No | Opcional para `Support` (requiere `packageName`) |
| `costCenterCode` | Código del centro de costo (referencia) | No | Opcional para `Support` |
| `expenseType` | Tipo de gasto | No | `ADMINISTRATIVO`, `PRODUCTO`, `DISTRIBUIBLE` (solo para `Support`) |
| `active` | Estado activo | No | `true`, `false`, `1`, `0`, `yes`, `no`, `sí`, `si` (default: `true`) |

### Reglas de validación

#### Management (Gerencias)
- **Obligatorios**: `type=Management`, `name`
- **Opcionales**: `code`, `active`
- **Restricciones**: `name` debe ser único (case-insensitive)

#### Area (Áreas)
- **Obligatorios**: `type=Area`, `name`, `managementName`
- **Opcionales**: `code`, `active`
- **Restricciones**: 
  - `name` debe ser único (case-insensitive)
  - `managementName` debe referenciar a una gerencia existente

#### ExpensePackage (Paquetes)
- **Obligatorios**: `type=ExpensePackage`, `name`
- **Restricciones**: `name` debe ser único (case-insensitive)

#### ExpenseConcept (Conceptos)
- **Obligatorios**: `type=ExpenseConcept`, `name`, `packageName`
- **Restricciones**: 
  - `name` debe ser único por paquete (case-insensitive)
  - `packageName` debe referenciar a un paquete existente

#### CostCenter (Centros de costo)
- **Obligatorios**: `type=CostCenter`, `name`, `code`
- **Restricciones**: 
  - **`code` debe ser único (case-insensitive)** - Es la clave principal
  - `name` **puede duplicarse** - Se identifica por código
- **Upsert**: Por código. Si el código existe, actualiza el nombre

#### Articulo (Artículos)
- **Obligatorios**: `type=Articulo`, `name`, `code`
- **Restricciones**: 
  - **`code` debe ser único (case-insensitive)** - Es la clave principal
  - `name` **puede duplicarse** - Se identifica por código
- **Upsert**: Por código. Si el código existe, actualiza el nombre

#### Support (Sustentos)
- **Obligatorios**: `type=Support`, `name`
- **Opcionales**: `code`, `managementName`, `areaName`, `packageName`, `conceptName`, `costCenterCode`, `expenseType`, `active`
- **Restricciones**: 
  - `name` debe ser único (case-insensitive)
  - Si especificas `conceptName`, debes especificar `packageName`
  - Todas las referencias deben existir previamente

## Orden de dependencias

Para evitar errores, el sistema procesa las filas en el siguiente orden:

1. **Management, ExpensePackage, CostCenter, Articulo** (sin dependencias)
2. **Area, ExpenseConcept** (dependen de Management y ExpensePackage respectivamente)
3. **Support** (puede depender de todas las anteriores)

**Recomendación**: Organiza tu CSV con las entidades padre antes que las hijas, aunque el sistema reordenará automáticamente.

## Modo Dry-Run (Vista Previa)

Por defecto, la carga inicia en **modo Dry-Run**, que simula el proceso sin guardar cambios en la base de datos.

### Ventajas
- Valida el formato y las referencias antes de confirmar
- Muestra qué registros se crearán, actualizarán u omitirán
- Detecta errores sin afectar los datos existentes

### Flujo recomendado
1. Sube el CSV con **Dry-Run activado** (checkbox marcado)
2. Revisa el reporte de resultados
3. Si todo está correcto y no hay errores, haz clic en **"✓ Confirmar y Guardar"**
4. El sistema ejecutará la carga real

## Ejemplos

### Ejemplo 1: Crear una gerencia y sus áreas

```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
Management,Gerencia de Tecnología,,,,,,,true
Area,Desarrollo,,Gerencia de Tecnología,,,,,true
Area,Infraestructura,,Gerencia de Tecnología,,,,,true
```

### Ejemplo 2: Crear paquetes y conceptos

```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
ExpensePackage,Hardware,,,,,,,,
ExpensePackage,Software,,,,,,,,
ExpenseConcept,Laptops,,,,Hardware,,,,
ExpenseConcept,Servidores,,,,Hardware,,,,
ExpenseConcept,Licencias Microsoft,,,,Software,,,,
```

### Ejemplo 3: Crear centros de costo y artículos (nombres pueden duplicarse)

```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
CostCenter,Tecnología,CC-001,,,,,,,
CostCenter,Operaciones,CC-002,,,,,,,
CostCenter,Tecnología,CC-003,,,,,,,
Articulo,Servicios Profesionales,ART-001,,,,,,,
Articulo,Servicios Profesionales,ART-002,,,,,,,
Articulo,Hardware,ART-003,,,,,,,
```

**Nota**: Los códigos son únicos pero los nombres pueden repetirse. "Tecnología" existe en CC-001 y CC-003. "Servicios Profesionales" existe en ART-001 y ART-002.

### Ejemplo 4: Crear sustento completo

```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
Support,Soporte TI - Hardware,SUP-001,Gerencia de Tecnología,Desarrollo,Hardware,Laptops,CC-001,ADMINISTRATIVO,true
```

## Manejo de errores

### Errores de validación
- **422**: Datos inválidos en el CSV
  - Campos obligatorios faltantes
  - Referencias a entidades que no existen
  - Violaciones de unicidad

### Acciones posibles
- **created**: Registro nuevo creado exitosamente
- **updated**: Registro existente actualizado
- **skipped**: Registro ya existe y no requiere cambios
- **error**: Error al procesar (ver detalles en `issues`)

### Reporte de resultados

El sistema devuelve un reporte detallado con:
- **summary**: Totales generales (created, updated, skipped, errors)
- **byType**: Estadísticas por tipo de entidad
- **rows**: Detalle de cada fila procesada con mensaje y errores específicos

## Límites y consideraciones

- **Tamaño máximo**: 5 MB por archivo
- **Codificación**: UTF-8 (con o sin BOM)
- **Formato**: CSV estándar con comillas para valores con comas
- **Filas vacías**: Se ignoran automáticamente
- **Duplicados**: Si un ítem ya existe (por nombre), se omite o actualiza según corresponda

## Uso en la UI

1. Navega a **Catálogos → Carga masiva (CSV)**
2. Descarga la plantilla CSV de ejemplo
3. Edita el CSV con tus datos
4. Sube el archivo
5. Marca el checkbox **Modo Vista Previa** (recomendado)
6. Haz clic en **Vista Previa**
7. Revisa los resultados en las tarjetas de resumen y detalle
8. Si todo está bien, haz clic en **Confirmar y Guardar**

## API Endpoints

### GET `/bulk/template`
Descarga la plantilla CSV con ejemplos.

**Respuesta**: Archivo `catalogs_template.csv`

### POST `/bulk/catalogs?dryRun=true`
Procesa el CSV en modo Dry-Run.

**Body**: `multipart/form-data` con el archivo CSV

**Respuesta**:
```json
{
  "dryRun": true,
  "summary": {
    "created": 5,
    "updated": 2,
    "skipped": 3,
    "errors": 1
  },
  "byType": {
    "Management": { "created": 2, "updated": 0, "skipped": 0, "errors": 0 },
    "Area": { "created": 3, "updated": 0, "skipped": 2, "errors": 0 }
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

### POST `/bulk/catalogs?dryRun=false`
Procesa y guarda el CSV.

**Body**: `multipart/form-data` con el archivo CSV

**Respuesta**: Mismo formato que Dry-Run pero con `dryRun: false`

## Solución de problemas comunes

### Error: "Gerencia no encontrada"
- Asegúrate de que la gerencia existe antes de crear áreas que la referencien
- Verifica que el nombre coincida exactamente (ignora mayúsculas/minúsculas)

### Error: "El nombre ya existe"
- Los nombres deben ser únicos por entidad
- Usa Dry-Run para identificar duplicados antes de confirmar

### Error: "Si especificas conceptName, debes especificar packageName"
- Los conceptos siempre pertenecen a un paquete
- Completa ambos campos en el CSV

### Archivo no se carga
- Verifica que el archivo sea .csv y menor a 5 MB
- Asegúrate de que tenga la fila de cabeceras
- Confirma que la codificación sea UTF-8

## Contacto y soporte

Para reportar problemas o solicitar ayuda, consulta la documentación del proyecto principal.

