# 🎨 Sistema de Diseño - Guía de Colores Interseguro

**Última actualización**: 27 de noviembre de 2025  
**Manual de Marca**: Versión corporativa actualizada

---

## 📋 Tabla de Contenidos

1. [Nueva Nomenclatura Semántica](#nueva-nomenclatura-semántica)
2. [Colores de Marca](#colores-de-marca)
3. [Colores Estructurales](#colores-estructurales)
4. [Estados y Feedback](#estados-y-feedback)
5. [Tablas y Visualizaciones](#tablas-y-visualizaciones)
6. [Monedas y Compañías](#monedas-y-compañías)
7. [Guía de Migración](#guía-de-migración)
8. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Nueva Nomenclatura Semántica

Se ha reorganizado la paleta de colores usando una estructura jerárquica más limpia:

```typescript
brand: {
  // Colores principales de marca
  primary, action, hover,
  background, surface,
  border, border-light,
  text-primary, text-secondary, text-disabled
}

status: { success, warning, error }
chart: { axis, average }
table: { header, row, total }
currency: { usd, pen }
company: { interseguro, crecer, ... }
```

---

## Colores de Marca

### 🔵 Primario (Interseguro)

```css
/* Hex: #71B3FF */
bg-brand-primary
text-brand-primary
border-brand-primary
```

**Uso:**
- Botones principales de navegación
- Enlaces importantes
- Indicadores de marca (logos, headers)
- Gráficos de Interseguro

**Ejemplo:**
```tsx
<button className="bg-brand-primary text-white hover:bg-brand-hover">
  Ver Detalles
</button>
```

---

### 💗 Acción (Botones CTA)

```css
/* Hex: #FF429B */
bg-brand-action
text-brand-action
border-brand-action
```

**Uso:**
- Botones de acción principales (Guardar, Crear, Enviar)
- Call-to-actions destacados
- Estados activos de importancia

**Ejemplo:**
```tsx
<button className="bg-brand-action text-white px-6 py-2 rounded-xl hover:bg-brand-hover">
  Guardar Cambios
</button>
```

---

### 🎯 Hover/Active

```css
/* Hex: #E6398B */
bg-brand-hover
hover:bg-brand-hover
```

**Uso:**
- Estados hover de botones primarios y de acción
- Estados activos de navegación
- Feedback visual de interacción

---

## Colores Estructurales

### 📄 Fondos

#### Background Dashboard (Principal)
```css
/* Hex: #F2F4F4 */
bg-brand-background
```

**Uso:**
- Fondo principal de la aplicación (body)
- Áreas de contenido general

**Implementación actual:**
```css
body {
  @apply bg-brand-background text-brand-text-primary;
}
```

#### Surface (Cards)
```css
/* Hex: #FFFFFF */
bg-brand-surface
```

**Uso:**
- Cards y tarjetas
- Modales y diálogos
- Paneles elevados

**Ejemplo:**
```tsx
<Card className="bg-brand-surface shadow-soft rounded-2xl">
  <CardContent>
    {/* Contenido */}
  </CardContent>
</Card>
```

---

### 📐 Bordes

#### Borde Principal
```css
/* Hex: #CFDFEA */
border-brand-border
```

**Uso:**
- Bordes de cards y contenedores
- Separadores de secciones
- Inputs y forms

#### Borde Claro (Opcional)
```css
/* Hex: #E6EDF0 */
border-brand-border-light
```

**Uso:**
- Headers de tablas
- Separadores sutiles
- Divisores internos

**Ejemplo:**
```tsx
<div className="border border-brand-border rounded-xl p-4">
  {/* Contenido con borde */}
</div>
```

---

### ✍️ Textos

#### Texto Principal
```css
/* Hex: #4C6176 */
text-brand-text-primary
```

**Uso:**
- Contenido principal
- Párrafos y textos importantes
- Labels de formularios

#### Texto Secundario
```css
/* Hex: #8A96A2 */
text-brand-text-secondary
```

**Uso:**
- Descripciones y ayudas
- Textos de filtros y controles
- Metadatos (fechas, autores)

#### Texto Deshabilitado
```css
/* Hex: #A1ACB5 */
text-brand-text-disabled
```

**Uso:**
- Elementos deshabilitados
- Placeholders
- Textos inactivos

**Ejemplo:**
```tsx
<div>
  <h2 className="text-brand-text-primary font-semibold">Título</h2>
  <p className="text-brand-text-secondary text-sm">Descripción adicional</p>
</div>
```

---

## Estados y Feedback

### ✅ Success (Verde)
```css
/* Hex: #31D785 */
bg-status-success
text-status-success
border-status-success
```

**Uso:**
- Mensajes de éxito
- Indicadores positivos
- Badges de estado "Completado"

### ⚠️ Warning (Amarillo)
```css
/* Hex: #FDCE5F */
bg-status-warning
text-status-warning
```

**Uso:**
- Advertencias no críticas
- Alertas informativas
- Estados "Pendiente"

### 🚫 Error (Rojo)
```css
/* Hex: #F94666 */
bg-status-error
text-status-error
border-status-error
```

**Uso:**
- Mensajes de error
- Validaciones fallidas
- Estados "Rechazado"

**Ejemplo:**
```tsx
{status === 'success' && (
  <span className="bg-status-success/10 text-status-success px-3 py-1 rounded-full text-xs">
    ✓ Aprobado
  </span>
)}

{status === 'error' && (
  <span className="bg-status-error/10 text-status-error px-3 py-1 rounded-full text-xs">
    ✗ Rechazado
  </span>
)}
```

---

## Tablas y Visualizaciones

### 📊 Tablas

#### Header de Tabla
```css
/* Hex: #E6EDF0 */
bg-table-header
```

**Uso:**
- Encabezados de columnas (`<thead>`)
- Filas de títulos

#### Filas Alternadas
```css
/* Hex: #F8F8F9 */
bg-table-row
```

**Uso:**
- Filas pares/impares para mejor legibilidad
- Hover states de filas

#### Fila de Totales
```css
/* Hex: #F4F9FF */
bg-table-total
```

**Uso:**
- Fila de sumas/totales al final de tablas
- Resúmenes destacados

**Ejemplo:**
```tsx
<Table>
  <thead className="bg-table-header">
    <tr>
      <Th>Mes</Th>
      <Th>PPTO</Th>
      <Th>Ejecutado</Th>
    </tr>
  </thead>
  <tbody>
    <tr className="hover:bg-table-row">
      <Td>Enero</Td>
      <Td>10,000</Td>
      <Td>8,500</Td>
    </tr>
  </tbody>
  <tfoot className="bg-table-total font-semibold">
    <tr>
      <Td>TOTAL</Td>
      <Td>120,000</Td>
      <Td>105,000</Td>
    </tr>
  </tfoot>
</Table>
```

---

### 📈 Gráficos

#### Ejes de Gráficos
```css
/* Hex: #B1BDC8 */
stroke-chart-axis
border-chart-axis
```

**Uso:**
- Líneas de ejes X e Y
- Grids de fondo

#### Línea Promedio
```css
/* Hex: #A1ACB5 */
stroke-chart-average
```

**Uso:**
- Líneas de promedio/referencia
- Valores objetivo (targets)

**Ejemplo (Chart.js config):**
```javascript
{
  borderColor: '#B1BDC8', // chart-axis
  gridLines: {
    color: '#B1BDC8',
    borderDash: [2, 4]
  },
  // Línea promedio
  averageLine: {
    borderColor: '#A1ACB5',
    borderWidth: 2,
    borderDash: [5, 5]
  }
}
```

---

## Monedas y Compañías

### 💵 Monedas

#### USD (Dólar)
```css
/* Hex: #8AF9C3 */
bg-currency-usd
text-currency-usd
```

#### PEN (Sol)
```css
/* Hex: #FFE289 */
bg-currency-pen
text-currency-pen
```

**Ejemplo:**
```tsx
<span className="bg-currency-pen/20 text-brand-text-primary px-2 py-1 rounded">
  PEN 10,000
</span>

<span className="bg-currency-usd/20 text-brand-text-primary px-2 py-1 rounded">
  USD 2,500
</span>
```

---

### 🏢 Compañías (Gráficos Comparativos)

```css
bg-company-interseguro  /* #71B3FF */
bg-company-crecer       /* #CFAC98 */
bg-company-positiva     /* #FFE5A6 */
bg-company-pacifico     /* #A2F6FB */
bg-company-protecta     /* #75F3A0 */
bg-company-vida         /* #C98AFB */
bg-company-rimac        /* #F96F72 */
bg-company-mapfre       /* #FFCA9A */
bg-company-qualitas     /* #F9AAD8 */
```

**Uso:**
- Gráficos de comparación multi-empresa
- Leyendas de dashboards
- Badges identificadores

**Ejemplo (Chart.js):**
```javascript
datasets: [
  {
    label: 'Interseguro',
    backgroundColor: '#71B3FF', // company-interseguro
    data: [...]
  },
  {
    label: 'Crecer Seguros',
    backgroundColor: '#CFAC98', // company-crecer
    data: [...]
  }
]
```

---

## Guía de Migración

### ✅ Cambios Implementados

| Color | Antes | Ahora | Cambio |
|-------|-------|-------|--------|
| Texto Secundario | `#6B7C8F` | `#8A96A2` | ✅ Actualizado |
| Warning | `#FDCF5F` | `#FDCE5F` | ✅ Corregido |
| Qualitas | `#F9AD8B` | `#F9AAD8` | ✅ Corregido |
| Botones Acción | - | `#FF429B` | ✅ Agregado |
| Ejes Gráficos | - | `#B1BDC8` | ✅ Agregado |
| Línea Promedio | - | `#A1ACB5` | ✅ Agregado |
| Header Tablas | - | `#E6EDF0` | ✅ Agregado |
| Filas Tablas | - | `#F8F8F9` | ✅ Agregado |
| Totales Tablas | - | `#F4F9FF` | ✅ Agregado |

---

### 🔄 Cómo Migrar Código Existente

#### Opción 1: Usar Alias Legacy (Sin cambios)
```tsx
// ✅ Funciona sin cambios
<div className="bg-dashboard text-text-primary">
  <Button className="bg-brand-primary">Click</Button>
</div>
```

**Los alias legacy se mantienen para retrocompatibilidad.**

---

#### Opción 2: Migrar a Nueva Nomenclatura (Recomendado)

**Antes:**
```tsx
<div className="bg-dashboard text-text-primary border-border-default">
  <Button className="bg-brand-primary text-white">
    Guardar
  </Button>
</div>
```

**Después:**
```tsx
<div className="bg-brand-background text-brand-text-primary border-brand-border">
  <Button className="bg-brand-action text-white">
    Guardar
  </Button>
</div>
```

---

### 🆕 Nuevos Colores Disponibles

**Botones de Acción (Antes no existía):**
```tsx
// ✅ NUEVO: Usar para CTAs principales
<button className="bg-brand-action text-white hover:bg-brand-hover">
  Crear Factura
</button>
```

**Tablas (Antes no existía):**
```tsx
// ✅ NUEVO: Headers consistentes
<thead className="bg-table-header">
  <tr>
    <Th>Columna</Th>
  </tr>
</thead>

// ✅ NUEVO: Totales destacados
<tfoot className="bg-table-total font-semibold">
  <tr>
    <Td>TOTAL</Td>
    <Td>1,000,000</Td>
  </tr>
</tfoot>
```

**Gráficos (Antes no existía):**
```javascript
// ✅ NUEVO: Ejes y líneas promedio
{
  gridLines: {
    color: '#B1BDC8', // chart-axis
  },
  annotation: {
    annotations: [{
      type: 'line',
      borderColor: '#A1ACB5', // chart-average
      label: { content: 'Promedio' }
    }]
  }
}
```

---

## Ejemplos de Uso

### Ejemplo 1: Card con Header
```tsx
<Card className="bg-brand-surface border border-brand-border shadow-soft rounded-2xl">
  <CardHeader className="bg-table-header border-b border-brand-border-light">
    <h2 className="text-brand-text-primary font-semibold">Resumen Mensual</h2>
  </CardHeader>
  <CardContent className="p-4">
    <p className="text-brand-text-secondary text-sm">Contenido del card</p>
  </CardContent>
</Card>
```

---

### Ejemplo 2: Botones con Jerarquía
```tsx
{/* Acción Principal */}
<button className="bg-brand-action text-white px-6 py-2 rounded-xl hover:bg-brand-hover">
  Guardar Cambios
</button>

{/* Acción Secundaria */}
<button className="bg-brand-surface text-brand-text-primary border border-brand-border px-6 py-2 rounded-xl hover:bg-table-row">
  Cancelar
</button>

{/* Acción Deshabilitada */}
<button className="bg-brand-surface text-brand-text-disabled border border-brand-border px-6 py-2 rounded-xl cursor-not-allowed" disabled>
  No Disponible
</button>
```

---

### Ejemplo 3: Tabla con Estados
```tsx
<Table>
  <thead className="bg-table-header">
    <tr>
      <Th>Estado</Th>
      <Th>Monto</Th>
    </tr>
  </thead>
  <tbody>
    <tr className="hover:bg-table-row">
      <Td>
        <span className="bg-status-success/10 text-status-success px-2 py-1 rounded text-xs">
          Aprobado
        </span>
      </Td>
      <Td>10,000</Td>
    </tr>
    <tr className="hover:bg-table-row">
      <Td>
        <span className="bg-status-warning/10 text-status-warning px-2 py-1 rounded text-xs">
          Pendiente
        </span>
      </Td>
      <Td>5,000</Td>
    </tr>
  </tbody>
  <tfoot className="bg-table-total">
    <tr>
      <Td className="font-semibold">TOTAL</Td>
      <Td className="font-semibold">15,000</Td>
    </tr>
  </tfoot>
</Table>
```

---

### Ejemplo 4: Badges de Moneda
```tsx
<div className="flex gap-2">
  <span className="inline-flex items-center gap-1 bg-currency-pen/20 text-brand-text-primary px-3 py-1 rounded-full text-sm">
    <span className="w-2 h-2 bg-currency-pen rounded-full"></span>
    PEN 50,000
  </span>
  
  <span className="inline-flex items-center gap-1 bg-currency-usd/20 text-brand-text-primary px-3 py-1 rounded-full text-sm">
    <span className="w-2 h-2 bg-currency-usd rounded-full"></span>
    USD 12,500
  </span>
</div>
```

---

## 📝 Notas de Implementación

### ✅ Completado
- ✅ Paleta completa del Manual de Marca implementada
- ✅ Nomenclatura semántica organizada por categorías
- ✅ Alias legacy para retrocompatibilidad
- ✅ Colores de tablas agregados
- ✅ Colores de gráficos (ejes, promedio) agregados
- ✅ Botón de acción (#FF429B) agregado
- ✅ Corrección de Qualitas (#F9AAD8)
- ✅ Corrección de Warning (#FDCE5F)
- ✅ Actualización de Texto Secundario (#8A96A2)

### 🔄 Próximos Pasos (Opcional)
- Migrar componentes existentes a nueva nomenclatura
- Crear variantes de componentes usando colores semánticos
- Implementar dark mode (si es requerido)
- Crear Storybook con ejemplos de todos los colores

---

## 🔗 Referencias

- **Manual de Marca**: Documento corporativo Interseguro
- **Tailwind Config**: `apps/web/tailwind.config.js`
- **CSS Global**: `apps/web/src/index.css`
- **Componentes UI**: `apps/web/src/components/ui/`

---

**Versión**: 2.0  
**Última actualización**: 27 nov 2025  
**Mantenedor**: Equipo de Frontend
