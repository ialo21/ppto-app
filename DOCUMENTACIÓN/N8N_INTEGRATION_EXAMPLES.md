# Guía de Integración n8n - Ejemplos Prácticos

## Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Flujo 1: Crear Factura con OC](#flujo-1-crear-factura-con-oc)
3. [Flujo 2: Crear Factura sin OC](#flujo-2-crear-factura-sin-oc)
4. [Flujo 3: Actualizar Estados de Facturas](#flujo-3-actualizar-estados-de-facturas)
5. [Flujo 4: Actualizar Estados de OCs](#flujo-4-actualizar-estados-de-ocs)
6. [Manejo de Errores](#manejo-de-errores)
7. [Casos de Uso Comunes](#casos-de-uso-comunes)

---

## Configuración Inicial

### Paso 1: Configurar Credenciales en n8n

1. En n8n, crear nueva credencial tipo "Header Auth"
2. Nombre: `PPTO Portal API Key`
3. Header Name: `Authorization`
4. Header Value: `Bearer TU_API_KEY_AQUI`

### Paso 2: Configurar Nodo HTTP Request

```
Base URL: http://localhost:3001
Authentication: Header Auth (usar credencial creada)
```

---

## Flujo 1: Crear Factura con OC

### Escenario
Recibir una factura escaneada por OCR, validar datos, y crear en el Portal PPTO asociada a una OC existente.

### Workflow n8n

```
[Trigger] → [OCR/Validación] → [HTTP Request: Crear Factura] → [Notificación]
```

### Configuración del Nodo HTTP Request

**Método:** POST  
**URL:** `{{$node["n8n-config"].json["baseUrl"]}}/n8n/invoices`  
**Body (JSON):**

```json
{
  "ocId": {{$json["ocId"]}},
  "docType": "FACTURA",
  "numberNorm": "{{$json["numeroFactura"]}}",
  "montoSinIgv": {{$json["montoSinIgv"]}},
  "periodIds": {{$json["periodIds"]}},
  "allocations": {{$json["allocations"]}},
  "detalle": "{{$json["detalle"]}}",
  "ultimusIncident": "{{$json["incidente"]}}"
}
```

### Datos de Entrada Esperados

```json
{
  "ocId": 123,
  "numeroFactura": "F001-00012345",
  "montoSinIgv": 1500.00,
  "periodIds": [45],
  "allocations": [
    {
      "costCenterId": 5,
      "amount": 1500.00
    }
  ],
  "detalle": "Servicios de consultoría Q4 2024",
  "incidente": "INC-2024-12345"
}
```

### Validaciones Previas Recomendadas

1. **Verificar que la OC existe** (consultar endpoint GET `/ocs/:id` del portal)
2. **Validar saldo disponible** (consultar `/invoices/oc/:ocId/consumo`)
3. **Verificar que suma de allocations = montoSinIgv**
4. **Validar formato de número de factura**

### Respuesta Exitosa

```json
{
  "id": 456,
  "ocId": 123,
  "statusCurrent": "INGRESADO",
  "numberNorm": "F001-00012345",
  "createdAt": "2024-12-26T15:30:00.000Z"
}
```

---

## Flujo 2: Crear Factura sin OC

### Escenario
Crear una factura que no tiene OC previa (gasto directo).

### Workflow n8n

```
[Trigger] → [OCR/Validación] → [Buscar/Crear Proveedor] → [HTTP Request: Crear Factura] → [Notificación]
```

### Configuración del Nodo HTTP Request

**Método:** POST  
**URL:** `{{$node["n8n-config"].json["baseUrl"]}}/n8n/invoices`  
**Body (JSON):**

```json
{
  "docType": "FACTURA",
  "numberNorm": "{{$json["numeroFactura"]}}",
  "montoSinIgv": {{$json["montoSinIgv"]}},
  "moneda": "{{$json["moneda"]}}",
  "proveedor": "{{$json["razonSocial"]}}",
  "proveedorId": {{$json["proveedorId"]}},
  "periodIds": {{$json["periodIds"]}},
  "allocations": {{$json["allocations"]}},
  "detalle": "{{$json["detalle"]}}",
  "exchangeRateOverride": {{$json["tipoCambio"]}}
}
```

### Datos de Entrada Esperados

```json
{
  "numeroFactura": "F001-00067890",
  "montoSinIgv": 850.00,
  "moneda": "PEN",
  "razonSocial": "SERVICIOS DIVERSOS SAC",
  "proveedorId": 42,
  "periodIds": [45],
  "allocations": [
    {
      "costCenterId": 5,
      "amount": 425.00
    },
    {
      "costCenterId": 8,
      "amount": 425.00
    }
  ],
  "detalle": "Mantenimiento de oficinas"
}
```

### Consideraciones Especiales

- Si `moneda = "USD"`, debe incluirse `exchangeRateOverride` o asegurarse que exista TC anual
- El campo `proveedor` es el nombre/razón social en texto
- `proveedorId` debe apuntar a un proveedor existente en la base de datos

---

## Flujo 3: Actualizar Estados de Facturas

### Escenario
Después de validaciones automáticas, mover la factura a siguiente estado del flujo.

### Workflow n8n

```
[Trigger: Nueva Factura] → [Validaciones] → [HTTP Request: Actualizar Estado] → [Notificación]
```

### Configuración del Nodo HTTP Request

**Método:** PATCH  
**URL:** `{{$node["n8n-config"].json["baseUrl"]}}/n8n/invoices/{{$json["invoiceId"]}}/status`  
**Body (JSON):**

```json
{
  "status": "EN_CONTABILIDAD",
  "note": "Validación automática completada. OCR procesado correctamente."
}
```

### Estados Disponibles para n8n

| Estado | Permitido | Notas |
|--------|-----------|-------|
| INGRESADO | ✅ | Estado inicial |
| EN_APROBACION | ✅ | En proceso de aprobación (deprecated) |
| APROBACION_HEAD | ✅ | Aprobación de Head |
| APROBACION_VP | ✅ | Aprobación de VP |
| EN_CONTABILIDAD | ✅ | En contabilidad |
| EN_TESORERIA | ✅ | En tesorería |
| EN_ESPERA_DE_PAGO | ✅ | Esperando pago |
| PAGADO | ✅ | Factura pagada |
| RECHAZADO | ✅ | Factura rechazada |
| ANULADO | ✅ | Factura anulada |
| PROVISIONADO | ✅ | Factura provisionada |
| DISTRIBUIBLE | ✅ | Lista para distribuir |

**Importante:** n8n puede establecer cualquier estado. Es responsabilidad del workflow validar que las transiciones sean apropiadas.

### Validación de Transiciones Recomendada

```javascript
// Código de ejemplo en Function node de n8n
const estadoActual = $json.statusCurrent;
const estadoObjetivo = $json.targetStatus;

// Definir flujo válido según reglas de negocio
const transicionesValidas = {
  'INGRESADO': ['APROBACION_HEAD', 'EN_CONTABILIDAD'],
  'APROBACION_HEAD': ['APROBACION_VP', 'RECHAZADO'],
  'APROBACION_VP': ['EN_CONTABILIDAD', 'RECHAZADO'],
  'EN_CONTABILIDAD': ['EN_TESORERIA'],
  'EN_TESORERIA': ['EN_ESPERA_DE_PAGO'],
  'EN_ESPERA_DE_PAGO': ['PAGADO']
};

// Validar transición
if (transicionesValidas[estadoActual] && 
    !transicionesValidas[estadoActual].includes(estadoObjetivo)) {
  return {
    json: {
      skip: true,
      reason: `Transición no válida: ${estadoActual} → ${estadoObjetivo}`,
      invoiceId: $json.id
    }
  };
}

// Continuar con actualización
return $json;
```

---

## Flujo 4: Actualizar Estados de OCs

### Escenario
Marcar una OC como procesada después de que RPA generó el documento en sistema externo.

### Workflow n8n

```
[Trigger: OC Lista] → [Generar en Sistema Externo] → [HTTP Request: Actualizar Estado] → [Notificación]
```

### Configuración del Nodo HTTP Request

**Método:** PATCH  
**URL:** `{{$node["n8n-config"].json["baseUrl"]}}/n8n/ocs/{{$json["ocId"]}}/status`  
**Body (JSON):**

```json
{
  "estado": "PROCESADO",
  "note": "OC generada en Ultimus. Número: {{$json["numeroGenerado"]}}"
}
```

### Estados Disponibles para n8n

| Estado | Permitido | Notas |
|--------|-----------|-------|
| PENDIENTE | ✅ | OC pendiente |
| PROCESAR | ✅ | Lista para procesar |
| EN_PROCESO | ✅ | En procesamiento |
| PROCESADO | ✅ | Procesada |
| APROBACION_VP | ✅ | En aprobación VP |
| ATENDER_COMPRAS | ✅ | Para área de compras |
| ATENDIDO | ✅ | Atendida (final) |
| ANULADO | ✅ | Anulada |

**Importante:** n8n puede establecer cualquier estado. Es responsabilidad del workflow validar que las transiciones sean apropiadas.

---

## Manejo de Errores

### Estructura de Error Estándar

```json
{
  "error": "VALIDATION_ERROR",
  "issues": [
    {
      "path": ["montoSinIgv"],
      "message": "El monto (2000.00) excede el saldo disponible de la OC (1500.00 USD)"
    }
  ]
}
```

### Errores Comunes y Soluciones

#### Error 401: Token Inválido

```json
{
  "error": "Token n8n inválido"
}
```

**Solución:** Verificar que el header `Authorization` contenga `Bearer {API_KEY}` correctamente.


#### Error 422: Monto Excede Saldo

```json
{
  "error": "VALIDATION_ERROR",
  "issues": [
    {
      "path": ["montoSinIgv"],
      "message": "El monto (2000.00) excede el saldo disponible de la OC (1500.00 USD)"
    }
  ]
}
```

**Solución:** Consultar saldo disponible antes de crear factura (`GET /invoices/oc/:ocId/consumo`).

#### Error 422: TC No Configurado

```json
{
  "error": "VALIDATION_ERROR",
  "issues": [
    {
      "path": ["exchangeRateOverride"],
      "message": "Configura tipo de cambio anual para 2024 o ingresa TC manual"
    }
  ]
}
```

**Solución:** Para facturas USD, proporcionar `exchangeRateOverride` o configurar TC anual en el portal.

### Nodo de Manejo de Errores en n8n

```javascript
// Function node: Error Handler
if ($json.error) {
  const errorType = $json.error;
  const details = $json.issues || [];
  
  return {
    json: {
      success: false,
      errorType,
      message: details.map(i => i.message).join('; '),
      originalData: $input.all()[0].json,
      timestamp: new Date().toISOString()
    }
  };
}

return {
  json: {
    success: true,
    data: $json
  }
};
```

---

## Casos de Uso Comunes

### Caso 1: Pipeline Completo de Factura con OCR

```
1. Trigger: Archivo subido a carpeta Drive
2. OCR: Extraer datos (Google Vision / Tesseract)
3. Validación: Verificar formato, montos, fechas
4. Búsqueda OC: Buscar OC asociada en portal
5. Verificar Saldo: Consultar saldo disponible
6. Crear Factura: POST /n8n/invoices
7. Actualizar Estado: PATCH /n8n/invoices/:id/status → EN_CONTABILIDAD
8. Notificación: Email a contabilidad
```

### Caso 2: Procesamiento Masivo de Facturas

```
1. Trigger: Webhook desde sistema contable
2. Split: Dividir lote en facturas individuales
3. Loop: Para cada factura:
   a. Validar datos
   b. Crear factura (POST /n8n/invoices)
   c. Esperar 1 segundo (rate limiting)
4. Aggregate: Consolidar resultados
5. Reporte: Generar resumen (exitosas/fallidas)
6. Notificación: Email con reporte
```

### Caso 3: Sincronización de Estados

```
1. Trigger: Cron (cada 15 minutos)
2. Consultar: Sistema externo busca facturas pendientes
3. Para cada factura en sistema externo:
   a. Buscar en portal por numberNorm
   b. Comparar estados
   c. Si difieren: actualizar en portal (PATCH /n8n/invoices/:id/status)
4. Log: Registrar cambios realizados
```

### Caso 4: Workflow de Aprobación Automática

```
1. Trigger: Nueva factura creada (webhook del portal)
2. Validaciones Automáticas:
   a. Verificar datos contra base externa
   b. Validar que proveedor esté habilitado
   c. Verificar límites de crédito
3. Si pasa validaciones:
   a. Actualizar estado → EN_CONTABILIDAD
   b. Notificar a aprobadores Head (si requiere aprobación manual)
4. Si falla validaciones:
   a. Registrar motivo en sistema
   b. No cambiar estado (queda en INGRESADO)
   c. Notificar a responsable
```

---

## Mejores Prácticas

### 1. Rate Limiting

- No enviar más de 10 requests por segundo
- Usar delays entre llamadas en loops
- Implementar retry con backoff exponencial

```javascript
// Function node: Rate Limiter
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
await delay(100); // 100ms entre requests
return $json;
```

### 2. Validación Previa

Siempre validar datos antes de enviar al endpoint:

```javascript
// Function node: Pre-Validation
const errors = [];

if (!$json.numberNorm || $json.numberNorm.length < 5) {
  errors.push("Número de factura inválido");
}

if ($json.montoSinIgv <= 0) {
  errors.push("Monto debe ser positivo");
}

if (!Array.isArray($json.allocations) || $json.allocations.length === 0) {
  errors.push("Debe incluir al menos un CECO");
}

const totalAllocated = $json.allocations.reduce((sum, a) => sum + a.amount, 0);
if (Math.abs(totalAllocated - $json.montoSinIgv) > 0.01) {
  errors.push(`Suma de distribución (${totalAllocated}) no coincide con monto (${$json.montoSinIgv})`);
}

if (errors.length > 0) {
  throw new Error(`Validación fallida: ${errors.join('; ')}`);
}

return $json;
```

### 3. Logging y Auditoría

- Registrar todas las llamadas API
- Guardar request/response para debugging
- Implementar alertas para fallos recurrentes

### 4. Manejo de Transaccionalidad

- Si una operación falla en un lote, decidir estrategia:
  - Continuar con las demás (más robusto)
  - Detener todo el lote (más seguro)
- Implementar rollback manual si es necesario

### 5. Monitoreo

- Configurar alertas para errores 401/403/500
- Monitorear tasas de éxito/fallo
- Revisar logs diariamente

---

## Testing

### Test 1: Health Check

```bash
curl -X GET http://localhost:3001/n8n/health \
  -H "Authorization: Bearer TU_API_KEY"
```

**Respuesta esperada:** `200 OK` con `{"ok": true, ...}`

### Test 2: Crear Factura (Caso Exitoso)

```bash
curl -X POST http://localhost:3001/n8n/invoices \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "ocId": 1,
    "docType": "FACTURA",
    "numberNorm": "TEST-F001-001",
    "montoSinIgv": 100.00,
    "periodIds": [1],
    "allocations": [{"costCenterId": 1, "amount": 100.00}]
  }'
```

**Respuesta esperada:** `200 OK` con objeto factura creada.

### Test 3: Crear Factura (Caso Error - Saldo Excedido)

```bash
curl -X POST http://localhost:3001/n8n/invoices \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "ocId": 1,
    "docType": "FACTURA",
    "numberNorm": "TEST-F001-002",
    "montoSinIgv": 999999.00,
    "periodIds": [1],
    "allocations": [{"costCenterId": 1, "amount": 999999.00}]
  }'
```

**Respuesta esperada:** `422 Unprocessable Entity` con mensaje de error.

### Test 4: Actualizar Estado (Caso Exitoso)

```bash
curl -X PATCH http://localhost:3001/n8n/invoices/1/status \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "EN_CONTABILIDAD",
    "note": "Test de actualización"
  }'
```

**Respuesta esperada:** `200 OK` con factura actualizada.

### Test 5: Actualizar Estado (Caso Error - Estado Protegido)

```bash
curl -X PATCH http://localhost:3001/n8n/invoices/1/status \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PAGADO"
  }'
```

**Respuesta esperada:** `403 Forbidden` con mensaje indicando estado protegido.

---

## Contacto y Soporte

- **Documentación API:** `DOCUMENTACIÓN/N8N_API_ENDPOINTS.md`
- **Código fuente:** `apps/api/src/n8n.ts`
- **Issues:** Reportar al equipo de desarrollo

---

**Última actualización:** Diciembre 2024
