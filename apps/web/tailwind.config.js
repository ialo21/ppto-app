/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ──────────────────────────────────────────────────────────────────
        // 🎨 MANUAL DE MARCA - PALETA CORPORATIVA INTERSEGURO
        // ──────────────────────────────────────────────────────────────────
        
        brand: {
          // Colores de Marca Principal
          primary: '#1E63A9',        // Interseguro (primario)
          action: '#FF429B',         // Botones de acción
          hover: '#E6398B',          // Hover/Active state
          
          // Fondos Estructurales
          background: '#F2F4F4',     // Background Dashboard (default app background)
          surface: '#FFFFFF',        // Cards y superficies elevadas
          
          // Bordes y Líneas
          border: '#CFDFEA',         // Bordes de cajas principales
          'border-light': '#E6EDF0', // Opcional: borde más suave
          
          // Textos
          'text-primary': '#4C6176',   // Texto principal (contenido)
          'text-secondary': '#8A96A2', // Texto secundario/filtros
          'text-disabled': '#A1ACB5',  // Texto deshabilitado
        },
        
        // Estados Semánticos (Success, Warning, Error)
        status: {
          success: '#31D785',        // Verde - operaciones exitosas
          warning: '#FDCE5F',        // Amarillo - advertencias
          error: '#F94666',          // Rojo - errores/peligro
        },
        
        // Gráficos y Visualizaciones
        chart: {
          axis: '#B1BDC8',           // Ejes de gráficos
          average: '#A1ACB5',        // Línea promedio
        },
        
        // Tablas
        table: {
          header: '#E6EDF0',         // Header de tablas
          row: '#F8F8F9',            // Filas alternadas
          total: '#F4F9FF',          // Fila de totales
        },
        
        // Monedas
        currency: {
          usd: '#8AF9C3',            // Dólar estadounidense
          pen: '#FFE289',            // Sol peruano
        },
        
        // Compañías (Para gráficos comparativos)
        company: {
          interseguro: '#71B3FF',    // Interseguro
          crecer: '#CFAC98',         // Crecer Seguros
          positiva: '#FFE5A6',       // La Positiva
          pacifico: '#A2F6FB',       // Pacífico
          protecta: '#75F3A0',       // Protecta
          vida: '#C98AFB',           // Vida Cámara
          rimac: '#F96F72',          // Rimac
          mapfre: '#FFCA9A',         // Mapfre
          qualitas: '#F9AAD8',       // Qualitas (🔧 Corregido)
        },
        
        // ──────────────────────────────────────────────────────────────────
        // ALIAS LEGACY (Para retrocompatibilidad - mantener temporalmente)
        // ──────────────────────────────────────────────────────────────────
        'brand-primary': '#1E63A9',
        'brand-hover': '#E6398B',
        'brand-active': '#E6398B',
        'dashboard': '#F2F4F4',
        'surface': '#FFFFFF',
        'text-primary': '#4C6176',
        'text-secondary': '#8A96A2',
        'text-disabled': '#A1ACB5',
        'border-default': '#CFDFEA',
        'border-light': '#E6EDF0',
        'border-focus': '#B1BDC8',
        'status-error': '#F94666',
        'status-warning': '#FDCE5F',
        'status-success': '#31D785',
        'company-interseguro': '#1E63A9',
        'company-crecer': '#CFAC98',
        'company-positiva': '#FFE5A6',
        'company-pacifico': '#A2F6FB',
        'company-protecta': '#75F3A0',
        'company-vida': '#C98AFB',
        'company-rimac': '#F96F72',
        'company-mapfre': '#FFCA9A',
        'company-qualitas': '#F9AAD8',
        'currency-usd': '#8AF9C3',
        'currency-pen': '#FFE289',
      },
      borderRadius: {
        "2xl": "1rem"
      },
      boxShadow: {
        soft: "0 2px 8px rgba(76, 97, 118, 0.08)",
        medium: "0 4px 16px rgba(76, 97, 118, 0.12)",
        strong: "0 8px 24px rgba(76, 97, 118, 0.16)",
      }
    }
  },
  plugins: []
}
