/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta Corporativa - Colores principales
        'brand-primary': '#71B3FF',
        'brand-hover': '#E6398B',
        'brand-active': '#CC3279',
        
        // Fondos
        'dashboard': '#F2F4F4',
        'surface': '#FFFFFF',
        'surface-hover': '#F8F9FA',
        'surface-active': '#F2F4F4',
        
        // Textos
        'text-primary': '#4C6176',
        'text-secondary': '#6B7C8F',
        'text-disabled': '#A1ACB5',
        
        // Bordes
        'border-default': '#CFDFEA',
        'border-light': '#E5EBF0',
        'border-focus': '#B1BDC8',
        
        // Estados
        'status-error': '#F94666',
        'status-warning': '#FDCF5F',
        'status-success': '#31D785',
        
        // Compañías
        'company-interseguro': '#71B3FF',
        'company-crecer': '#CFAC98',
        'company-positiva': '#FFE5A6',
        'company-pacifico': '#A2F6FB',
        'company-protecta': '#75F3A0',
        'company-vida': '#C98AFB',
        'company-rimac': '#F96F72',
        'company-mapfre': '#FFCA9A',
        'company-qualitas': '#F9AD8B',
        
        // Monedas
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
