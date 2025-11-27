# Módulo de Provisiones - Implementación Completa

**Fecha:** 18 de Noviembre, 2025  
**Estado:** ✅ Implementación Completa

---

## 📋 Resumen

Se ha implementado el módulo de **Provisiones** en el Portal de PPTO TI, siguiendo los mismos patrones arquitectónicos y de diseño utilizados en los módulos de **Órdenes de Compra** y **Facturas**.

El módulo permite registrar, editar y eliminar provisiones presupuestarias asociadas a sustentos, con control de períodos contables y de presupuesto.

---

## 🎯 Objetivo

Implementar un módulo completo para gestionar **Provisiones**, que permita:
- Registrar provisiones (monto positivo) y liberaciones/extornos (monto negativo)
- Asociar cada provisión a un sustento
- Controlar los períodos de presupuesto y contable
- Mantener un historial de provisiones con timestamps
- Exportar datos a CSV

---

## 🗂️ Estructura del Módulo

### 1. Base de Datos (Prisma)

#### Modelo: `Provision`

```prisma
model Provision {
  id               Int       @id @default(autoincrement())
  sustentoId       Int
  sustento         Support   @relation(fields: [sustentoId], references: [id], onDelete: Cascade)
  periodoPpto      String    // Formato YYYY-MM (mes del presupuesto al que afecta)
  periodoContable  String    // Formato YYYY-MM (mes contable del cierre)
  montoPen         Decimal   // Monto en soles (positivo=provisión, negativo=liberación/extorno)
  detalle          String?   @db.Text
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([sustentoId], name: "ix_provision_sustento")
  @@index([periodoPpto], name: "ix_provision_periodo_ppto")
  @@index([periodoContable], name: "ix_provision_periodo_contable")
}
```

#### Migración

**Archivo:** `packages/db/migrations/20251118000000_add_provisions/migration.sql`

- Crea la tabla `Provision`
- Agrega índices para optimizar consultas por sustento y períodos
- Configura la relación con `Support` con `ON DELETE CASCADE`

---

### 2. API Backend

**Archivo:** `apps/api/src/provisions.ts`

#### Endpoints Implementados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/provisions` | Lista todas las provisiones (con filtros opcionales) |
| GET | `/provisions/:id` | Obtiene una provisión por ID |
| POST | `/provisions` | Crea una nueva provisión |
| PATCH | `/provisions/:id` | Actualiza una provisión existente |
| DELETE | `/provisions/:id` | Elimina una provisión |
| GET | `/provisions/export/csv` | Exporta provisiones a CSV |

#### Filtros Disponibles (GET `/provisions`)

- `sustentoId`: Filtrar por sustento
- `periodoPpto`: Filtrar por período de presupuesto (formato YYYY-MM)
- `periodoContable`: Filtrar por período contable (formato YYYY-MM)

#### Validaciones (Zod)

```typescript
createProvisionSchema = {
  sustentoId: number (requerido, > 0)
  periodoPpto: string (requerido, formato YYYY-MM)
  periodoContable: string (requerido, formato YYYY-MM)
  montoPen: number (requerido, ≠ 0)
  detalle: string (opcional)
}
```

**Reglas de Negocio:**
- El sustento debe existir en la base de datos
- El monto no puede ser 0
- Los períodos deben tener formato `YYYY-MM`
- Monto positivo = Provisión (disminuye disponible)
- Monto negativo = Liberación/Extorno (aumenta disponible)

---

### 3. Frontend

**Archivo:** `apps/web/src/pages/ProvisionsPage.tsx`

#### Componentes y Funcionalidades

##### Formulario de Creación/Edición
- **Sustento**: Select con lista de sustentos activos
- **Período PPTO**: Selector de mes/año (`YearMonthPicker`)
- **Período Contable**: Selector de mes/año (`YearMonthPicker`)
- **Monto**: Input numérico (acepta positivos y negativos)
- **Detalle**: Campo de texto opcional

##### Tabla de Listado
- **Columnas:**
  - Sustento (código y nombre)
  - Período Contable
  - Período PPTO
  - Monto (PEN) - con color:
    - Rojo: Provisión (monto positivo)
    - Verde: Liberación (monto negativo)
  - Detalle
  - Fecha de Creación
  - Acciones (Editar / Eliminar)

##### Filtros
- Filtro por Sustento (dropdown)
- Filtro por Período PPTO (input de texto)
- Filtro por Período Contable (input de texto)
- Botón de exportación a CSV

##### Ordenamiento
- Columnas ordenables: Sustento, Período Contable, Período PPTO, Monto, Fecha Creación
- Triple-click: Ascendente → Descendente → Reset a ordenamiento por defecto

---

### 4. Navegación

**Archivo:** `apps/web/src/main.tsx`

- Agregado enlace "Provisiones" en el menú lateral
- Ubicación: Entre "Facturas" y "Reportes"
- Icono: `Calendar` (de lucide-react)
- Ruta: `/provisions`

---

## 📊 Interpretación del Signo del Monto

### Monto Positivo (+)
- **Significado:** Provisión
- **Impacto:** Disminuye el presupuesto disponible
- **Ejemplo:** +5,000.00 PEN = Se provisiona S/ 5,000 para un gasto futuro

### Monto Negativo (−)
- **Significado:** Liberación / Extorno
- **Impacto:** Aumenta el presupuesto disponible (representa eficiencia)
- **Ejemplo:** -2,000.00 PEN = Se libera S/ 2,000 de una provisión anterior

