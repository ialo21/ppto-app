# Resumen de Migración: Robot OCs (Google Sheets → API)

**Fecha**: 16 de diciembre de 2025  
**Objetivo**: Migrar el robot de automatización de OCs desde Google Sheets hacia integración directa con el Portal PPTO vía API REST.

---

## ✅ FASE 1 & 2: Backend Completado

### Archivos Creados/Modificados en Backend

#### 1. **`apps/api/src/rpa.ts`** (NUEVO)
Módulo de endpoints RPA con autenticación por API Key.

**Endpoints implementados:**

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/rpa/ocs/to-process` | GET | Lista OCs con estado `PROCESAR` |
| `/rpa/ocs/:id/claim` | POST | Reclama una OC (verificación atómica) |
| `/rpa/ocs/:id/complete` | POST | Registra resultado (éxito/error) |

**Middleware de seguridad:**
- `requireRpaKey`: Valida `Authorization: Bearer <token>`
- Token comparado con `process.env.RPA_API_KEY`
- Retorna 401 si falta o es inválido

#### 2. **`apps/api/src/index.ts:23`** (MODIFICADO)
```typescript
import { registerRpaRoutes } from "./rpa";
```

**Línea 129:**
```typescript
await registerRpaRoutes(app);
```

#### 3. **`apps/api/.env.example:26-29`** (MODIFICADO)
```ini
# RPA API Key (para autenticación del robot de automatización)
# Generar un token seguro aleatorio de al menos 32 caracteres
# Ejemplo: openssl rand -base64 32
RPA_API_KEY="your-secure-random-token-change-in-production"
```

### Lógica de Estados

**Estado durante procesamiento:**
- OC permanece en `PROCESAR` durante todo el proceso
- No se usa estado intermedio (el enum `OcStatus` no tiene `EN_PROCESO`)

**Resultado exitoso (`ok: true`):**
1. Actualiza `solicitudOc` y `incidenteOc` con IDs de Ultimus
2. Cambia estado a `PROCESADO`
3. Registra en `OCStatusHistory` con nota "Procesado por RPA"

**Resultado con error (`ok: false`):**
1. Mantiene estado `PROCESAR` para permitir reintento
2. Agrega mensaje de error al campo `comentario` con timestamp
3. Registra en `OCStatusHistory` el error

### Mapeo de Datos

**Conversión DB → Robot:**

| Campo DB | Campo Robot | Notas |
|----------|-------------|-------|
| `proveedor` | `Proveedor` | Directo |
| `ruc` | `Ruc` | Directo |
| `moneda` ("PEN"/"USD") | `Moneda` | Robot espera "Soles"/"Dólares Americanos" |
| `importeSinIgv` | `Importe sin IGV` | Convertido a string |
| `comentario` o `descripcion` | `Motivo` | Fallback |
| `articulo.code` | `Artículo` | Desde relación |
| `costCenters[0].code` | `Ceco` | Primer CECO de la relación M:N |

---

## ✅ FASE 3: Nuevo Robot Completado

### Estructura de Archivos

```
ultimus_robot_OCs_api/
├── modules/
│   ├── __init__.py                    # Módulo Python
│   ├── api_client.py                  # Cliente HTTP para el API
│   └── ultimus_web.py                 # Selenium (copiado del legacy)
├── main.py                            # Punto de entrada principal
├── config.py                          # Configuración (env vars)
├── requirements.txt                   # selenium, requests
├── .env.example                       # Plantilla de configuración
├── .gitignore                         # Excluye .env, logs, venv
├── instalar_dependencias.bat          # Setup inicial
├── ejecutar_robot.bat                 # Ejecución interactiva
├── ejecutar_robot_silencioso.bat      # Para Task Scheduler
└── README.md                          # Documentación completa
```

### Archivos Clave

#### `modules/api_client.py`
Cliente HTTP con 3 métodos principales:
- `list_to_process(limit)`: GET lista de OCs
- `claim_oc(oc_id)`: POST para reclamar OC
- `complete_oc(oc_id, ok, solicitud_oc, incidente_oc, error_message)`: POST resultado

#### `main.py`
Flujo principal:
1. Inicializa `PptoApiClient` y `UltimusBot`
2. Loop infinito con polling cada 5s
3. Por cada OC:
   - `claim_oc()` (verificación atómica)
   - Ejecuta flujo Selenium en Ultimus
   - `complete_oc()` con resultado

#### `config.py`
Variables desde entorno:
```python
PPTO_API_BASE_URL = os.getenv("PPTO_API_BASE_URL", "http://localhost:3001")
PPTO_RPA_API_KEY = os.getenv("PPTO_RPA_API_KEY", "")
ULTIMUS_USERNAME = os.getenv("ULTIMUS_USERNAME", "")
ULTIMUS_PASSWORD = os.getenv("ULTIMUS_PASSWORD", "")
```

### Cambios vs Robot Legacy

| Aspecto | Legacy | Nuevo (API) |
|---------|--------|-------------|
| Fuente de datos | Google Sheets | API REST |
| Autenticación | Service Account JSON | Bearer token (API Key) |
| Dependencias | `gspread`, `pandas`, `selenium` | `requests`, `selenium` |
| Estado intermedio | Actualiza "En Proceso" en Sheet | No aplica (mantiene PROCESAR) |
| Registro de IDs | `update_sheet_cell()` | `complete_oc(ok=true)` |
| Manejo de errores | Estado "Error" en Sheet | `complete_oc(ok=false)` |
| Secuencia/fecha | Asigna automáticamente | No aplica (ya en DB) |

---

## 🚀 Pasos para Poner en Producción

### 1. Backend (Servidor del Portal PPTO)

**Archivo: `apps/api/.env`**

Agregar variable:
```ini
RPA_API_KEY=LwQ0NV/fvTUzYUtYcmFqXLTKwGHLEWHJIFANii26jME=
```

> **Nota**: Generar token seguro con:
> ```powershell
> [Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))
> ```

**Reiniciar backend:**
```bash
cd apps/api
npm run build  # si es producción
pm2 restart ppto-api  # o el comando que uses
```

**Verificar:**
```powershell
$headers = @{ "Authorization" = "Bearer TU_TOKEN_AQUI" }
Invoke-RestMethod -Uri "http://localhost:3001/rpa/ocs/to-process?limit=1" -Headers $headers
```

### 2. Robot (Máquina Windows donde correrá)

**Navegar a la carpeta:**
```powershell
cd C:\programas\ppto-app\ultimus_robot_OCs_api
```

**Instalar dependencias:**
```batch
instalar_dependencias.bat
```

**Configurar variables:**
```batch
copy .env.example .env
notepad .env
```

**Contenido de `.env`:**
```ini
PPTO_API_BASE_URL=http://servidor-portal:3001
PPTO_RPA_API_KEY=LwQ0NV/fvTUzYUtYcmFqXLTKwGHLEWHJIFANii26jME=

