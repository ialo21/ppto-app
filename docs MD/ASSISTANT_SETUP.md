# Configuración del Asistente con Gemini 2.5 Flash

## Requisitos

Para que el asistente funcione correctamente, necesitas configurar la API Key de Google Gemini.

## Pasos de Configuración

### 1. Obtener API Key de Google Gemini

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Crea una nueva API Key
4. Copia la clave generada

### 2. Configurar Variable de Entorno

Agrega la siguiente variable de entorno al backend:

**Opción A: Archivo .env en `apps/api/`**

Crea o edita el archivo `apps/api/.env`:

```env
GEMINI_API_KEY=tu_api_key_aqui
```

**Opción B: Variable de entorno del sistema**

En Windows PowerShell:
```powershell
$env:GEMINI_API_KEY="tu_api_key_aqui"
```

En Linux/Mac:
```bash
export GEMINI_API_KEY="tu_api_key_aqui"
```

### 3. Reiniciar el Servidor

Después de configurar la API Key, reinicia el servidor backend:

```bash
pnpm -C apps/api dev
```

## Verificación

Para verificar que el asistente está configurado correctamente:

1. Inicia el backend
2. Visita: http://localhost:3001/assistant/health
3. Deberías ver: `{"ok": true, "geminiConfigured": true, "message": "Servicio del asistente operativo"}`

Si la API Key no está configurada, verás:
`{"ok": false, "geminiConfigured": false, "message": "API Key de Gemini no configurada"}`

## Uso del Asistente

### Acceso
- URL: http://localhost:5173/assistant
- Ubicación en el sidebar: Debajo de "Dashboard"

### Ejemplos de Consultas

1. **Consulta básica de presupuesto:**
   - "¿Cuánto presupuesto hay para la línea SEGURIDAD en 2025?"
   - "Dame el presupuesto total de Infraestructura para 2024"

2. **Detalle mensual:**
   - "¿Qué meses de 2025 tienen presupuesto para Marketing?"
   - "Dame el detalle mensual de la línea Cloud Services en 2025"

3. **Consultas sin datos completos:**
   - "¿Cuánto presupuesto hay para SEGURIDAD?" → El asistente pedirá el año
   - "Dame el presupuesto de 2025" → El asistente pedirá la línea de sustento

### Notas Importantes

- **Datos reales:** El asistente solo responde con datos reales de la base de datos, no inventa información
- **Líneas de sustento:** Se pueden buscar por nombre o código (case-insensitive)
- **Años válidos:** Solo años que tienen períodos registrados en la BD
- **Historial:** La conversación mantiene contexto de los últimos 10 mensajes

## Arquitectura

### Backend
- **Endpoint:** `POST /api/assistant`
- **Cliente Gemini:** `apps/api/src/gemini-client.ts`
- **Lógica de negocio:** `apps/api/src/assistant.ts`
- **Modelo:** Gemini 2.5 Flash

### Frontend
- **Componente:** `apps/web/src/pages/AssistantPage.tsx`
- **Ruta:** `/assistant`

### Flujo de Consulta

1. Usuario envía mensaje
2. Backend parsea la intención con Gemini
3. Si necesita datos, consulta BD de PPTO
4. Construye prompt con datos reales
5. Gemini genera respuesta en lenguaje natural
6. Respuesta se muestra al usuario

## Limitaciones Actuales

- Solo consultas de presupuesto por línea de sustento y año
- No persiste conversaciones en BD (solo en memoria del navegador)
- Límite de 10 mensajes de historial por consulta

## Próximas Mejoras Posibles

- Comparativos entre años
- Consultas de ejecución vs presupuesto
- Integración con facturas y provisiones
- Exportar conversaciones
- Guardar historial en BD
- Análisis de tendencias
- Alertas y recomendaciones

## Troubleshooting

### "API Key no configurada"
- Verifica que la variable `GEMINI_API_KEY` esté correctamente configurada
- Reinicia el servidor después de agregar la variable

### "Error al consultar el asistente"
- Revisa los logs del backend para más detalles
- Verifica que la API Key sea válida
- Verifica conectividad a internet

### "No se encontró la línea de sustento"
- Verifica el nombre exacto en la BD (tabla `Support`)
- Intenta con variaciones del nombre o el código

### Límite de tasa (Rate Limit)
- Gemini tiene límites de consultas por minuto
- Espera unos momentos antes de reintentar
- Considera actualizar tu plan en Google AI Studio

## Seguridad

⚠️ **IMPORTANTE:**
- La API Key de Gemini NUNCA debe exponerse al frontend
- No commitear archivos `.env` al repositorio
- Agregar `.env` al `.gitignore`
- En producción, usar variables de entorno del servidor
