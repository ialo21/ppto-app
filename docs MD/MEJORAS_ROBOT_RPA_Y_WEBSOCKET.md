# Mejoras Robot RPA y WebSocket - Sistema PPTO

**Fecha:** 17 de Diciembre, 2024  
**Objetivo:** Mejorar gestión de errores del robot Ultimus, implementar estado temporal "EN_PROCESO" y habilitar actualizaciones en tiempo real via WebSocket.

---

## 📋 Resumen Ejecutivo

Se implementaron mejoras críticas en tres áreas del sistema:

1. **Gestión de Errores del Robot**: Cada OC ahora gestiona su propia sesión Selenium independiente
2. **Estados de OC Mejorados**: Nuevo estado `EN_PROCESO` visible en el sistema
3. **Actualizaciones en Tiempo Real**: WebSocket para updates instantáneos sin refrescar página

---

## 🎯 Cambios Implementados

### 1. Base de Datos - Nuevo Estado EN_PROCESO

**Archivo:** `packages/db/schema.prisma`

```prisma
enum OcStatus {
  PENDIENTE
  PROCESAR
  EN_PROCESO    // ← NUEVO
  PROCESADO
  APROBACION_VP
  ANULAR
  ANULADO
  ATENDER_COMPRAS
  ATENDIDO
}
```

**Migración:** `20251217145414_add_en_proceso_status`
- ✅ Migración aplicada exitosamente
- ✅ Base de datos actualizada

---

### 2. Backend API - Endpoints RPA Mejorados

**Archivo:** `apps/api/src/rpa.ts`

#### Cambio 1: Endpoint `/rpa/ocs/:id/claim`
- **ANTES:** Solo verificaba estado, no lo cambiaba
- **AHORA:** Transacción atómica que cambia estado a `EN_PROCESO`
- **Beneficio:** Lock atómico previene procesamiento duplicado

```typescript
// Transacción atómica: verificar PROCESAR y cambiar a EN_PROCESO
const result = await prisma.$transaction(async (tx) => {
  // Verificar estado
  if (oc.estado !== "PROCESAR") {
    throw { code: 409, message: "OC no disponible" };
  }
  
  // Cambiar a EN_PROCESO (lock atómico)
  const updated = await tx.oC.update({
    where: { id },
    data: { estado: "EN_PROCESO" }
  });
  
  // Registrar en historial
  await tx.oCStatusHistory.create({
    data: { ocId: id, status: "EN_PROCESO", note: "Reclamado por RPA" }
  });
  
  return updated;
});

// Broadcast via WebSocket
broadcastOcStatusChange({
  ocId: id,
  newStatus: "EN_PROCESO",
  timestamp: new Date().toISOString()
});
```

#### Cambio 2: Endpoint `/rpa/ocs/:id/complete`
- **ANTES:** En error mantenía estado `PROCESAR`
- **AHORA:** En error vuelve a `PENDIENTE` (usuario debe cambiar manualmente a `PROCESAR`)
- **Validación:** Verifica estado `EN_PROCESO` en lugar de `PROCESAR`

```typescript
if (data.ok) {
  // Éxito → PROCESADO
  updateData.estado = "PROCESADO";
} else {
  // Error → PENDIENTE (no PROCESAR)
  updateData.estado = "PENDIENTE";
  
  // Guardar mensaje de error en comentario
  const errorPrefix = `[ERROR RPA ${new Date().toISOString()}]: ${data.errorMessage}`;
  updateData.comentario = currentComment 
    ? `${errorPrefix}\n\n${currentComment}` 
    : errorPrefix;
}

// Broadcast via WebSocket
broadcastOcStatusChange({
  ocId: id,
  newStatus: data.ok ? "PROCESADO" : "PENDIENTE",
  timestamp: new Date().toISOString()
});
```

---

### 3. Robot RPA - Gestión de Sesiones Selenium Mejorada

**Archivo:** `ultimus_robot_OCs_api/main.py`

