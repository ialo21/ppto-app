/**
 * Period label formatter
 * Format: YYYY-MM
 * Example: 2026-01, 2025-11
 */

export const MONTH_ABBREV_ES: Record<number, string> = {
  1: "ene",
  2: "feb",
  3: "mar",
  4: "abr",
  5: "may",
  6: "jun",
  7: "jul",
  8: "ago",
  9: "sep",
  10: "oct",
  11: "nov",
  12: "dic"
};

export interface Period {
  year: number;
  month: number;
  label?: string;
}

/**
 * Formats a period object to standardized label
 * @param period - Period object with year and month
 * @returns Formatted string: YYYY-MM
 */
export function formatPeriodLabel(period: Period): string {
  const { year, month } = period;
  const yearStr = String(year);
  const monthStr = String(month).padStart(2, "0");
  
  return `${yearStr}-${monthStr}`;
}

