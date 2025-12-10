/**
 * UTILIDADES PARA FORMATEO DE NÚMEROS MONETARIOS
 * 
 * Centraliza el formateo de valores numéricos en toda la aplicación
 * para mantener consistencia visual.
 */

/**
 * Formatea un número con separadores de miles y 2 decimales
 * para mostrar en UI (pantalla)
 * 
 * @example
 * formatNumber(1988883.39) → "1,988,883.39"
 * formatNumber(1500) → "1,500.00"
 */
export function formatNumber(value: any): string {
  const num = Number(value ?? 0);
  if (isNaN(num)) return '0.00';
  
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Formatea un número SIN separadores de miles (para exportación CSV)
 * 
 * @example
 * formatNumberForCSV(1988883.39) → "1988883.39"
 * formatNumberForCSV(1500) → "1500.00"
 */
export function formatNumberForCSV(value: any): string {
  const num = Number(value ?? 0);
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

/**
 * Formatea un número como moneda con símbolo
 * 
 * @example
 * formatCurrency(1988883.39, 'PEN') → "PEN 1,988,883.39"
 * formatCurrency(1500, 'USD') → "USD 1,500.00"
 */
export function formatCurrency(value: any, currency: string = 'PEN'): string {
  return `${currency} ${formatNumber(value)}`;
}

/**
 * Formatea un número con abreviación para millones (M) y miles (k)
 * Usado para mostrar números grandes de forma compacta en tarjetas KPI
 * 
 * @example
 * formatNumberAbbreviated(16418969) → "16.4M"
 * formatNumberAbbreviated(372400) → "372.4k"
 * formatNumberAbbreviated(999) → "999"
 * formatNumberAbbreviated(0) → "0"
 */
export function formatNumberAbbreviated(value: any): string {
  const num = Number(value ?? 0);
  if (isNaN(num)) return '0';
  
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  // Millones (≥ 1,000,000)
  if (absNum >= 1000000) {
    const millions = absNum / 1000000;
    return `${sign}${millions.toFixed(1)}M`;
  }
  
  // Miles (≥ 1,000)
  if (absNum >= 1000) {
    const thousands = absNum / 1000;
    return `${sign}${thousands.toFixed(1)}k`;
  }
  
  // Números pequeños sin abreviación
  return `${sign}${absNum.toFixed(0)}`;
}
