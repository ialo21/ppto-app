# Testing del Asistente Tool Calling

## Setup Previo

1. Asegúrate de tener configurado `GEMINI_API_KEY` en `apps/api/.env`
2. El usuario debe tener el permiso `assistant` asignado
3. La aplicación debe estar corriendo en el puerto configurado (default: 3001)

## Casos de Prueba

### 1. Health Check

Verifica que el servicio esté operativo:

```bash
curl -X GET http://localhost:3001/assistant/health \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

**Respuesta esperada**:
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
    "getTopSupports",
    "getOcRequestStatusByIncidentId",
    "getOcByNumber",
    "listInvoicesByOcNumber",
    "getInvoiceByNumber"
  ],
  "message": "Servicio del asistente operativo (Tool Calling v2)"
}
```

### 2. Listar Tools Disponibles

```bash
curl -X GET http://localhost:3001/assistant/tools \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

### 3. Consulta: Presupuesto por Línea y Año

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Cuánto presupuesto hay para seguridad en 2025?",
    "history": []
  }'
```

**Comportamiento esperado**:
- Fase 1: LLM llama `searchSupports` con query="seguridad"
- Fase 2: Ejecuta la búsqueda, obtiene ID de la línea
- Si encuentra la línea, LLM llama `getBudgetSummary` con year=2025 y supportId
- Fase 3: Genera respuesta con montos formateados

**Respuesta esperada**:
```json
{
  "response": "El presupuesto para la línea 'Servicio de Seguridad' en 2025 es de PEN 1,500,000.50 anuales, distribuido en los siguientes meses: enero (PEN 125,000.00), febrero (PEN 125,000.00)...",
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

### 4. Consulta: Top 5 Líneas con Más Presupuesto

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Dame el top 5 de líneas con más presupuesto en 2025",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM llama directamente `getTopSupports` con year=2025, metric="budget", limit=5
- Responde con ranking formateado

### 5. Consulta: Facturas por Período

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Total de facturas en enero 2025",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM llama `getInvoicesSummary` con year=2025, month=1
- Responde con totales y agrupaciones por estado

### 6. Consulta: Facturas por Línea

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Facturas de seguridad en 2025",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM llama `searchSupports` → obtiene supportId
- LLM llama `getInvoicesSummary` con year=2025, supportId
- Responde con totales, estados, y distribución mensual

### 7. Consulta: Órdenes de Compra

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "OCs procesadas en 2025",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM llama `getPurchaseOrdersSummary` con year=2025, status="PROCESADO"
- Responde con totales y distribución

### 8. Consulta Genérica (Sin Tools)

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hola, ¿qué puedes hacer?",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM responde directamente sin llamar tools
- Explica su alcance (presupuesto, facturas, OCs)

### 9. Datos Insuficientes

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Dame el presupuesto de infraestructura",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM detecta que falta el año
- Responde pidiendo aclaración: "¿Para qué año necesitas el presupuesto?"

### 10. Línea Inexistente

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Presupuesto de LINEAINVENTADA123 en 2025",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM llama `searchSupports` con query="LINEAINVENTADA123"
- Tool retorna `results: []`
- LLM responde: "No se encontró ninguna línea con ese nombre. Algunas líneas disponibles son..."

### 11. Con Historial

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Y cuánto de eso está facturado?",
    "history": [
      {
        "role": "user",
        "content": "¿Cuánto presupuesto hay para seguridad en 2025?"
      },
      {
        "role": "assistant",
        "content": "El presupuesto para seguridad en 2025 es PEN 1,500,000.00"
      }
    ]
  }'
```

**Comportamiento esperado**:
- LLM usa contexto del historial
- Llama `searchSupports` (para obtener ID de seguridad)
- Llama `getInvoicesSummary` con year=2025, supportId
- Responde comparando presupuesto vs facturado

### 12. Búsqueda por CECO

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Presupuesto del CECO 1000 en 2025",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM llama `searchCostCenters` con query="1000"
- LLM llama `getBudgetSummary` con year=2025, costCenterId
- Responde con totales por CECO

---

## Consultas por Identificador (INC / OC / Factura)

### 13. Consulta por INC (Solicitud sin OC generada)

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Cuál es el estado del INC12345?",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM llama `getOcRequestStatusByIncidentId` con incidentId="INC12345"
- Si la solicitud existe pero NO tiene OC generada:
  - Responde con todos los campos disponibles de la solicitud
  - Indica explícitamente que "Aún no se ha generado el N° de OC"