ULTIMUS_USERNAME=usuario.robot
ULTIMUS_PASSWORD=password_seguro
```

**Probar ejecución manual:**
```batch
ejecutar_robot.bat
```

Si funciona correctamente, presiona Ctrl+C para detener.

### 3. Configurar Task Scheduler

**Opción A: Via PowerShell (recomendado)**

```powershell
$action = New-ScheduledTaskAction `
    -Execute "C:\programas\ppto-app\ultimus_robot_OCs_api\ejecutar_robot_silencioso.bat" `
    -WorkingDirectory "C:\programas\ppto-app\ultimus_robot_OCs_api"

$trigger = New-ScheduledTaskTrigger -AtStartup

$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
    -TaskName "Robot OCs Portal PPTO" `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings
```

**Opción B: Via Interfaz Gráfica**

1. Abrir **Programador de tareas** (taskschd.msc)
2. **Acción** → **Crear tarea**
3. **General**:
   - Nombre: `Robot OCs Portal PPTO`
   - Usuario: `SYSTEM`
   - ☑ Ejecutar aunque el usuario no haya iniciado sesión
   - ☑ Ejecutar con privilegios más altos
4. **Desencadenadores**:
   - Nuevo → **Al iniciar el sistema**
5. **Acciones**:
   - Programa: `C:\programas\ppto-app\ultimus_robot_OCs_api\ejecutar_robot_silencioso.bat`
   - Iniciar en: `C:\programas\ppto-app\ultimus_robot_OCs_api`
6. **Condiciones**:
   - ☐ Iniciar solo si el equipo usa CA (desmarcar)
7. **Configuración**:
   - Si la tarea ya se está ejecutando: **No iniciar una nueva instancia**
   - Si la tarea falla, reiniciar cada: **1 minuto** (máx 3 intentos)

**Iniciar la tarea:**
```powershell
Start-ScheduledTask -TaskName "Robot OCs Portal PPTO"
```

### 4. Verificación

**Ver logs en tiempo real:**
```powershell
Get-Content C:\programas\ppto-app\ultimus_robot_OCs_api\robot_ocs_api.log -Tail 50 -Wait
```

**Verificar estado de la tarea:**
```powershell
Get-ScheduledTask -TaskName "Robot OCs Portal PPTO" | Get-ScheduledTaskInfo
```

**Verificar en el Portal:**
- Ir al módulo de OCs
- Filtrar por estado `PROCESADO`
- Verificar que los campos `solicitudOc` e `incidenteOc` están llenos
- Ver historial de estados

