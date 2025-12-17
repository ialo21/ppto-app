# Asistente PPTO App - Sistema de Tool Calling

## Descripción General

El asistente de PPTO App ahora utiliza un sistema avanzado de **Tool Calling / Function Calling** implementado con Gemini 2.5 Flash. Este sistema permite que el LLM interprete preguntas del usuario, decida qué herramientas ejecutar, y genere respuestas basadas únicamente en datos reales de la base de datos.

## Arquitectura

### Componentes Principales

1. **`assistant-tools.ts`**: Define y ejecuta todas las herramientas disponibles
2. **`gemini-client.ts`**: Cliente extendido con soporte para function calling
3. **`assistant-v2.ts`**: Orquestador principal con 3 fases (Planning, Execution, Response)

### Flujo de Trabajo (3 Fases)

```
Usuario → Pregunta
    ↓
[FASE 1: PLANNING]
    - Gemini analiza la pregunta con contexto de herramientas disponibles
    - Decide qué tools llamar y con qué parámetros
    - O responde directamente si no necesita datos
    ↓
[FASE 2: EXECUTION]
    - Ejecuta cada tool solicitada
    - Valida parámetros con Zod
    - Aplica timeouts y límites de seguridad
    - Captura resultados o errores
    ↓
[FASE 3: RESPONSE]
    - Gemini genera respuesta en lenguaje natural
    - Basándose SOLO en resultados de tools
    - Formatea números, explica errores, pide aclaraciones
    ↓
Usuario ← Respuesta final
```

## Herramientas Disponibles

### 1. `searchSupports`
**Descripción**: Busca líneas de sustento por texto usando fuzzy matching.

**Parámetros**:
- `query` (string, requerido): Texto de búsqueda
- `limit` (number, opcional): Máximo de resultados (default: 10, max: 100)

**Ejemplo de uso**:
```json
{
  "query": "seguridad",
  "limit": 5
}
```

**Retorna**:
```json
{
  "results": [
    {
      "id": 123,
      "name": "Servicio de Seguridad",
      "code": "SEG-001",
      "matchScore": 1000,
      "matchType": "exact"
    }
  ],
  "totalFound": 1
}
```

### 2. `searchCostCenters`
**Descripción**: Busca centros de costo (CECO) por código o nombre.

**Parámetros**:
- `query` (string, requerido): Código o nombre del CECO
- `limit` (number, opcional): Máximo de resultados (default: 10, max: 100)

**Ejemplo de uso**:
```json
{
  "query": "1000",
  "limit": 10
}
```

### 3. `getBudgetSummary`
**Descripción**: Obtiene resumen de presupuesto (PPTO) de la versión activa.

**Parámetros**:
- `year` (number, requerido): Año del presupuesto (2020-2100)
- `supportId` (number, opcional): ID de línea de sustento
- `costCenterId` (number, opcional): ID de centro de costo

**Ejemplo de uso**:
```json
{
  "year": 2025,
  "supportId": 123
}
```

**Retorna**:
```json
{
  "year": 2025,
  "support": {
    "id": 123,
    "name": "Servicio de Seguridad",
    "code": "SEG-001"
  },
  "currency": "PEN",
  "totalAnnual": 1500000.50,
  "monthlyData": [
    { "month": 1, "amount": 125000.00 },
    { "month": 2, "amount": 125000.00 }
  ],
  "versionId": 1,
  "versionName": "Presupuesto 2025 v1"
}
```

### 4. `getInvoicesSummary`
**Descripción**: Obtiene resumen de facturas con filtros opcionales.

**Parámetros**:
- `year` (number, requerido): Año de las facturas
- `month` (number, opcional): Mes específico (1-12)
- `supportId` (number, opcional): ID de línea de sustento
- `costCenterId` (number, opcional): ID de centro de costo
- `providerId` (number, opcional): ID de proveedor

**Retorna**:
```json
{
  "filters": { "year": 2025, "supportId": 123 },
  "currency": "PEN",
  "totalAmount": 850000.00,
  "count": 45,
  "byStatus": {
    "PAGADO": { "count": 30, "amount": 600000.00 },
    "EN_APROBACION": { "count": 15, "amount": 250000.00 }
  },
  "monthlyData": [
    { "month": 1, "amount": 100000.00, "count": 5 }
  ]
}
```

### 5. `getPurchaseOrdersSummary`
**Descripción**: Obtiene resumen de órdenes de compra (OC).

**Parámetros**:
- `year` (number, requerido): Año de las OCs
- `month` (number, opcional): Mes específico (1-12)
- `supportId` (number, opcional): ID de línea de sustento
- `costCenterId` (number, opcional): ID de centro de costo
- `status` (string, opcional): Estado de la OC

**Retorna**:
```json
{
  "filters": { "year": 2025 },
  "currency": "PEN",
  "totalAmount": 2000000.00,
  "count": 150,
  "byStatus": {
    "PROCESADO": { "count": 100, "amount": 1500000.00 },
    "PENDIENTE": { "count": 50, "amount": 500000.00 }
  },
  "monthlyData": [
    { "month": 1, "amount": 200000.00, "count": 15 }
  ]
}
```

