# Documentación de Endpoints N8N - Portal PPTO

## Información General

Esta documentación describe los endpoints expuestos para la integración con n8n, un sistema externo de automatización que permite crear facturas y actualizar estados de Órdenes de Compra (OCs) y Facturas de forma automatizada.

**Versión:** 1.0  
**Fecha:** Diciembre 2024  
**Base URL:** `http://localhost:3001` (desarrollo) / `https://[production-url]` (producción)

---

## Autenticación

**Todos los endpoints n8n requieren autenticación mediante API Key.**

### Método de Autenticación

- **Tipo:** Bearer Token
- **Header:** `Authorization: Bearer {API_KEY}`
- **Configuración:** La API Key se configura mediante la variable de entorno `RPA_API_KEY`

### Ejemplo de Header

```http
Authorization: Bearer tu_api_key_secreta_aqui
```

### Códigos de Error de Autenticación

- `401 Unauthorized`: Token no proporcionado o inválido
- `500 Internal Server Error`: API Key no configurada en el servidor

---

## Endpoints Disponibles

### 1. Health Check

**Propósito:** Verificar que el servicio n8n está operativo y la autenticación funciona correctamente.

**Endpoint:** `GET /n8n/health`

**Autenticación:** API Key requerida

**Módulo Afectado:** Ninguno (endpoint de diagnóstico)

**Respuesta Exitosa (200):**

```json
{
  "ok": true,
  "service": "n8n-integration",
  "timestamp": "2024-12-26T15:30:00.000Z"
}
```

**Ejemplo de Uso:**

```bash
curl -X GET http://localhost:3001/n8n/health \
  -H "Authorization: Bearer tu_api_key"
```

---

### 2. Crear Factura / Nota de Crédito

**Propósito:** Crear una nueva factura o nota de crédito en el sistema desde n8n.

**Endpoint:** `POST /n8n/invoices`

**Método HTTP:** POST

**Autenticación:** API Key requerida

**Módulo Afectado:** Facturas

**Acción Realizada:** Creación de factura/nota de crédito con estado inicial `INGRESADO`

**Estados que Puede Modificar:** N/A (solo crea nuevas facturas)

**Características:**
- ✅ La carga de documentos es **opcional** y no bloqueante
- ✅ Puede crear facturas con OC asociada o sin OC
- ✅ Todas las validaciones de negocio se aplican automáticamente
- ✅ Respeta restricciones de periodos y CECOs según la OC
- ✅ Calcula automáticamente campos contables (TC, montos en PEN)
- ✅ Registra trazabilidad automática en el historial

**Request Body (JSON):**

```json
{
  "ocId": 123,  // OPCIONAL - ID de la Orden de Compra asociada
  "docType": "FACTURA",  // "FACTURA" | "NOTA_CREDITO"
  "numberNorm": "F001-00012345",  // Número de factura normalizado
  "montoSinIgv": 1500.00,  // Monto sin IGV
  
  // PERÍODOS - usar periodIds O periodKeys (al menos uno requerido)
  "periodIds": [45, 46, 47],  // OPCIÓN 1: IDs de los periodos
  "periodKeys": ["2024-10", "2024-11", "2024-12"],  // OPCIÓN 2: Keys YYYY-MM
  
  // DISTRIBUCIÓN POR CECO - usar costCenterId O costCenterCode en cada allocation
  "allocations": [
    {
      "costCenterId": 5,  // OPCIÓN 1: ID del CECO
      "costCenterCode": "CC-001",  // OPCIÓN 2: Código del CECO
      "amount": 750.00,
      "percentage": 50
    },
    {
      "costCenterId": 8,
      "amount": 750.00,
      "percentage": 50
    }
  ],
  
  "ultimusIncident": "INC-2024-12345",  // OPCIONAL - Incidente Ultimus
  "detalle": "Servicios de consultoría diciembre 2024",  // OPCIONAL
  "supportId": 10,  // OPCIONAL - ID del sustento (requerido si no hay OC)
  "supportCode": "S-0010",  // OPCIONAL - Código del sustento (alternativa a supportId)
  "proveedorId": 42,  // OPCIONAL - ID del proveedor
  "proveedorRuc": "20123456789",  // OPCIONAL - RUC del proveedor (alternativa a proveedorId)
  "proveedor": "ACME Corp SAC",  // OPCIONAL - Nombre proveedor (requerido si no hay OC)
  "moneda": "USD",  // OPCIONAL - "PEN" | "USD" (requerido si no hay OC)
  "exchangeRateOverride": 3.75,  // OPCIONAL - TC manual (sobrescribe el anual)
  "mesContable": "2024-12",  // OPCIONAL - Mes contable (YYYY-MM)
  "tcReal": 3.78  // OPCIONAL - TC real para diferencia cambiaria
}
```

