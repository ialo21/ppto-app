# 🚀 Quick Start - PPTO Unificado

## Cambios Recientes

✅ **Página PPTO unificada** - Una sola entrada de menú y ruta
✅ **Año dinámico** - Desde base de datos, sin hardcode
✅ **Períodos filtrados** - Por año seleccionado
✅ **Empty states** - Mensajes claros cuando no hay datos

## Acceso Rápido

### URL
```
http://localhost:5173/ppto
```

### Menú
- Dashboard
- **PPTO** ← Una sola entrada
- Lineas
- Órdenes de Compra
- Facturas
- Reportes
- Catálogos

## Flujo de Uso

1. **Seleccionar Año**
   - Dropdown muestra años disponibles en DB
   - Ordenados descendente (más reciente primero)
   - Auto-selecciona el más reciente

2. **Seleccionar Período (Mes)**
   - Muestra solo meses del año seleccionado
   - Formato: `YYYY-MM label` (ej: "2026-01 ene26")
   - Badge "Cerrado" si el período está cerrado

3. **Buscar (Opcional)**
   - Filtrar por nombre o código de Sustento
   - Filtrar por código de CECO
   - Búsqueda case-insensitive

4. **Editar Montos**
   - Click en celda de monto
   - Ingresar valor (>=0, max 2 decimales)
   - Validación en tiempo real
   - Fondo amarillo = cambios sin guardar

5. **Guardar**
   - Botón se habilita solo con cambios válidos
   - Guardado en batch con transacción
   - Toast de confirmación

## Empty States

### Sin Períodos Configurados
```
┌─────────────────────────────────────┐
│  No hay períodos configurados       │
│                                     │
│  Para comenzar a gestionar...      │
│                                     │
│  [Ir a gestión de períodos]        │
│  (Funcionalidad pendiente)         │
└─────────────────────────────────────┘
```

### Sin Períodos para el Año
```
No hay períodos configurados para el año 2026
TODO: Agregar enlace a gestión de períodos
```

### Sin Datos en Período
```
No hay datos para mostrar.
Verifique que los sustentos tengan CECOs asociados.
```

## Validaciones

| Validación | Mensaje de Error |
|------------|------------------|
| Número negativo | "No puede ser negativo" |
| Texto inválido | "Debe ser un número válido" |
| Más de 2 decimales | "Máximo 2 decimales" |

## API Endpoints

### GET `/periods/years`
Retorna años únicos disponibles:
```json
[
  { "year": 2026 },
  { "year": 2025 }
]
```

### GET `/budgets/detailed`
Query: `?periodId=123&search=marketing`

Retorna combinaciones (sustento, ceco) con montos:
```json
{
  "versionId": 1,
  "periodId": 123,
  "period": { "year": 2026, "month": 1, "label": "ene26" },
  "isClosed": false,
  "rows": [...],
  "supportsWithoutCostCenters": [...]
}
```

### PUT `/budgets/detailed/batch`
Guarda cambios en lote:
```json
{
  "periodId": 123,
  "items": [
    { "supportId": 1, "costCenterId": 5, "amountPen": 2000.00 },
    { "supportId": 2, "costCenterId": 5, "amountPen": 1500.50 }
  ]
}
```

## TODOs Identificados

### En la UI
1. Link a gestión de períodos (cuando exista)
2. Página de gestión de períodos (CRUD completo)

### Funcionalidades Futuras
- Carga masiva CSV
- Exportar a Excel
- Historial de cambios
- Comparación entre períodos
- Flujo de aprobaciones

## Archivos Clave

### Frontend
- `apps/web/src/pages/BudgetPage.tsx` - Página principal unificada
- `apps/web/src/main.tsx` - Rutas y navegación

### Backend
- `apps/api/src/index.ts` - Endpoint `/periods/years`
- `apps/api/src/budgets-detailed.ts` - Endpoints de presupuesto detallado
- `apps/api/src/budgets.ts` - Endpoints legacy (compatibilidad)

### Base de Datos
- `packages/db/schema.prisma` - Schema con `costCenterId`
- `packages/db/migrations/20251111122812_*` - Migración aplicada

## Troubleshooting

### Error: "No se puede acceder a /ppto"
**Solución**: Reiniciar servidor de desarrollo
```bash
pnpm dev
```

### Error: "No aparecen años en el selector"
**Causa**: No hay períodos en la tabla `Period`
**Solución**: Crear períodos desde seed o manualmente

### Botón Guardar siempre deshabilitado
**Verificar**:
1. ¿Hay cambios en las celdas?
2. ¿Los valores son válidos? (>=0, 2 decimales)
3. ¿El período está cerrado? (badge rojo)

### Tabla vacía después de seleccionar período
**Causas posibles**:
1. Sustentos no tienen CECOs asociados
2. Búsqueda muy restrictiva
3. No hay datos para ese período

**Solución**: Verificar advertencias amarillas arriba de la tabla

## Verificación Rápida

```bash
# 1. Backend funciona
curl http://localhost:3001/periods/years

# 2. Frontend accesible
# Abrir: http://localhost:5173/ppto

# 3. Sin errores de linting
pnpm -C apps/web run lint
```

## Documentación Relacionada

- `PPTO_UNIFICATION_SUMMARY.md` - Resumen completo de la unificación
- `BUDGET_DETAILED_USAGE_GUIDE.md` - Guía detallada de uso
- `BUDGET_DETAILED_IMPLEMENTATION.md` - Detalles técnicos de implementación

---

**Última actualización**: 11/11/2025
**Versión**: 2.0 (Unificada)