### 6. `getTopSupports`
**Descripción**: Obtiene top N líneas de sustento por métrica.

**Parámetros**:
- `year` (number, requerido): Año para el análisis
- `metric` (string, requerido): "budget", "invoices" o "ocs"
- `limit` (number, opcional): Número de resultados (default: 10, max: 50)

**Retorna**:
```json
{
  "year": 2025,
  "metric": "budget",
  "results": [
    {
      "supportId": 123,
      "supportName": "Servicio de Seguridad",
      "supportCode": "SEG-001",
      "amount": 1500000.00
    }
  ]
}
```

## Seguridad y Validación

### Límites Implementados

- **Max resultados por tool**: 100 registros
- **Timeout por tool**: 10 segundos
- **Rango de fechas**: Máximo 24 meses
- **Validación Zod**: Todos los parámetros validados estrictamente

### Autenticación y Permisos

- Requiere autenticación: `requireAuth`
- Requiere permiso: `requirePermission("assistant")`
- El usuario autenticado se pasa a cada tool (preparado para restricciones por rol/CECO)

### Manejo de Errores

Cada tool retorna errores estructurados:

```json
{
  "toolName": "getBudgetSummary",
  "params": { "year": 2025 },
  "result": null,
  "error": "No hay versión de presupuesto activa en el sistema",
  "executionTimeMs": 45
}
```

Tipos de error:
- **Validación**: Parámetros inválidos con detalles específicos
- **Timeout**: Consulta excedió 10 segundos
- **BD**: Error al consultar datos
- **Lógica**: No hay datos, versión inactiva, etc.

## System Prompt

```
Eres el Asistente de Presupuesto de PPTO App. Respondes consultas sobre presupuesto, 
facturas y órdenes de compra usando EXCLUSIVAMENTE datos de herramientas (tools).

REGLAS ABSOLUTAS:
1. Nunca inventes cifras, documentos, estados o nombres
2. Si no hay datos suficientes, pide aclaración específica (año, línea, CECO, etc.)
3. Si una tool devuelve error, explícalo y sugiere cómo reformular
4. Siempre formatea montos con separadores de miles y 2 decimales, indicando moneda
5. En detalle mensual, muestra solo meses con monto > 0
6. "Línea", "línea de sustento" y "sustento" son sinónimos

PROCESO:
1. Interpreta la pregunta
2. Identifica qué tools necesitas
3. Si faltan filtros críticos, DETENTE y pide aclaración
4. Usa tools para obtener datos
5. Responde basándote SOLO en resultados de tools

ALCANCE:
- Presupuesto (PPTO): asignaciones por línea/CECO/año/mes
- Facturas: totales, estados, agrupaciones
- OCs: totales, estados, agrupaciones
```

## Ejemplos de Consultas y Flujo

### Ejemplo 1: Consulta de presupuesto por línea

**Pregunta**: "¿Cuánto presupuesto hay para seguridad en 2025?"

**Fase 1 (Planning)**:
```json
{
  "functionCalls": [
    { "name": "searchSupports", "args": { "query": "seguridad", "limit": 5 } }
  ]
}
```

**Fase 2 (Execution)**:
```json
[
  {
    "toolName": "searchSupports",
    "result": {
      "results": [
        { "id": 123, "name": "Servicio de Seguridad", "matchScore": 1000 }
      ]
    }
  }
]
```

Gemini detecta que necesita el ID → **segunda ronda de tools**:
```json
{
  "functionCalls": [
    { "name": "getBudgetSummary", "args": { "year": 2025, "supportId": 123 } }
  ]
}
```

**Fase 3 (Response)**:
```
El presupuesto para la línea "Servicio de Seguridad" en 2025 es de 
PEN 1,500,000.50 anual, distribuido principalmente en los meses de 
enero (PEN 125,000.00) y febrero (PEN 125,000.00).
```

### Ejemplo 2: Top líneas con más presupuesto

**Pregunta**: "Dame el top 5 de líneas con más presupuesto en 2025"

**Fase 1 (Planning)**:
```json
{
  "functionCalls": [
    { "name": "getTopSupports", "args": { "year": 2025, "metric": "budget", "limit": 5 } }
  ]
}
```

**Fase 2 (Execution)**:
```json
[
  {
    "toolName": "getTopSupports",
    "result": {
      "year": 2025,
      "metric": "budget",
      "results": [
        { "supportName": "Infraestructura TI", "amount": 5000000.00 },
        { "supportName": "Servicio de Seguridad", "amount": 1500000.00 },
        ...
      ]
    }
  }
]
```

**Fase 3 (Response)**:
```
Top 5 líneas con más presupuesto en 2025:

1. Infraestructura TI: PEN 5,000,000.00
2. Servicio de Seguridad: PEN 1,500,000.00
...
```

### Ejemplo 3: Facturas por línea y mes

**Pregunta**: "Total de facturas en enero 2025 para seguridad"