- Si la solicitud existe Y tiene OC:
  - Llama también `getOcByNumber` y `listInvoicesByOcNumber`
  - Responde con detalle completo de solicitud + OC + facturas

**Respuesta esperada (Pre-OC)**:
```json
{
  "response": "📋 **Solicitud INC12345**\n\n**Estado:** PENDIENTE\n**Solicitante:** Juan Pérez (juan.perez@empresa.com)\n**Fecha registro:** 2025-01-15\n\n**Proveedor:** ACME S.A.C. (RUC: 20123456789)\n**Monto:** PEN 15,500.00\n\n**Línea de sustento:** Servicios Varios\n**CECO(s):** 1000 - Administración\n\n**N° de OC:** Aún no generada\n\n...",
  "metadata": {
    "toolsUsed": ["getOcRequestStatusByIncidentId"],
    ...
  }
}
```

### 14. Consulta por INC (Solicitud con OC generada)

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Ya se generó la OC del INC67890?",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM llama `getOcRequestStatusByIncidentId`
- Si tiene ocNumber, SIEMPRE llama `getOcByNumber` y `listInvoicesByOcNumber`
- Responde con detalle completo + facturas asociadas

### 15. Consulta por N° de OC

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Cuál es el estado y detalle de la OC 4500012345?",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM llama `getOcByNumber` con ocNumber="4500012345"
- LLM SIEMPRE llama `listInvoicesByOcNumber` (aunque no se pida explícitamente)
- Responde con detalle completo de la OC + resumen de facturas

**Respuesta esperada**:
```json
{
  "response": "📦 **OC 4500012345**\n\n**Estado:** PROCESADO\n**INC:** INC67890\n\n**Proveedor:** ACME S.A.C. (RUC: 20123456789)\n**Monto:** PEN 15,500.00\n\n**Línea de sustento:** Servicios Varios (SV001)\n**CECO(s):** 1000 - Administración\n**Período presupuestal:** 2025-01 a 2025-03\n\n**Solicitante:** Juan Pérez\n**Fecha registro:** 2025-01-15\n\n---\n\n📄 **Facturas asociadas:** 2 facturas\n- F001-00123: PEN 8,000.00 (PAGADO)\n- F001-00124: PEN 7,500.00 (EN_TESORERIA)\n\n**Total facturado:** PEN 15,500.00",
  "metadata": {
    "toolsUsed": ["getOcByNumber", "listInvoicesByOcNumber"],
    ...
  }
}
```

### 16. Consulta Facturas de una OC

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Qué facturas están asociadas a la OC 4500012345?",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM llama `getOcByNumber` (para validar OC)
- LLM llama `listInvoicesByOcNumber`
- Responde con listado detallado de facturas + totales

### 17. Consulta por N° de Factura

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Cuál es el estado y detalle de la factura F001-21424?",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM llama `getInvoiceByNumber` con invoiceNumber="F001-21424"
- Responde con todos los campos disponibles de la factura
- Si tiene OC asociada, incluye información de la OC

**Respuesta esperada**:
```json
{
  "response": "🧾 **Factura F001-21424**\n\n**Estado:** PAGADO\n**Tipo:** FACTURA\n\n**Proveedor:** ACME S.A.C. (RUC: 20123456789)\n**Monto sin IGV:** PEN 8,000.00\n**Moneda:** PEN\n\n**OC asociada:** 4500012345 (PROCESADO)\n**Línea de sustento:** Servicios Varios\n\n**CECO(s):** 1000 - Administración (100%)\n**Período(s):** 2025-01\n\n**Fecha creación:** 2025-01-20\n**Fecha aprobación:** 2025-01-22\n\n...",
  "metadata": {
    "toolsUsed": ["getInvoiceByNumber"],
    ...
  }
}
```

### 18. INC no encontrado

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Estado del INC99999999",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM llama `getOcRequestStatusByIncidentId`
- Tool retorna `found: false`
- LLM responde: "No se encontró ninguna solicitud con INC99999999. Verifica que el número sea correcto."

### 19. OC no encontrada

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Detalle de la OC 9999999999",
    "history": []
  }'