#### Cambio Principal: Sesión Selenium por OC
- **ANTES:** Una sesión global para todas las OCs (errores se propagaban)
- **AHORA:** Nueva sesión Selenium por cada OC individual

```python
def process_single_oc(self, oc_id: int) -> bool:
    ultimus_bot = None
    
    try:
        # Reclamar OC (cambia a EN_PROCESO)
        oc = self.api_client.claim_oc(oc_id)
        
        # Crear NUEVA instancia de UltimusBot para esta OC
        logger.info("   [SELENIUM] Iniciando nueva sesión de navegador...")
        ultimus_bot = UltimusBot(ULTIMUS_USERNAME, ULTIMUS_PASSWORD)
        
        # Procesar OC...
        ultimus_bot.login()
        ultimus_bot.open_purchase_request()
        # ... resto del proceso
        
        # Completar exitosamente
        self.api_client.complete_oc(oc_id=oc_id, ok=True, ...)
        return True
        
    except Exception as e:
        # Registrar error
        self.api_client.complete_oc(oc_id=oc_id, ok=False, error_message=str(e))
        return False
        
    finally:
        # CRÍTICO: Cerrar sesión SIEMPRE (éxito o error)
        if ultimus_bot:
            try:
                logger.info("   [SELENIUM] Cerrando sesión de navegador...")
                ultimus_bot.close()
            except Exception as close_error:
                logger.warning(f"   [WARN] Error al cerrar navegador: {close_error}")
```

**Beneficios:**
- ✅ Errores de Selenium no afectan OCs subsiguientes
- ✅ Cada OC comienza con sesión limpia
- ✅ Mejor aislamiento y diagnóstico de errores
- ✅ Múltiples OCs en cola se procesan de forma más robusta

---

### 4. Backend WebSocket - Actualizaciones en Tiempo Real

**Archivo Nuevo:** `apps/api/src/websocket.ts`

```typescript
export async function registerWebSocket(app: FastifyInstance) {
  await app.register(websocket);
  
  app.get("/ws", { websocket: true }, (connection, req) => {
    connections.add(connection);
    console.log(`[WS] Cliente conectado. Total: ${connections.size}`);
    // ...
  });
}

export function broadcastOcStatusChange(data: {
  ocId: number;
  newStatus: string;
  timestamp: string;
}) {
  const message = JSON.stringify({
    type: "oc_status_change",
    data
  });
  
  connections.forEach((connection) => {
    if (connection.socket.readyState === 1) {
      connection.socket.send(message);
    }
  });
}

export function broadcastInvoiceStatusChange(data: {
  invoiceId: number;
  newStatus: string;
  timestamp: string;
}) {
  // Similar para facturas...
}
```

**Integración en Backend:**
- `apps/api/src/index.ts`: Registrar WebSocket antes de otros plugins
- `apps/api/src/rpa.ts`: Broadcasts en claim y complete
- `apps/api/src/oc.ts`: Broadcast en cambio manual de estado
- `apps/api/src/invoices.ts`: Broadcast en cambio de estado de factura

---

### 5. Frontend - Hook useWebSocket

**Archivo Nuevo:** `apps/web/src/hooks/useWebSocket.ts`

```typescript
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  
  const connect = useCallback(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws";
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case "oc_status_change":
          options.onOcStatusChange?.(message.data);
          break;
        case "invoice_status_change":
          options.onInvoiceStatusChange?.(message.data);
          break;
      }
    };
    
    ws.onclose = () => {
      // Reconectar automáticamente
      if (reconnectAttempts < maxReconnectAttempts) {
        setTimeout(() => connect(), reconnectDelay);
      }
    };
    
    wsRef.current = ws;
  }, [options]);
  
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);
}
```

**Características:**
- ✅ Reconexión automática (máx 5 intentos)
- ✅ Gestión de conexión/desconexión
- ✅ Callbacks para diferentes tipos de eventos
- ✅ Limpieza automática al desmontar componente