**Tools llamadas**:
1. `searchSupports` → obtiene ID de "seguridad"
2. `getInvoicesSummary` → con year=2025, month=1, supportId=123

## Endpoints de la API

### POST `/assistant`

**Request**:
```json
{
  "message": "¿Cuánto presupuesto hay para seguridad en 2025?",
  "history": [
    { "role": "user", "content": "Hola" },
    { "role": "assistant", "content": "Hola, ¿en qué puedo ayudarte?" }
  ]
}
```

**Response**:
```json
{
  "response": "El presupuesto para la línea 'Servicio de Seguridad' en 2025...",
  "metadata": {
    "toolsUsed": ["searchSupports", "getBudgetSummary"],
    "toolResults": [
      { "tool": "searchSupports", "executionTimeMs": 45, "hasError": false },
      { "tool": "getBudgetSummary", "executionTimeMs": 120, "hasError": false }
    ],
    "executionTimeMs": 1850
  }
}
```

### GET `/assistant/health`

**Response**:
```json
{
  "ok": true,
  "geminiConfigured": true,
  "toolsAvailable": [
    "searchSupports",
    "searchCostCenters",
    "getBudgetSummary",
    "getInvoicesSummary",
    "getPurchaseOrdersSummary",
    "getTopSupports"
  ],
  "message": "Servicio del asistente operativo (Tool Calling v2)"
}
```

### GET `/assistant/tools`

Lista todas las herramientas disponibles con sus definiciones.

## Logging y Monitoreo

El sistema registra:
- Usuario que hace la consulta
- Mensaje original
- Tools ejecutadas y sus tiempos
- Errores o fallos
- Tiempo total de respuesta

```
[Assistant] User iago.lopez@interseguro.com.pe asked: "¿Cuánto presupuesto hay para seguridad en 2025?"
[Assistant] Tools to execute: searchSupports, getBudgetSummary
[Assistant] Tool searchSupports failed: No se encontró línea
[Assistant] Request completed in 1850ms
```

## Migración desde v1

El sistema anterior (`assistant.ts`) usaba:
- Parsing manual de intención con JSON
- Consulta hardcodeada para "presupuesto por línea/año"
- Respuesta directa del LLM

El nuevo sistema (`assistant-v2.ts`) usa:
- ✅ Function calling nativo de Gemini
- ✅ 6 herramientas flexibles y extensibles
- ✅ Validación Zod estricta
- ✅ Timeouts y límites de seguridad
- ✅ Soporte para presupuesto, facturas y OCs
- ✅ Respuestas basadas únicamente en datos reales

## Compatibilidad con Frontend

El endpoint mantiene la misma firma:
- **Input**: `{ message: string, history: Array }`
- **Output**: `{ response: string, metadata?: {...} }`

El frontend actual funciona sin cambios. El campo `metadata` adicional puede usarse para:
- Mostrar qué tools se ejecutaron
- Indicadores de carga por tool
- Debugging de performance

## Testing

### Casos de Prueba Mínimos

1. **Presupuesto por línea y año**
   - "¿Cuánto presupuesto hay para seguridad en 2025?"
   - Espera: Llamada a `searchSupports` + `getBudgetSummary`

2. **Top líneas**
   - "Dame el top 5 de líneas con más presupuesto en 2025"
   - Espera: Llamada a `getTopSupports`

3. **Facturas por período**
   - "Total de facturas en enero 2025"
   - Espera: Llamada a `getInvoicesSummary` con mes específico

4. **Pregunta genérica**
   - "¿Qué puedes hacer?"
   - Espera: Respuesta directa sin tools

5. **Datos insuficientes**
   - "Dame el presupuesto de seguridad"
   - Espera: Pide aclaración del año

6. **Línea inexistente**
   - "Presupuesto de LINEAINVENTADA123 en 2025"
   - Espera: Mensaje de error + sugerencias

## Extensibilidad

Para agregar nuevas herramientas:

1. **Definir schema en `assistant-tools.ts`**:
```typescript
getNewTool: z.object({
  param1: z.string(),
  param2: z.number().optional()
})
```

2. **Implementar función**:
```typescript
export async function getNewTool(params: z.infer<typeof toolSchemas.getNewTool>) {
  const validated = toolSchemas.getNewTool.parse(params);
  // ... lógica con Prisma
  return { result: ... };
}
```

3. **Agregar a `toolDefinitions`** con descripción clara

4. **Agregar a `toolExecutors`**

El LLM automáticamente aprenderá a usar la nueva tool basándose en su descripción.

## Configuración

Variables de entorno requeridas:
- `GEMINI_API_KEY`: API key de Google Gemini
- `DATABASE_URL`: Conexión a PostgreSQL
- `NODE_ENV`: "development" o "production"

## Notas Importantes

- El sistema NO inventa datos. Si no hay información, lo indica claramente.
- El fuzzy matching es robusto: acepta typos, abreviaciones, parciales.
- Los timeouts evitan consultas lentas que bloqueen el sistema.
- La validación Zod garantiza tipos correctos antes de consultar BD.
- El historial se limita a últimos 5 mensajes para no saturar el contexto.