**Cálculo en Reportes (futuro):**
```
Disponible = Presupuesto - Ejecutado - Provisiones Netas
Provisiones Netas = Σ(montoPen) [incluye positivos y negativos]
```

---

## 🔧 Archivos Modificados/Creados

### Base de Datos
- ✅ `packages/db/schema.prisma` (modelo `Provision` agregado)
- ✅ `packages/db/migrations/20251118000000_add_provisions/migration.sql` (nueva migración)

### Backend
- ✅ `apps/api/src/provisions.ts` (nuevo archivo con endpoints CRUD)
- ✅ `apps/api/src/index.ts` (registro de rutas de provisiones)

### Frontend
- ✅ `apps/web/src/pages/ProvisionsPage.tsx` (nueva página)
- ✅ `apps/web/src/main.tsx` (agregado al router y menú de navegación)

### Documentación
- ✅ `PROVISIONS_MODULE_IMPLEMENTATION.md` (este archivo)

---

## 🚀 Pasos para Usar el Módulo

### 1. Aplicar Migración

```bash
cd packages/db
npx prisma migrate dev
npx prisma generate
```

### 2. Reiniciar Servidor Backend

```bash
cd apps/api
pnpm run dev
```

### 3. Reiniciar Servidor Frontend

```bash
cd apps/web
pnpm run dev
```

### 4. Acceder al Módulo

1. Abrir la aplicación en el navegador: `http://localhost:5173`
2. Navegar al menú lateral → **Provisiones**
3. Hacer clic en **"Nueva Provisión"** para crear una provisión

---

## 📝 Ejemplo de Uso

### Caso 1: Registrar una Provisión

**Escenario:** Se necesita provisionar S/ 10,000 para el sustento "Licencias Microsoft" en el período contable de Diciembre 2025, afectando el presupuesto de Enero 2026.

**Pasos:**
1. Clic en "Nueva Provisión"
2. Seleccionar Sustento: "Licencias Microsoft"
3. Período Contable: 2025-12
4. Período PPTO: 2026-01
5. Monto: `10000.00`
6. Detalle: "Provisión anual de licencias"
7. Clic en "Crear Provisión"

**Resultado:** Se crea la provisión con monto positivo, disminuyendo el disponible.

---

### Caso 2: Registrar una Liberación

**Escenario:** Se liberan S/ 3,000 de una provisión anterior porque el gasto real fue menor.

**Pasos:**
1. Clic en "Nueva Provisión"
2. Seleccionar Sustento: "Licencias Microsoft"
3. Período Contable: 2025-12
4. Período PPTO: 2026-01
5. Monto: `-3000.00` (negativo)
6. Detalle: "Liberación por eficiencia en negociación"
7. Clic en "Crear Provisión"

**Resultado:** Se registra la liberación con monto negativo, aumentando el disponible.

---

## 🎨 Consistencia Visual

El módulo de Provisiones sigue exactamente el mismo estilo visual que:
- Órdenes de Compra
- Facturas

**Componentes Reutilizados:**
- `Card`, `CardHeader`, `CardContent`
- `Input`, `Select`, `Button`
- `Table`, `Th`, `Td`
- `YearMonthPicker`

**Paleta de Colores:**
- Botón primario: `brand-600`
- Provisión (monto positivo): `text-red-600`
- Liberación (monto negativo): `text-green-600`
- Bordes y fondos: `slate-100`, `slate-200`

---

## 🔍 Validaciones Implementadas

### Frontend
- Sustento requerido
- Período PPTO requerido
- Período Contable requerido
- Monto requerido y ≠ 0
- Formato de períodos: YYYY-MM

### Backend
- Sustento debe existir en BD
- Períodos deben tener formato válido (regex: `^\d{4}-\d{2}$`)
- Monto ≠ 0
- Detalle es opcional

---

## 📦 Dependencias

**No se agregaron nuevas dependencias.** Se reutilizaron todas las librerías existentes:
- Backend: Fastify, Prisma, Zod
- Frontend: React, React Query, React Router, Tailwind CSS, lucide-react

---

## 🧪 Testing Manual Sugerido

1. ✅ Crear provisión con monto positivo
2. ✅ Crear provisión con monto negativo
3. ✅ Editar una provisión existente
4. ✅ Eliminar una provisión
5. ✅ Filtrar por sustento
6. ✅ Filtrar por período contable
7. ✅ Filtrar por período PPTO
8. ✅ Ordenar por diferentes columnas
9. ✅ Exportar a CSV
10. ✅ Validar que no se pueda crear provisión con monto = 0
11. ✅ Validar que el sustento deba existir

---

## 🔮 Futuras Mejoras (Fuera de Alcance Actual)

- Integración con cálculo de "Disponible" en reportes de PPTO
- Dashboard widget mostrando provisiones del mes actual
- Notificaciones cuando se libera una provisión
- Validación de que el período PPTO esté dentro del ejercicio fiscal vigente
- Historial de cambios (audit log)

---

## ✅ Estado Final

| Componente | Estado |
|------------|--------|
| Modelo de datos | ✅ Completo |
| Migración | ✅ Completo |
| API Backend | ✅ Completo |
| Frontend UI | ✅ Completo |
| Navegación | ✅ Completo |
| Validaciones | ✅ Completo |
| Documentación | ✅ Completo |

**El módulo de Provisiones está listo para usar.**

---

## 📞 Soporte

Para cualquier duda o mejora, consultar este documento o revisar los archivos de implementación listados arriba.

---

**Fin del documento**

