# Integración de Webhook N8N para OCs Procesadas

## Resumen

Se ha implementado una integración automática que envía un webhook a N8N cada vez que una Orden de Compra (OC) cambia a estado `PROCESADO`.

## Configuración

### Variable de Entorno

Agregar en el archivo `.env` del API:

```env
N8N_OC_PROCESADA_WEBHOOK_URL="http://10-43-5-105.nip.io:5678/webhook/b5168d4f-9fc4-4745-a4a8-05afabbbcce0"
```

Esta variable ya está documentada en `.env.example`.

## Payload del Webhook

Cuando una OC se marca como `PROCESADO`, el sistema envía automáticamente un POST al webhook de N8N con el siguiente payload:

```json
{
  "incidente": "INC-45678",
  "ocId": 12345
}
```

**Campos:**
- `incidente`: Número de incidente generado por el RPA (puede ser string vacío si no se generó)
- `ocId`: ID numérico de la OC en la base de datos

## Puntos de Integración

La notificación se envía automáticamente en los siguientes casos:

### 1. RPA Bot Completa Procesamiento
**Archivo:** `apps/api/src/rpa.ts`  
**Endpoint:** `POST /rpa/ocs/:id/complete`  
**Línea:** ~435

Cuando el bot de RPA completa exitosamente el procesamiento de una OC y la marca como `PROCESADO`.

### 2. Actualización Manual vía N8N
**Archivo:** `apps/api/src/n8n.ts`  
**Endpoint:** `PATCH /n8n/ocs/:id/status`  
**Línea:** ~742

Cuando se actualiza el estado de una OC a `PROCESADO` mediante el endpoint de N8N (requiere autenticación con `RPA_API_KEY`).

## Implementación Técnica

### Función Utilitaria

Se creó la función `notifyN8nOcProcesada()` en ambos archivos (`rpa.ts` y `n8n.ts`):

```typescript
async function notifyN8nOcProcesada(ocId: number, incidenteOc: string | null) {
  const webhookUrl = process.env.N8N_OC_PROCESADA_WEBHOOK_URL;
  
  if (!webhookUrl) {
    // Omite silenciosamente si no está configurado
    return;
  }

  const payload = {
    incidente: incidenteOc || "",
    ocId: ocId
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
```

### Características

- **No bloqueante:** Si el webhook falla, no afecta el procesamiento de la OC
- **Logging:** En modo desarrollo, registra el envío y errores en la consola
- **Opcional:** Si la variable de entorno no está configurada, simplemente no envía nada
- **Usa fetch nativo:** Node.js 18+ incluye fetch globalmente, no requiere dependencias adicionales

## Flujo de Trabajo

```
┌─────────────────────────────────────────────────────────┐
│ RPA Bot procesa OC                                      │
│ POST /rpa/ocs/:id/complete { ok: true, incidenteOc }   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ OC actualizada a estado PROCESADO                       │
│ - Se guarda incidenteOc en BD                           │
│ - Se registra en historial de estados                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ notifyN8nOcProcesada(ocId, incidenteOc)                │
│ POST al webhook de N8N                                  │
│ { "incidente": "INC-XXX", "ocId": 123 }                │
└─────────────────────────────────────────────────────────┘
```

## Configuración en N8N

El webhook en N8N debe estar configurado así:

**Nodo:** Webhook  
**Method:** POST  
**Path:** `/webhook/b5168d4f-9fc4-4745-a4a8-05afabbbcce0`  
**Response:** "Last node"

El workflow de N8N recibirá el payload y podrá acceder a:
- `$json.incidente` - Número de incidente
- `$json.ocId` - ID de la OC

## Verificación

### Logs en Desarrollo

Cuando `NODE_ENV=development`, verás logs como:

```
[RPA] Enviando notificación a N8N: http://10-43-5-105.nip.io:5678/webhook/... 
{ incidente: 'INC-45678', ocId: 12345 }
[RPA] Notificación N8N enviada exitosamente para OC 12345
```

### Errores

Si hay un error al enviar el webhook:

```
[RPA] Error al enviar notificación a N8N para OC 12345: Connection refused
```

El error se registra pero **NO detiene** el procesamiento de la OC.

## Notas Importantes

1. **Sin impacto en funcionalidad existente:** La integración es completamente no invasiva
2. **Idempotencia:** Si el webhook falla, la OC ya está marcada como PROCESADO en la BD
3. **No requiere cambios en frontend:** Todo el flujo es backend
4. **Compatible con flujo existente:** No afecta WebSocket broadcasts ni otras notificaciones