**Campos Requeridos:**
- `numberNorm`: Número de factura
- `montoSinIgv`: Monto sin IGV
- **Períodos** (al menos uno de los dos):
  - `periodIds`: Array de IDs de periodos, O
  - `periodKeys`: Array de strings formato "YYYY-MM"
- **Allocations** (al menos uno, cada allocation debe tener uno de los dos):
  - `costCenterId`: ID del CECO, O
  - `costCenterCode`: Código del CECO

**Campos Condicionales:**
- **Sin OC (`ocId` no proporcionado):**
  - **Sustento** (uno de los dos):
    - `supportId`: ID del sustento (número), O
    - `supportCode`: Código del sustento (string, ej. "S-0010")
  - **Proveedor** (uno de los dos):
    - `proveedorId`: ID del proveedor (número), O
    - `proveedorRuc`: RUC del proveedor (11 dígitos)
  - `moneda`: Moneda de la factura (requerido)
- **Con OC (`ocId` proporcionado):**
  - Se heredan automáticamente: `moneda`, `proveedor`, `sustento` de la OC

**Nota sobre Períodos, CECOs, Sustentos y Proveedores:**
- **Períodos:** Puedes usar `periodIds` (IDs numéricos) o `periodKeys` (formato "YYYY-MM")
- **CECOs:** Puedes usar `costCenterId` (ID numérico) o `costCenterCode` (código string) en cada allocation
- **Sustentos:** Puedes usar `supportId` (ID numérico) o `supportCode` (código string, ej. "S-0010")
- **Proveedores:** Puedes usar `proveedorId` (ID numérico) o `proveedorRuc` (RUC de 11 dígitos)
- Si usas códigos/keys/RUC, el sistema los resolverá automáticamente a IDs
- Error 422 si algún código/key/RUC no existe en la base de datos
- **Sin OC:** Los CECOs seleccionados deben pertenecer al sustento especificado

**Validaciones Aplicadas:**

1. **Validación de OC (si aplica):**
   - OC debe existir
   - Monto no debe exceder saldo disponible (para facturas)
   - Nota de crédito no puede ser mayor al consumo actual
   - Periodos deben estar dentro del rango de la OC
   - CECOs deben estar asociados a la OC

2. **Validación de Tipo de Cambio:**
   - Para moneda USD: debe existir TC anual o proporcionar `exchangeRateOverride`
   - Para moneda PEN: TC = 1

3. **Validación de Distribución:**
   - La suma de `allocations.amount` debe igualar `montoSinIgv` (tolerancia: 0.01)

**Respuesta Exitosa (200):**

```json
{
  "id": 456,
  "ocId": 123,
  "docType": "FACTURA",
  "numberNorm": "F001-00012345",
  "currency": "USD",
  "montoSinIgv": "1500.00",
  "exchangeRateOverride": "3.75",
  "statusCurrent": "INGRESADO",
  "ultimusIncident": "INC-2024-12345",
  "detalle": "Servicios de consultoría diciembre 2024",
  "mesContable": "2024-12",
  "tcEstandar": "3.70",
  "tcReal": "3.78",
  "montoPEN_tcEstandar": "5550.00",
  "montoPEN_tcReal": "5670.00",
  "diferenciaTC": "120.00",
  "createdAt": "2024-12-26T15:30:00.000Z",
  "updatedAt": "2024-12-26T15:30:00.000Z",
  "periods": [
    {
      "id": 1,
      "periodId": 45,
      "period": {
        "id": 45,
        "year": 2024,
        "month": 10,
        "label": "Oct 2024"
      }
    }
  ],
  "costCenters": [
    {
      "id": 1,
      "costCenterId": 5,
      "amount": "750.00",
      "percentage": "50.00",
      "costCenter": {
        "id": 5,
        "code": "CC-001",
        "name": "Administración"
      }
    }
  ]
}
```

