# PPTO App - Sistema de Presupuesto

Sistema completo de gestión de presupuestos con API Fastify, base de datos PostgreSQL, y frontend React moderno.

## 🚀 Características

- **Backend**: API REST con Fastify y TypeScript
- **Base de Datos**: PostgreSQL con Prisma ORM
- **Frontend**: React con Vite, Tailwind CSS y componentes modernos
- **Monorepo**: Estructura organizada con pnpm workspaces
- **Docker**: PostgreSQL containerizado para desarrollo

## 📁 Estructura del Proyecto

```
ppto-app/
├── apps/
│   ├── api/          # API Fastify (Backend)
│   └── web/          # React App (Frontend)
├── packages/
│   └── db/           # Prisma Schema y migraciones
├── docker-compose.yml
└── package.json
```

## 🛠️ Tecnologías

### Backend
- Fastify + TypeScript
- Prisma ORM
- PostgreSQL
- Zod para validación

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- React Router
- Recharts (gráficos)
- Lucide React (iconos)

## 🚀 Instalación y Uso

### Prerrequisitos
- Node.js 18+
- pnpm
- Docker

### 1. Clonar el repositorio
```bash
git clone <tu-repo-url>
cd ppto-app
```

### 2. Instalar dependencias
```bash
pnpm install
```

### 3. Configurar base de datos
```bash
# Copiar variables de entorno
cp .env.example .env

# Levantar PostgreSQL con Docker
pnpm run db:up

# Ejecutar migraciones
pnpm run db:migrate

# Poblar con datos de prueba
pnpm run db:seed
```

### 4. Ejecutar en desarrollo
```bash
# Ejecutar API y Frontend juntos
pnpm run dev

# O por separado:
pnpm -C apps/api dev    # API en puerto 3001
pnpm -C apps/web dev    # Frontend en puerto 5173
```

## 📊 Funcionalidades

### Gestión de Presupuestos
- Crear y editar asignaciones presupuestarias
- Control de sobreejecución
- Versiones de presupuesto

### Control de Líneas
- Procesamiento de gastos
- Estados: PROCESADO, PROVISIONADO
- Cálculo automático de tipos de cambio

### Facturas
- CRUD completo de facturas
- Historial de estados
- Integración con proveedores

### Reportes
- Ejecución vs Presupuesto
- Series mensuales
- Exportación CSV
- Dashboard con KPIs y gráficos

### Sustentos
- Gestión de categorías de gasto
- Códigos y nombres descriptivos

## 🔧 Scripts Disponibles

```bash
# Desarrollo
pnpm run dev              # Ejecutar todo
pnpm run build            # Build de producción
pnpm run start            # Ejecutar en producción

# Base de datos
pnpm run db:up            # Levantar PostgreSQL
pnpm run db:down          # Detener PostgreSQL
pnpm run db:migrate       # Ejecutar migraciones
pnpm run db:seed          # Poblar con datos de prueba
```

## 🌐 URLs de Desarrollo

- **API**: http://localhost:3001
- **Frontend**: http://localhost:5173
- **Base de datos**: localhost:5432

## 📝 API Endpoints

### Períodos
- `GET /periods` - Listar períodos

### Presupuestos
- `GET /budgets` - Listar asignaciones
- `POST /budgets/upsert` - Crear/actualizar asignaciones

### Líneas de Control
- `GET /control-lines` - Listar líneas
- `PATCH /control-lines/:id/process` - Procesar línea
- `PATCH /control-lines/:id/provisionado` - Marcar como provisionado
- `GET /control-lines/export/csv` - Exportar CSV

### Facturas
- `GET /invoices` - Listar facturas
- `POST /invoices` - Crear factura
- `PATCH /invoices/:id/status` - Cambiar estado
- `GET /invoices/export/csv` - Exportar CSV

### Reportes
- `GET /reports/execution` - Reporte de ejecución
- `GET /reports/execution/csv` - Exportar CSV
- `GET /reports/execution/series` - Series mensuales

### Sustentos
- `GET /supports` - Listar sustentos
- `POST /supports` - Crear/actualizar sustento
- `DELETE /supports/:id` - Eliminar sustento

## 🎨 Frontend

### Páginas Principales
- **Dashboard**: KPIs y gráficos mensuales
- **Sustentos**: Gestión de categorías
- **Presupuesto**: Asignaciones por período
- **Líneas de Control**: Procesamiento de gastos
- **Facturas**: Gestión de facturas
- **Reportes**: Análisis y exportaciones

### Características UI
- Diseño responsive con Tailwind CSS
- Tema claro/oscuro
- Componentes reutilizables
- Formularios con validación
- Tablas interactivas
- Gráficos con Recharts

## 🐳 Docker

El proyecto incluye Docker Compose para PostgreSQL:

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ppto
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
```

## 📄 Licencia

Este proyecto es privado y confidencial.

## 👥 Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## 📞 Soporte

Para soporte técnico o preguntas, contacta al equipo de desarrollo.
