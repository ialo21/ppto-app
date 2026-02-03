/**
 * Design Tokens - Paleta Corporativa
 * 
 * Este archivo centraliza todos los colores y tokens de diseño de la aplicación.
 * Para ajustar colores en el futuro, modifica los valores aquí.
 */

export const tokens = {
  // === COLORES BASE ===
  colors: {
    // Fondos y superficies
    background: {
      dashboard: '#F2F4F4',
      surface: '#FFFFFF',
      surfaceHover: '#F8F9FA',
      surfaceActive: '#F2F4F4',
    },
    
    // Textos
    text: {
      primary: '#4C6176',
      secondary: '#6B7C8F',
      disabled: '#A1ACB5',
      inverse: '#FFFFFF',
    },
    
    // Bordes
    border: {
      default: '#CFDFEA',
      light: '#E5EBF0',
      focus: '#B1BDC8',
    },
    
    // Estados
    status: {
      error: '#F94666',
      warning: '#FDCF5F',
      success: '#31D785',
    },
    
    // Botones y acciones principales
    primary: {
      main: '#1E63A9',
      hover: '#E6398B',
      active: '#CC3279',
    },
    
    // === COLORES CORPORATIVOS POR COMPAÑÍA ===
    company: {
      interseguro: '#1E63A9',
      crecerSeguros: '#CFAC98',
      laPositiva: '#FFE5A6',
      pacifico: '#A2F6FB',
      protecta: '#75F3A0',
      vidaCamara: '#C98AFB',
      rimac: '#F96F72',
      mapfre: '#FFCA9A',
      qualitas: '#F9AD8B',
    },
    
    // === COLORES DE MONEDA ===
    currency: {
      usd: '#8AF9C3',
      pen: '#FFE289',
    },
    
    // === COLORES PARA GRÁFICOS ===
    charts: {
      axis: '#B1BDC8',
      grid: '#CFDFEA',
      average: '#A1ACB5',
    },
  },
  
  // === SHADOWS ===
  shadows: {
    soft: '0 2px 8px rgba(76, 97, 118, 0.08)',
    medium: '0 4px 16px rgba(76, 97, 118, 0.12)',
    strong: '0 8px 24px rgba(76, 97, 118, 0.16)',
  },
  
  // === BORDER RADIUS ===
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
} as const;

export type Tokens = typeof tokens;