---

## 🔧 Mantenimiento y Troubleshooting

### Logs

**Robot:**
- `ultimus_robot_OCs_api/robot_ocs_api.log`

**Backend:**
- Logs de Fastify (depende de tu configuración de PM2/systemd)

### Errores Comunes

#### "Token RPA inválido" (401)
**Causa**: Token en `.env` del robot no coincide con el del backend.

**Solución**: Verificar que ambos archivos tienen el mismo valor en `RPA_API_KEY`.

#### "OC no disponible para procesar" (409)
**Causa**: OC ya fue procesada o reclamada.

**Solución**: Normal, el robot continúa con la siguiente OC automáticamente.

#### "No se puede conectar al servidor Ultimus"
**Causa**: Ultimus caído o inaccesible.

**Solución**: Verificar conectividad, el robot reintentará en el siguiente barrido.

#### Robot no aparece en Task Scheduler
**Causa**: Falta de permisos o error en la creación.

**Solución**: Ejecutar PowerShell como Administrador.

### Rotación de API Key

1. Generar nuevo token
2. Actualizar en `apps/api/.env`
3. Actualizar en `ultimus_robot_OCs_api/.env`
4. Reiniciar backend y robot

### Detener el Robot

**Task Scheduler:**
```powershell
Stop-ScheduledTask -TaskName "Robot OCs Portal PPTO"
```

**Proceso manual:**
- Si está en modo interactivo: Ctrl+C
- Si está en Task Scheduler: detener la tarea

---

## 📊 Comparativa de Arquitecturas

### Antes (Google Sheets)

```
[Usuario Portal] → [DB] → [Google Sheets] ← [Robot] → [Ultimus]
                            ↑ (Apps Script)
```

**Problemas:**
- Dependencia de Google Sheets como "cola de mensajes"
- Doble fuente de verdad (DB + Sheets)
- Sincronización manual o por scripts
- Límites de API de Google

### Ahora (API Direct)

```
[Usuario Portal] → [DB] ← [Backend API] ← [Robot] → [Ultimus]
```

**Ventajas:**
- Una sola fuente de verdad (DB)
- Transacciones atómicas (claim)
- Sin límites de API externos
- Historial completo en DB
- Menos dependencias

---

## 📚 Referencias

### Archivos de Configuración

- Backend: `apps/api/.env`
- Robot: `ultimus_robot_OCs_api/.env`

### Endpoints API

- Lista: `GET /rpa/ocs/to-process?limit=10`
- Claim: `POST /rpa/ocs/:id/claim`
- Complete: `POST /rpa/ocs/:id/complete`

### Documentación Completa

- Robot: `ultimus_robot_OCs_api/README.md`
- Código legacy: `ultimus_robot_OCs/` (mantener como referencia)

---

## ⚠️ Notas Importantes

1. **NO borrar el robot legacy** (`ultimus_robot_OCs/`) hasta confirmar que el nuevo funciona 100%
2. **Probar primero en desarrollo** antes de producción
3. **API Key debe ser secreta** - no commitear `.env` en Git
4. **Backup de la base de datos** antes de poner en producción
5. **Monitorear logs** durante las primeras 24-48 horas

---

## ✅ Checklist Final

### Backend
- [ ] `RPA_API_KEY` agregada en `apps/api/.env`
- [ ] Backend reiniciado
- [ ] Endpoint `/rpa/ocs/to-process` responde correctamente
- [ ] Token de autenticación funciona (prueba con curl/Postman)

### Robot
- [ ] Carpeta `ultimus_robot_OCs_api` copiada a máquina de ejecución
- [ ] Dependencias instaladas (`instalar_dependencias.bat`)
- [ ] Archivo `.env` configurado correctamente
- [ ] Variables `PPTO_API_BASE_URL` y `PPTO_RPA_API_KEY` correctas
- [ ] Credenciales de Ultimus configuradas
- [ ] Ejecución manual exitosa (`ejecutar_robot.bat`)

### Task Scheduler
- [ ] Tarea creada con nombre "Robot OCs Portal PPTO"
- [ ] Configurada para ejecutar al iniciar sistema
- [ ] Usuario: SYSTEM con privilegios altos
- [ ] Tarea iniciada manualmente
- [ ] Logs generándose correctamente

### Verificación Final
- [ ] OCs con estado `PROCESAR` siendo procesadas
- [ ] Estado cambia a `PROCESADO` después de éxito
- [ ] Campos `solicitudOc` e `incidenteOc` se llenan
- [ ] Historial de estados registrándose correctamente
- [ ] Logs sin errores críticos
- [ ] Monitoreo activo durante primeras 24h

---

**Fin del Documento de Migración**