**Errores Posibles:**

- `422 Unprocessable Entity`: Errores de validación
  - OC no encontrada
  - Monto excede saldo disponible
  - Periodos fuera de rango
  - CECOs no asociados a la OC
  - Suma de distribución no coincide
  - TC anual no configurado

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

**Ejemplo 1: Con OC usando IDs numéricos (tradicional):**

```bash
curl -X POST http://localhost:3001/n8n/invoices \
  -H "Authorization: Bearer tu_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "ocId": 123,
    "docType": "FACTURA",
    "numberNorm": "F001-00012345",
    "montoSinIgv": 1500.00,
    "periodIds": [45],
    "allocations": [
      {
        "costCenterId": 5,
        "amount": 1500.00
      }
    ],
    "detalle": "Servicios de consultoría"
  }'
```

**Ejemplo 2: Con OC usando códigos y keys (nuevo, más legible):**

```bash
curl -X POST http://localhost:3001/n8n/invoices \
  -H "Authorization: Bearer tu_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "ocId": 123,
    "docType": "FACTURA",
    "numberNorm": "F001-00012345",
    "montoSinIgv": 1500.00,
    "periodKeys": ["2024-10"],
    "allocations": [
      {
        "costCenterCode": "CC-001",
        "amount": 1500.00
      }
    ],
    "detalle": "Servicios de consultoría"
  }'
```

**Ejemplo 3: Sin OC con sustento, múltiples periodos y CECOs (usando codes):**

```bash
curl -X POST http://localhost:3001/n8n/invoices \
  -H "Authorization: Bearer tu_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "docType": "FACTURA",
    "numberNorm": "F001-00012345",
    "montoSinIgv": 850.00,
    "moneda": "PEN",
    "supportCode": "S-0010",
    "proveedorRuc": "20123456789",
    "periodKeys": ["2024-10", "2024-11"],
    "allocations": [
      {
        "costCenterCode": "CC-001",
        "amount": 425.00
      },
      {
        "costCenterCode": "CC-002",
        "amount": 425.00
      }
    ],
    "detalle": "Servicios sin OC"
  }'
```

**Ejemplo 4: Con RUC de proveedor (sin OC, usando RUC):**

```bash
curl -X POST http://localhost:3001/n8n/invoices \
  -H "Authorization: Bearer tu_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "docType": "FACTURA",
    "numberNorm": "F001-00012345",
    "montoSinIgv": 1200.00,
    "moneda": "USD",
    "proveedor": "Tech Solutions Inc",
    "proveedorRuc": "20123456789",
    "periodKeys": ["2024-12"],
    "exchangeRateOverride": 3.75,
    "allocations": [
      {
        "costCenterCode": "CC-IT",
        "amount": 1200.00
      }
    ]
  }'
```

**Ejemplo 5: Mezcla de IDs y códigos (válido):**

```bash
curl -X POST http://localhost:3001/n8n/invoices \
  -H "Authorization: Bearer tu_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "docType": "FACTURA",
    "numberNorm": "F001-00067890",
    "montoSinIgv": 850.00,
    "moneda": "PEN",
    "proveedor": "Servicios SAC",
    "proveedorId": 42,
    "periodKeys": ["2024-12"],
    "allocations": [
      {
        "costCenterId": 5,
        "amount": 425.00
      },
      {
        "costCenterCode": "CC-OPE",
        "amount": 425.00
      }
    ]
  }'
```

---

### 3. Actualizar Estado de Factura

**Propósito:** Actualizar el estado interno/crudo de una factura existente.

**Endpoint:** `PATCH /n8n/invoices/:id/status`

**Método HTTP:** PATCH

**Autenticación:** API Key requerida

**Módulo Afectado:** Facturas

**Acción Realizada:** Cambio de estado de factura

**Estados que Puede Modificar:**

