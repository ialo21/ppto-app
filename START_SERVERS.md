# Guía para Iniciar los Servidores

## Opción 1: Iniciar ambos servidores en una sola terminal

Desde el directorio raíz del proyecto:

```bash
cd C:\programas\ppto-app
pnpm dev
```

Esto iniciará:
- **API Backend** en `http://localhost:3001`
- **Frontend** en `http://localhost:5173`

---

## Opción 2: Iniciar servidores en terminales separadas

### Terminal 1 - Backend API:
```bash
cd C:\programas\ppto-app\apps\api
pnpm dev
```
Servidor corriendo en `http://localhost:3001`

### Terminal 2 - Frontend:
```bash
cd C:\programas\ppto-app\apps\web
pnpm dev
```
Servidor corriendo en `http://localhost:5173`

---

## Verificar que todo funciona

1. **Backend**: Abre `http://localhost:3001/invoices` en tu navegador
   - Deberías ver un JSON con el listado de facturas

2. **Frontend**: Abre `http://localhost:5173` en tu navegador
   - Navega a la página de Facturas

---

## Probar el nuevo flujo de Facturas

### Con OC:
1. Ve a `/invoices`
2. Marca el checkbox "Asociar a Orden de Compra"
3. Selecciona una OC
4. **Verifica**: Se cargan automáticamente periodos y CECOs
5. Selecciona los meses de registro (múltiple)
6. Ajusta la distribución por CECO
7. Guarda

### Sin OC:
1. Ve a `/invoices`
2. Desmarca el checkbox "Asociar a Orden de Compra"
3. Ingresa manualmente: Proveedor, Moneda
4. Selecciona periodos y CECOs disponibles
5. Distribuye el monto
6. Guarda

### Verificar en el listado:
- Columna "Periodos" muestra rango (e.g., "2025-01 → 2025-03")
- Columna "CECOs" muestra chips con códigos

---

## Troubleshooting

### Error de conexión a base de datos:
```bash
# Verifica que PostgreSQL esté corriendo
# y que las credenciales en .env sean correctas
```

### Puerto 3001 o 5173 ya en uso:
```bash
# En Windows PowerShell (como administrador):
netstat -ano | findstr "3001"
# Anota el PID y termina el proceso:
taskkill /PID <PID> /F
```

### Cambios en schema.prisma no se reflejan:
```bash
cd packages/db
pnpm prisma generate
```