---

### 6. Frontend - Componentes Actualizados

#### OcStatusChip
**Archivo:** `apps/web/src/components/OcStatusChip.tsx`

```typescript
const OC_STATUSES = [
  { value: "PENDIENTE", label: "Pendiente", color: "bg-gray-100 text-gray-800" },
  { value: "PROCESAR", label: "Procesar", color: "bg-yellow-100 text-yellow-800" },
  { value: "EN_PROCESO", label: "En Proceso", color: "bg-cyan-100 text-cyan-800" }, // ← NUEVO
  { value: "PROCESADO", label: "Procesado", color: "bg-blue-100 text-blue-800" },
  // ... otros estados
];
```

#### OcGestionPage
**Archivo:** `apps/web/src/pages/purchase-orders/OcGestionPage.tsx`

```typescript
export default function OcGestionPage() {
  const queryClient = useQueryClient();
  
  // WebSocket para actualizaciones en tiempo real
  useWebSocket({
    onOcStatusChange: (data) => {
      console.log(`[WS] OC ${data.ocId} cambió a estado ${data.newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["ocs"] });
      toast.success(`OC actualizada: nuevo estado ${data.newStatus}`);
    },
    onConnected: () => {
      console.log("[WS] Conectado - recibiendo actualizaciones en tiempo real");
    }
  });
  
  // ... resto del componente
}
```

#### Páginas Actualizadas con WebSocket:
- ✅ `OcGestionPage.tsx` - Gestión de OCs
- ✅ `OcListadoPage.tsx` - Listado de OCs
- ✅ `InvoiceGestionPage.tsx` - Gestión de Facturas
- ✅ `InvoiceListadoPage.tsx` - Listado de Facturas

---

## 🔄 Flujo Completo de Procesamiento de OC

### Estado Inicial: OC en PENDIENTE
1. Usuario cambia OC a estado `PROCESAR` manualmente
2. WebSocket notifica cambio a todos los usuarios conectados

### Robot Detecta OC
1. Robot consulta endpoint `GET /rpa/ocs/to-process`
2. Encuentra OCs con estado `PROCESAR`

### Robot Reclama OC
1. Robot llama `POST /rpa/ocs/:id/claim`
2. **Backend:** Transacción atómica cambia estado a `EN_PROCESO`
3. **Backend:** Broadcast WebSocket notifica cambio
4. **Frontend:** Todas las pantallas se actualizan mostrando estado "En Proceso"

### Robot Procesa OC
1. **Robot:** Crea nueva sesión Selenium
2. **Robot:** Login, navega, llena formulario
3. **Robot:** Captura IDs de solicitud e incidente

### Procesamiento Exitoso
1. **Robot:** Llama `POST /rpa/ocs/:id/complete` con `ok: true`
2. **Backend:** Cambia estado a `PROCESADO`, guarda IDs
3. **Backend:** Registra en historial
4. **Backend:** Broadcast WebSocket notifica cambio
5. **Frontend:** UI actualizada instantáneamente
6. **Robot:** Cierra sesión Selenium en `finally`

### Procesamiento con Error
1. **Robot:** Captura excepción
2. **Robot:** Llama `POST /rpa/ocs/:id/complete` con `ok: false, errorMessage`
3. **Backend:** Cambia estado a `PENDIENTE` (no `PROCESAR`)
4. **Backend:** Guarda error en campo `comentario`
5. **Backend:** Registra en historial
6. **Backend:** Broadcast WebSocket notifica cambio
7. **Frontend:** UI actualizada, muestra estado PENDIENTE con error
8. **Robot:** Cierra sesión Selenium en `finally`
9. **Usuario:** Revisa error, corrige datos, cambia manualmente a `PROCESAR`

---

## 📊 Estados de OC y Transiciones

```
PENDIENTE → (manual) → PROCESAR → (robot claim) → EN_PROCESO
                                                        ↓
                                                   (éxito/error)
                                                        ↓
                                    PROCESADO ←──────┬──────→ PENDIENTE
                                                     │
                                               Si error vuelve
                                              a PENDIENTE para
                                              revisión manual