✅ **Todos los estados están permitidos (sin restricciones):**
- `INGRESADO`
- `EN_APROBACION`
- `APROBACION_HEAD`
- `APROBACION_VP`
- `EN_CONTABILIDAD`
- `EN_TESORERIA`
- `EN_ESPERA_DE_PAGO`
- `PAGADO`
- `RECHAZADO`
- `ANULADO`
- `PROVISIONADO`
- `DISTRIBUIBLE`

**Nota:** n8n tiene control total sobre los estados de facturas y puede establecer cualquier estado según las necesidades del flujo automatizado.

**Request Body (JSON):**

```json
{
  "status": "EN_CONTABILIDAD",
  "note": "Factura procesada y validada por n8n"  // OPCIONAL
}
```

**Parámetros de URL:**
- `:id` - ID de la factura a actualizar

**Respuesta Exitosa (200):**

```json
{
  "id": 456,
  "statusCurrent": "EN_CONTABILIDAD",
  "updatedAt": "2024-12-26T15:35:00.000Z",
  ...
}
```

**Errores Posibles:**

- `404 Not Found`: Factura no encontrada
- `422 Unprocessable Entity`: Estado inválido (no existe en el enum)

**Ejemplo de Uso:**

```bash
curl -X PATCH http://localhost:3001/n8n/invoices/456/status \
  -H "Authorization: Bearer tu_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "EN_CONTABILIDAD",
    "note": "Validación automática completada"
  }'
```

---

### 4. Actualizar Estado de Orden de Compra

**Propósito:** Actualizar el estado interno/crudo de una Orden de Compra existente.

**Endpoint:** `PATCH /n8n/ocs/:id/status`

**Método HTTP:** PATCH

**Autenticación:** API Key requerida

**Módulo Afectado:** Órdenes de Compra

**Acción Realizada:** Cambio de estado de OC

**Estados que Puede Modificar:**

✅ **Todos los estados están permitidos (sin restricciones):**
- `PENDIENTE`
- `PROCESAR`
- `EN_PROCESO`
- `PROCESADO`
- `APROBACION_VP`
- `ATENDER_COMPRAS`
- `ATENDIDO`
- `ANULADO`

**Nota:** n8n tiene control total sobre los estados de OCs y puede establecer cualquier estado según las necesidades del flujo automatizado.

**Request Body (JSON):**

```json
{
  "estado": "PROCESADO",
  "note": "OC procesada automáticamente por n8n"  // OPCIONAL
}
```

**Parámetros de URL:**
- `:id` - ID de la OC a actualizar

**Respuesta Exitosa (200):**

```json
{
  "id": 123,
  "estado": "PROCESADO",
  "updatedAt": "2024-12-26T15:40:00.000Z",
  "support": {
    "id": 5,
    "code": "SRV-001",
    "name": "Servicios Generales"
  },
  "budgetPeriodFrom": {
    "id": 45,
    "year": 2024,
    "month": 10,
    "label": "Oct 2024"
  },
  "budgetPeriodTo": {
    "id": 47,
    "year": 2024,
    "month": 12,
    "label": "Dic 2024"
  },
  "costCenters": [
    {
      "costCenter": {
        "id": 5,
        "code": "CC-001",
        "name": "Administración"
      }
    }
  ],
  ...
}
```

**Errores Posibles:**

- `404 Not Found`: OC no encontrada
- `422 Unprocessable Entity`: Estado inválido (no existe en el enum)

**Ejemplo de Uso:**

```bash
curl -X PATCH http://localhost:3001/n8n/ocs/123/status \
  -H "Authorization: Bearer tu_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "PROCESADO",
    "note": "Procesamiento automático completado"
  }'
```

---

## Flujos de Estado

### Flujo de Estados - Facturas

```
INGRESADO ← ✅ Permitido
    ↓
APROBACION_HEAD ← ✅ Permitido
    ↓
APROBACION_VP ← ✅ Permitido
    ↓
EN_CONTABILIDAD ← ✅ Permitido
    ↓
EN_TESORERIA ← ✅ Permitido
    ↓
EN_ESPERA_DE_PAGO ← ✅ Permitido
    ↓
PAGADO ← ✅ Permitido

RECHAZADO ← ✅ Permitido
ANULADO ← ✅ Permitido
PROVISIONADO ← ✅ Permitido
DISTRIBUIBLE ← ✅ Permitido
```

