/**
 * Period label formatter
 * Format: YYYY-MM <mesAbrevES><YY>
 * Example: 2026-01 ene26, 2025-11 nov25
 */

const MONTH_ABBREV_ES: Record<number, string> = {
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
 * @returns Formatted string: YYYY-MM <mesAbrevES><YY>
 */
export function formatPeriodLabel(period: Period): string {
  const { year, month } = period;
  const yearStr = String(year);
  const monthStr = String(month).padStart(2, "0");
  const yearShort = yearStr.slice(-2);
  const monthAbbrev = MONTH_ABBREV_ES[month] || "???";
  
  return `${yearStr}-${monthStr} ${monthAbbrev}${yearShort}`;
}