```

**Comportamiento esperado**:
- LLM llama `getOcByNumber`
- Tool retorna `found: false`
- LLM responde: "No se encontró ninguna OC con número 9999999999."

### 20. Factura con múltiples matches

```bash
curl -X POST http://localhost:3001/assistant \
  -H "Cookie: ppto-session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Estado de la factura F001-00001",
    "history": []
  }'
```

**Comportamiento esperado (si hay múltiples)**:
- LLM llama `getInvoiceByNumber`
- Tool retorna `multipleMatches: true` con lista de candidatos
- LLM pide aclaración: "Se encontraron 3 facturas con ese número. ¿Podrías especificar el año o el proveedor?"

---

## Verificación de Errores

### Error: API Key no configurada

Si `GEMINI_API_KEY` no está configurada:

```json
{
  "error": "El servicio del asistente no está configurado correctamente...",
  "response": "Lo siento, actualmente no puedo procesar tu solicitud..."
}
```

**Solución**: Configurar `GEMINI_API_KEY` en `.env`

### Error: Sin permisos

Si el usuario no tiene permiso `assistant`:

```json
{
  "error": "No tienes permiso para acceder a este recurso"
}
```

**Solución**: Asignar permiso `assistant` al rol del usuario

### Error: Timeout

Si una consulta tarda más de 10 segundos:

```json
{
  "response": "La consulta de [tool] tomó demasiado tiempo. Intenta con filtros más específicos.",
  "metadata": {
    "toolsUsed": ["toolName"],
    "toolResults": [
      { "tool": "toolName", "executionTimeMs": 10000, "hasError": true }
    ]
  }
}
```

### Error: Validación de Parámetros

Si el LLM pasa parámetros inválidos:

```json
{
  "response": "Hubo un error al procesar tu consulta. Los parámetros para [tool] son inválidos: year: debe ser mayor a 2020",
  "metadata": { ... }
}
```

## Testing desde Frontend

Si estás usando el frontend de React, puedes probar directamente desde la interfaz del asistente. El endpoint mantiene compatibilidad completa.

## Monitoreo en Logs

Revisa los logs del servidor para ver el flujo:

```
[Assistant] User iago.lopez@interseguro.com.pe asked: "¿Cuánto presupuesto hay para seguridad en 2025?"
[Assistant] Tools to execute: searchSupports, getBudgetSummary
[Assistant] Request completed in 1850ms
```

Si hay errores:

```
[Assistant] Tool searchSupports failed: No se encontró línea
Error ejecutando tool searchSupports: [detalles del error]
```

## Métricas de Performance

Tiempos esperados:
- **searchSupports**: 20-50ms (búsqueda en memoria)
- **searchCostCenters**: 20-50ms (búsqueda en memoria)
- **getBudgetSummary**: 50-200ms (query Prisma con joins)
- **getInvoicesSummary**: 100-500ms (query complejo con relaciones)
- **getPurchaseOrdersSummary**: 100-500ms (query complejo)
- **getTopSupports**: 200-800ms (agregaciones)
- **getOcRequestStatusByIncidentId**: 50-150ms (query por INC con includes)
- **getOcByNumber**: 50-150ms (query por número OC con includes)
- **listInvoicesByOcNumber**: 50-200ms (query facturas por OC)
- **getInvoiceByNumber**: 50-200ms (query factura con relaciones)

**Tiempo total típico**: 1-3 segundos (incluyendo llamadas a Gemini)

## Troubleshooting

### El LLM no llama las tools correctas

- Verifica que `toolDefinitions` tenga descripciones claras
- Revisa que el system prompt esté bien configurado
- Intenta reformular la pregunta de forma más explícita

### Las tools retornan datos vacíos

- Verifica que existan datos en BD para el año/período consultado
- Revisa que la versión de presupuesto esté ACTIVE
- Confirma que los períodos del año estén creados

### Errores de TypeScript en desarrollo

- Ejecuta `npm install` para asegurar dependencias actualizadas
- Verifica que `@google/generative-ai` esté instalado
- Si persisten errores de tipos, los `as any` en gemini-client.ts son intencionales

## Próximos Pasos

1. Probar todos los casos de prueba listados
2. Verificar tiempos de respuesta en producción
3. Ajustar límites (MAX_RESULTS, timeouts) según necesidad
4. Agregar nuevas tools si se requiere funcionalidad adicional
5. Implementar restricciones por CECO/rol si es necesario