**Nota:** n8n puede establecer cualquier estado sin restricciones. Es responsabilidad de la integración asegurar que las transiciones sean apropiadas para el flujo de negocio.

### Flujo de Estados - Órdenes de Compra

```
PENDIENTE ← ✅ Permitido
    ↓
PROCESAR ← ✅ Permitido
    ↓
EN_PROCESO ← ✅ Permitido
    ↓
PROCESADO ← ✅ Permitido
    ↓
APROBACION_VP ← ✅ Permitido
    ↓
ATENDER_COMPRAS ← ✅ Permitido
    ↓
ATENDIDO ← ✅ Permitido

ANULADO ← ✅ Permitido
```

**Nota:** n8n puede establecer cualquier estado sin restricciones. Es responsabilidad de la integración asegurar que las transiciones sean apropiadas para el flujo de negocio.

---

## Trazabilidad

**Todas las acciones ejecutadas desde n8n quedan registradas automáticamente:**

### Para Facturas:
- Se crea entrada en `InvoiceStatusHistory` con:
  - `status`: Estado establecido
  - `changedAt`: Timestamp automático
  - `note`: "Creado automáticamente desde n8n" o nota personalizada

### Para Órdenes de Compra:
- Se crea entrada en `OCStatusHistory` con:
  - `status`: Estado establecido
  - `changedAt`: Timestamp automático
  - `note`: "Actualizado automáticamente desde n8n" o nota personalizada

### Auditoría
- Todas las acciones son auditables igual que las acciones manuales
- El origen de la acción (n8n) queda registrado en el campo `note`
- No impacta la UX del portal

---

## Códigos de Estado HTTP

| Código | Significado | Descripción |
|--------|-------------|-------------|
| `200` | OK | Operación exitosa |
| `401` | Unauthorized | API Key no proporcionada o inválida |
| `403` | Forbidden | Operación no permitida (estado protegido) |
| `404` | Not Found | Recurso no encontrado (factura/OC no existe) |
| `422` | Unprocessable Entity | Error de validación de negocio |
| `500` | Internal Server Error | Error del servidor |

---

## Resumen de Endpoints

| Endpoint | Método | Propósito | Módulo | Autenticación |
|----------|--------|-----------|--------|---------------|
| `/n8n/health` | GET | Health check | N/A | API Key |
| `/n8n/invoices` | POST | Crear factura/nota crédito | Facturas | API Key |
| `/n8n/invoices/:id/status` | PATCH | Actualizar estado factura | Facturas | API Key |
| `/n8n/ocs/:id/status` | PATCH | Actualizar estado OC | Órdenes de Compra | API Key |

---

## Notas Importantes

### Seguridad
- ✅ Todos los endpoints requieren API Key (`RPA_API_KEY`)
- ✅ Los endpoints están separados de los endpoints UI (prefijo `/n8n/`)
- ✅ n8n **NO puede** escribir directamente en la base de datos
- ✅ n8n **NO puede** eludir validaciones de negocio

### Validaciones
- ✅ Todas las validaciones de creación del portal se aplican
- ✅ n8n puede establecer **cualquier estado** sin restricciones
- ✅ El portal sigue siendo la única fuente de verdad para la lógica de negocio

### Control de Estados
- ⚠️ n8n tiene control total sobre cambios de estado
- ⚠️ Es responsabilidad de la integración n8n asegurar transiciones válidas
- ⚠️ Se recomienda implementar validaciones en los workflows de n8n

### Documentación
- ❌ **NO se requiere** carga obligatoria de documentos
- ✅ La carga de documentos es opcional y no bloqueante
- ✅ Esta es una característica de la integración inicial

---

## Configuración

### Variables de Entorno Requeridas

```bash
# API Key compartida para RPA y n8n
RPA_API_KEY=tu_api_key_secreta_aqui

# URL de base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/ppto

# Otros (ya existentes)
API_PORT=3001
NODE_ENV=development
```

---

## Soporte y Contacto

Para soporte técnico, preguntas o reportar problemas:
- Revisar logs del servidor en modo desarrollo
- Consultar código fuente: `apps/api/src/n8n.ts`
- Contactar al equipo de desarrollo

---

**Última actualización:** Diciembre 2024  
**Versión del documento:** 1.0
