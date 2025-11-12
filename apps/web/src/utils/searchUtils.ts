/**
 * Utilities for case-insensitive and diacritic-insensitive search
 */

/**
 * Normalizes a string by removing diacritics and converting to lowercase
 * Example: "Rentas" -> "rentas", "Comisión" -> "comision"
 */
export function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Checks if a search term matches any of the provided fields
 * @param searchTerm - The search string (e.g., "rentas" or "76.11.01.v")
 * @param fields - Array of field values to search in
 * @returns true if any field contains all tokens from the search term
 */
export function matchesSearch(searchTerm: string, ...fields: (string | null | undefined)[]): boolean {
  if (!searchTerm.trim()) return true;
  
  const normalizedSearchTerm = normalizeString(searchTerm);
  const tokens = normalizedSearchTerm.split(/\s+/).filter(t => t.length > 0);
  
  if (tokens.length === 0) return true;
  
  // Check if all tokens match in at least one field
  return fields.some(field => {
    if (!field) return false;
    const normalizedField = normalizeString(field);
    return tokens.every(token => normalizedField.includes(token));
  });
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

