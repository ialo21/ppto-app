# Fix: Corrección de Fórmulas en Modo Contable - Resultado Contable y Variación vs PPTO

**Fecha**: 27 de noviembre de 2025  
**Archivos modificados**:
- `apps/web/src/pages/ReportsPage.tsx` (Frontend)

---

## 🐛 Problema Identificado

### Síntoma
En la tabla del reporte contable, las columnas "Resultado Contable" y "Variación vs PPTO" mostraban valores incorrectos:

- **Resultado Contable**: La fórmula estaba correcta
- **Variación vs PPTO**: El signo estaba invertido, mostrando ahorro como negativo y sobregasto como positivo

### Ejemplo del Problema

Para 2025-10:
- PPTO: 100,000
- Ejecutado: 0
- Provisiones: 74,062.50
- Resultado Contable: 74,062.50 ✅ (correcto)
- **Variación (ANTIGUA)**: -25,937.50 ❌ (mostraba ahorro como negativo)
- **Variación (NUEVA)**: 25,937.50 ✅ (ahorro es positivo)

---

## ✅ Solución Implementada

### Reglas de Negocio Definitivas

#### 1. Resultado Contable
```typescript
Resultado Contable = Ejecutado Contable + Provisiones
```

**Explicación**:
- Ejecutado Contable: Suma de facturas con mes contable igual al mes del grupo
- Provisiones: Suma de provisiones del mismo mes contable (positivas = provisión, negativas = liberación)

#### 2. Variación vs PPTO
```typescript
Variación vs PPTO = PPTO Asociado - Resultado Contable
```

**Explicación**:
- Si **Resultado Contable < PPTO** → hay ahorro → **variación positiva** (verde)
- Si **Resultado Contable > PPTO** → hay sobregasto → **variación negativa** (rojo)

---

## 📝 Cambios en el Código

### Archivo: `apps/web/src/pages/ReportsPage.tsx`

#### Cambio 1: Fórmula de Variación (Líneas 291-297)

**ANTES**:
```typescript
const resultadoContable = data.ejecutadoContable + data.provisiones;
const variacionAbs = resultadoContable - data.pptoAsociado; // ❌ INCORRECTO
const variacionPct = data.pptoAsociado > 0 ? (variacionAbs / data.pptoAsociado) * 100 : 0;
```

**DESPUÉS**:
```typescript
const resultadoContable = data.ejecutadoContable + data.provisiones;
// ⚠️ REGLA DE NEGOCIO CRÍTICA:
// Variación = PPTO - Resultado Contable
// Si Resultado < PPTO → ahorro → variación positiva
// Si Resultado > PPTO → sobregasto → variación negativa
const variacionAbs = data.pptoAsociado - resultadoContable; // ✅ CORRECTO
const variacionPct = data.pptoAsociado > 0 ? (variacionAbs / data.pptoAsociado) * 100 : 0;
```

#### Cambio 2: Colores de Variación en Filas (Línea 819)

**ANTES**:
```typescript
<Td className={`text-right ${row.variacionAbs >= 0 ? 'text-red-600' : 'text-green-600'}`}>
  {currency} {formatNumber(row.variacionAbs)}
</Td>
```

**DESPUÉS**:
```typescript
<Td className={`text-right ${row.variacionAbs >= 0 ? 'text-green-600' : 'text-red-600'}`}>
  {currency} {formatNumber(row.variacionAbs)}
</Td>
```

**Explicación**: Con la nueva fórmula, variación positiva = ahorro (verde), variación negativa = sobregasto (rojo)

#### Cambio 3: Colores de Variación en Totales (Línea 922)

**ANTES**:
```typescript
<Td className={`text-right ${totals.variacionAbs >= 0 ? 'text-red-600' : 'text-green-600'}`}>
  {currency} {formatNumber(totals.variacionAbs)}
</Td>
```

**DESPUÉS**:
```typescript
<Td className={`text-right ${totals.variacionAbs >= 0 ? 'text-green-600' : 'text-red-600'}`}>
  {currency} {formatNumber(totals.variacionAbs)}
</Td>
```

---

## 🧪 Casos de Validación

