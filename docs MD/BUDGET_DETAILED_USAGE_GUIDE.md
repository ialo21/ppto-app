# Guía de Uso: PPTO Detallado por Mes

> **⚠️ GUÍA ACTUALIZADA (11/11/2025)**
> 
> Esta guía describe la funcionalidad con rutas actualizadas.
> 
> **Cambios desde versión inicial:**
> - Ruta actualizada: `/ppto` (antes `/budget/detailed`)
> - Menú: una sola entrada "PPTO" (eliminado "PPTO Detallado")
> - Selector de Año: ahora dinámico desde DB (sin hardcode)
> - Selector de Período: filtrado automático por año
> - Mejores mensajes cuando no hay datos
>
> La funcionalidad core sigue siendo la misma.

## Inicio Rápido

### 1. Reiniciar el Servidor (Importante)

Después de aplicar la migración, es necesario reiniciar ambos servidores para que Prisma Client se regenere con el nuevo schema:

```bash
# Detener los servidores actuales (Ctrl+C en cada terminal)

# Iniciar de nuevo
pnpm dev
```

### 2. Acceder a la Nueva Vista

1. Abrir el navegador en `http://localhost:5173` (o el puerto configurado)
2. En el menú lateral, hacer clic en **"PPTO"**
3. La ruta será: `http://localhost:5173/ppto`

## Flujo de Trabajo Típico

### Paso 1: Seleccionar Año y Período

1. **Año**: Seleccionar del dropdown (ej: 2026)
2. **Período**: Aparecerán solo los meses disponibles para ese año
3. Seleccionar el mes deseado (ej: "2026-01 ene26")

### Paso 2: Revisar Estado del Período

- Si el período está **cerrado**, aparecerá un badge rojo "Cerrado"
- Los inputs estarán deshabilitados y no se podrá editar
- Para editar, primero debe abrirse el período desde su módulo correspondiente

### Paso 3: Buscar (Opcional)

- Usar el campo "Buscar" para filtrar por:
  - Nombre o código de Sustento
  - Código o nombre de CECO
- La búsqueda filtra en tiempo real

### Paso 4: Editar Montos

1. **Hacer clic** en el campo de monto a editar
2. **Ingresar** el nuevo valor (ejemplos válidos):
   - `1000` → 1000.00
   - `1500.50` → 1500.50
   - `0` → 0.00 (válido)
   - ` ` (vacío) → se interpreta como 0.00

3. **Validaciones automáticas**:
   - ✅ Solo números positivos o cero
   - ✅ Máximo 2 decimales
   - ❌ Negativos: "No puede ser negativo"
   - ❌ Texto: "Debe ser un número válido"
   - ❌ Muchos decimales: "Máximo 2 decimales"

4. **Indicadores visuales**:
   - Fila con **fondo amarillo claro** = tiene cambios sin guardar
   - Borde **rojo** en input = error de validación
   - Mensaje de error **debajo del input** = descripción del problema

### Paso 5: Guardar Cambios

1. **Botón "Guardar cambios"** se habilita solo si:
   - Hay al menos un cambio válido
   - No hay errores de validación
   - El período no está cerrado

2. Al hacer clic en **"Guardar cambios"**:
   - Se muestra "Guardando..." en el botón
   - Se envía el batch completo en una transacción
   - Aparece un **toast verde** si fue exitoso
   - Aparece un **toast rojo** si hubo error
   - La tabla se recarga con los datos actualizados

3. **Descartar cambios** (opcional):
   - Clic en "Descartar cambios" para revertir sin guardar

## Características Especiales

### Totales en Tiempo Real

El footer de la tabla muestra:
- **Total general** del período (suma de todos los montos)
- Se actualiza automáticamente mientras editas
- Formato: separador de miles y 2 decimales (ej: `1,234,567.89`)

### Advertencias de Sustentos sin CECOs

Si hay sustentos sin centros de costo asociados:
- Aparece un **panel amarillo** de advertencia arriba de la tabla
- Lista los primeros 5 sustentos afectados
- Estos sustentos **NO** aparecen en la tabla detallada
- **Solución**: Ir a Catálogos → Sustentos y asociar CECOs

### Gerencia y Área (Opcional)

Si los sustentos tienen gerencia/área asignadas:
- Aparecen como columnas adicionales en la tabla
- Útil para filtrado y análisis

## Casos de Uso Comunes

### 1. Asignar PPTO Inicial del Mes