```

---

## 🔌 Dependencias Agregadas

### Backend
```json
{
  "@fastify/websocket": "^11.0.1"
}
```

**Instalación:**
```bash
pnpm add @fastify/websocket --filter @ppto/api
```

---

## 🧪 Testing

### 1. Test Manual - Robot con Error

**Setup:**
1. Crear OC de prueba con datos inválidos (ej: RUC inexistente)
2. Cambiar estado a `PROCESAR`

**Proceso:**
```bash
cd ultimus_robot_OCs_api
.\ejecutar_robot.bat
```

**Verificaciones:**
- ✅ Estado cambia a `EN_PROCESO` al reclamar
- ✅ Frontend muestra cambio instantáneo (sin refresh)
- ✅ Robot reporta error
- ✅ Estado vuelve a `PENDIENTE`
- ✅ Error visible en campo `comentario`
- ✅ Sesión Selenium se cierra correctamente

### 2. Test Manual - Robot con Éxito

**Setup:**
1. Crear OC de prueba con datos válidos
2. Cambiar estado a `PROCESAR`

**Verificaciones:**
- ✅ Estado cambia a `EN_PROCESO` al reclamar
- ✅ Robot procesa exitosamente
- ✅ Estado cambia a `PROCESADO`
- ✅ IDs de solicitud e incidente guardados
- ✅ Todos los usuarios ven cambios en tiempo real

### 3. Test Manual - Múltiples OCs en Cola

**Setup:**
1. Crear 3 OCs de prueba (2 válidas, 1 inválida)
2. Cambiar todas a `PROCESAR`

**Verificaciones:**
- ✅ Primera OC se procesa correctamente
- ✅ Segunda OC (con error) no afecta la tercera
- ✅ Tercera OC se procesa con sesión limpia
- ✅ Sesión Selenium se cierra después de cada OC

### 4. Test Manual - WebSocket Múltiples Usuarios

**Setup:**
1. Abrir aplicación en 2 navegadores diferentes
2. Usuario 1: Cambiar estado de OC manualmente

**Verificaciones:**
- ✅ Usuario 2 ve cambio instantáneo sin refrescar
- ✅ Notificación toast aparece
- ✅ Console muestra mensaje de WebSocket

---

## 📝 Archivos Modificados

### Base de Datos
- `packages/db/schema.prisma` - Nuevo estado EN_PROCESO
- `packages/db/migrations/20251217145414_add_en_proceso_status/` - Migración

### Backend
- `apps/api/src/index.ts` - Registro de WebSocket
- `apps/api/src/websocket.ts` - **NUEVO** - Módulo WebSocket
- `apps/api/src/rpa.ts` - Endpoints claim/complete mejorados + broadcasts
- `apps/api/src/oc.ts` - Broadcast en cambio manual de estado
- `apps/api/src/invoices.ts` - Broadcast en cambio de estado de factura
- `apps/api/package.json` - Dependencia @fastify/websocket

### Robot RPA
- `ultimus_robot_OCs_api/main.py` - Gestión de sesiones Selenium mejorada

### Frontend
- `apps/web/src/hooks/useWebSocket.ts` - **NUEVO** - Hook WebSocket
- `apps/web/src/components/OcStatusChip.tsx` - Estado EN_PROCESO agregado
- `apps/web/src/pages/purchase-orders/OcGestionPage.tsx` - WebSocket integrado
- `apps/web/src/pages/purchase-orders/OcListadoPage.tsx` - WebSocket integrado + estado EN_PROCESO
- `apps/web/src/pages/invoices/InvoiceGestionPage.tsx` - WebSocket integrado
- `apps/web/src/pages/invoices/InvoiceListadoPage.tsx` - WebSocket integrado

---

## 🚀 Despliegue en Producción

### 1. Base de Datos
```bash
cd packages/db
pnpm exec prisma migrate deploy
```

### 2. Backend
```bash
cd apps/api
pnpm install
pnpm run build
pm2 restart ppto-api
```

### 3. Frontend
```bash
cd apps/web
pnpm install
pnpm run build
# Actualizar servidor web (nginx/apache)
```

### 4. Robot (sin cambios en deployment)
- Los scripts `.bat` existentes siguen funcionando
- Sin cambios en Task Scheduler

---

## ⚠️ Notas Importantes

### Comportamiento de Estados en Error
- **CRÍTICO:** En error, OC vuelve a `PENDIENTE`, NO a `PROCESAR`
- **Razón:** Prevenir reprocesamiento automático infinito
- **Workflow:** Usuario debe revisar error y cambiar manualmente a `PROCESAR`

### WebSocket y CORS
- WebSocket usa mismo origen que API
- CORS ya configurado en `apps/api/src/index.ts`
- Funciona con `http://` y `https://`