### Caso 1: 2025-10 (Solo Provisiones)
```
PPTO Asociado:       100,000.00
Ejecutado Contable:        0.00
Provisiones:          74,062.50
─────────────────────────────────
Resultado Contable:   74,062.50  ✅ (0 + 74,062.50)
Variación vs PPTO:    25,937.50  ✅ (100,000 - 74,062.50) → Ahorro (Verde)
```

### Caso 2: 2025-11 (Ejecutado + Provisiones)
```
PPTO Asociado:       500,000.00
Ejecutado Contable:  455,555.10
Provisiones:          10,000.00
─────────────────────────────────
Resultado Contable:  465,555.10  ✅ (455,555.10 + 10,000)
Variación vs PPTO:    34,444.90  ✅ (500,000 - 465,555.10) → Ahorro (Verde)
```

### Caso 3: Sobregasto
```
PPTO Asociado:       100,000.00
Ejecutado Contable:  120,000.00
Provisiones:           5,000.00
─────────────────────────────────
Resultado Contable:  125,000.00  ✅ (120,000 + 5,000)
Variación vs PPTO:   -25,000.00  ✅ (100,000 - 125,000) → Sobregasto (Rojo)
```

---

## 📊 Impacto en Totales

Los totales se calculan sumando los valores de cada fila, por lo que heredan automáticamente la lógica corregida:

```typescript
const totals = useMemo(() => {
  return filteredData.reduce((acc, row) => ({
    ppto: acc.ppto + Number(row.ppto || 0),
    ejecutadoContable: acc.ejecutadoContable + Number(row.ejecutadoContable || 0),
    provisiones: acc.provisiones + Number(row.provisiones || 0),
    resultadoContable: acc.resultadoContable + Number(row.resultadoContable || 0),
    variacionAbs: acc.variacionAbs + Number(row.variacionAbs || 0), // ✅ Ya corregido
    // ...
  }), { /* valores iniciales */ });
}, [filteredData]);
```

---

## 🎨 Semántica Visual (Colores)

### Provisiones
```typescript
${Number(row.provisiones || 0) >= 0 ? 'text-red-600' : 'text-green-600'}
```
- **Positivo (rojo)**: Provisión → compromiso de gasto
- **Negativo (verde)**: Liberación → disponibilidad recuperada

### Variación vs PPTO
```typescript
${row.variacionAbs >= 0 ? 'text-green-600' : 'text-red-600'}
```
- **Positivo (verde)**: Ahorro → queda presupuesto
- **Negativo (rojo)**: Sobregasto → se excedió el presupuesto

---

## ✅ Checklist de Validación

- [x] Fórmula de Resultado Contable: `Ejecutado + Provisiones`
- [x] Fórmula de Variación: `PPTO - Resultado Contable`
- [x] Colores en filas individuales corregidos
- [x] Colores en fila de totales corregidos
- [x] Validación con caso 2025-10 (solo provisiones)
- [x] Validación con caso 2025-11 (ejecutado + provisiones)
- [x] Documentación actualizada

---

## 🔍 Archivos No Modificados

Los siguientes componentes **NO** requieren cambios porque solo calculan datos base, no fórmulas derivadas:

- ✅ `apps/web/src/utils/reportsCalculations.ts` → Solo calcula `ejecutadoContable` y `provisiones`
- ✅ `apps/api/src/reports.ts` → Endpoints no afectados (modo presupuestal)

---

## 📚 Referencias

- **Manual de Usuario**: Ver sección "Reportes > Modo Contable"
- **Reglas de Negocio**: Ver `REPORTS_MODULE_REFACTOR.md`
- **Modelo de Datos**: Ver `INVOICE_ACCOUNTING_LAYER_COMPLETE.md`

---

## 🚀 Próximos Pasos

1. ✅ **Testing**: Validar con datos reales de 2025-10 y 2025-11
2. ✅ **UX**: Confirmar que los colores se muestran correctamente
3. ⏳ **Exportación CSV**: Verificar que el CSV use las fórmulas corregidas
4. ⏳ **Modo Mixto**: Revisar si necesita ajustes similares

---

**Estado**: ✅ Completado  
**Autor**: Claude (Senior Frontend Engineer)  
**Revisado**: Pendiente