```
Escenario: Enero 2026, asignar presupuesto a todos los sustentos-cecos

1. Seleccionar: Año 2026, Período 2026-01
2. La tabla muestra todos los pares (sustento, ceco) con monto 0.00
3. Editar los montos según el plan
4. Guardar cambios
```

### 2. Ajustar PPTO de un Sustento Específico

```
Escenario: Incrementar presupuesto de "Licencias Microsoft"

1. Seleccionar el año y período
2. Buscar: "Microsoft"
3. Editar solo las filas que necesitas ajustar
4. Guardar cambios
```

### 3. Revisar PPTO de un CECO

```
Escenario: Ver todo el presupuesto del CECO "C001"

1. Seleccionar el año y período
2. Buscar: "C001"
3. Revisar todos los sustentos asociados a ese CECO
4. Editar si es necesario
```

### 4. Corregir Errores de Captura

```
Escenario: Corregir montos mal ingresados

1. Seleccionar el año y período
2. Ubicar las filas a corregir
3. Editar los valores correctos
4. Guardar cambios (solo se actualizan las modificadas)
```

## Características de la Vista Unificada

| Característica | Descripción |
|----------------|-------------|
| **Ruta** | `/ppto` |
| **Granularidad** | Por Sustento-CECO (detallada) |
| **Selector de Año** | Dinámico desde DB |
| **Selector de Período** | Filtrado por año seleccionado |
| **Búsqueda** | Sí, por sustento o CECO |
| **Advertencias** | Sí, sustentos sin CECOs |
| **Totales** | Detallado en footer con formato de miles |
| **Empty States** | Mensajes contextuales en cada caso |
| **Validaciones** | En tiempo real con feedback inline |

**Nota**: La vista anterior simple (`/budget` con `costCenterId = null`) ya no está disponible en la UI, pero los endpoints del backend siguen soportándola para compatibilidad.

## Troubleshooting

### "No hay datos para mostrar"

**Causas posibles**:
1. No hay sustentos con CECOs asociados → Ir a Catálogos y asociar
2. Búsqueda muy restrictiva → Limpiar el campo de búsqueda
3. Período sin asignaciones → Comenzar a editar y guardar

### "El período está cerrado y no puede ser modificado"

**Solución**: 
- El período tiene un cierre contable aplicado
- Contactar al responsable para abrir el período si es necesario

### "Algunos centros de costo no existen"

**Causa**: Error interno (no debería ocurrir en uso normal)
**Solución**: Reportar el bug con los detalles

### Cambios no se reflejan después de guardar

**Solución**:
1. Verificar que apareció el toast de éxito
2. Actualizar la página (F5)
3. Si persiste, verificar la consola del navegador

## API para Integraciones

### GET /budgets/detailed

```http
GET /api/budgets/detailed?periodId=123&search=marketing
```

**Response**:
```json
{
  "versionId": 1,
  "periodId": 123,
  "period": {
    "year": 2026,
    "month": 1,
    "label": "ene26"
  },
  "isClosed": false,
  "rows": [
    {
      "supportId": 1,
      "supportCode": "SUP001",
      "supportName": "Licencias Marketing",
      "costCenterId": 5,
      "costCenterCode": "C001",
      "costCenterName": "Marketing",
      "amountPen": 1500.00,
      "management": "Gerencia Comercial",
      "area": "Marketing Digital"
    }
  ],
  "supportsWithoutCostCenters": []
}
```

### PUT /budgets/detailed/batch

```http
PUT /api/budgets/detailed/batch
Content-Type: application/json

{
  "periodId": 123,
  "items": [
    {
      "supportId": 1,
      "costCenterId": 5,
      "amountPen": 2000.00
    },
    {
      "supportId": 2,
      "costCenterId": 5,
      "amountPen": 1500.50
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "count": 2,
  "rows": [...]
}
```

## Próximos Pasos (Roadmap)

1. **Carga masiva CSV**: Importar presupuesto anual completo
2. **Exportar a Excel**: Descargar tabla para análisis offline
3. **Historial de cambios**: Ver quién modificó qué y cuándo
4. **Comparación de períodos**: Ver variaciones mes a mes
5. **Aprobaciones**: Flujo de aprobación antes de guardar cambios grandes

## Soporte

Para preguntas o reportar problemas, contactar al equipo de desarrollo con:
- Captura de pantalla del error
- Año y período afectado
- Pasos para reproducir el problema