### Compatibilidad
- ✅ Sin breaking changes
- ✅ Estados existentes funcionan igual
- ✅ Robot mantiene compatibilidad con OCs antiguas
- ✅ Frontend muestra todos los estados correctamente

---

## 📈 Beneficios Implementados

### 1. Robustez del Robot
- **Antes:** Error en una OC podía afectar todas las siguientes
- **Ahora:** Cada OC es independiente, sesión limpia por OC

### 2. Visibilidad en Tiempo Real
- **Antes:** Usuario debe refrescar página para ver cambios
- **Ahora:** Updates instantáneos vía WebSocket

### 3. Gestión de Errores
- **Antes:** Estado PROCESAR en error causaba reprocesamiento
- **Ahora:** Estado PENDIENTE requiere intervención manual

### 4. Transparencia
- **Antes:** No se sabía cuando robot estaba procesando
- **Ahora:** Estado EN_PROCESO visible en UI

### 5. Rastreabilidad
- **Antes:** Errores perdidos o difíciles de rastrear
- **Ahora:** Errores guardados en comentario + historial completo

---

## 🎓 Documentación Técnica Adicional

### WebSocket Protocol
- **URL:** `ws://localhost:3001/ws` (desarrollo)
- **URL:** `wss://api.domain.com/ws` (producción)
- **Formato Mensaje:**
  ```json
  {
    "type": "oc_status_change",
    "data": {
      "ocId": 123,
      "newStatus": "EN_PROCESO",
      "timestamp": "2024-12-17T15:30:00.000Z"
    }
  }
  ```

### Logs del Robot
El robot ahora muestra:
```
[TAREA] Procesando OC ID: 123
   [SELENIUM] Iniciando nueva sesión de navegador...
   [LOGIN] Iniciando sesión en Ultimus...
   ...
   [SUCCESS] OC 123 procesada exitosamente
   [SELENIUM] Cerrando sesión de navegador...
```

---

## ✅ Checklist de Validación Post-Despliegue

- [ ] Migración de BD aplicada correctamente
- [ ] Backend inicia sin errores
- [ ] WebSocket endpoint `/ws` responde
- [ ] Frontend muestra nuevo estado EN_PROCESO
- [ ] Robot puede reclamar OCs (estado → EN_PROCESO)
- [ ] Robot procesa OC exitosa (estado → PROCESADO)
- [ ] Robot maneja error correctamente (estado → PENDIENTE)
- [ ] Cambios de estado se reflejan en tiempo real
- [ ] Múltiples usuarios ven updates simultáneos
- [ ] Sesión Selenium se cierra en cada OC

---

## 👨‍💻 Desarrollado por

Sistema PPTO - Gestión Presupuestaria  
Fecha: Diciembre 17, 2024

**Cambios implementados sin romper funcionalidad existente.**
