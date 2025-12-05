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
