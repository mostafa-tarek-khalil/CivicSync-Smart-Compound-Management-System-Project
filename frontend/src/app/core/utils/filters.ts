/**
 * Shared query-parameter helpers for the admin filter dropdowns.
 *
 * Every admin table has the same requirement: a dropdown that offers an
 * "All" option, and a bug in almost every implementation of it — sending
 * `status=ALL` to an API that filters on that literal value returns nothing.
 * These helpers make "no filter" mean "omit the parameter entirely".
 */

/** True when a dropdown value represents a real, narrowing filter. */
export function isRealFilter(value: string | null | undefined): boolean {
  const text = (value ?? '').toString().trim();

  if (!text) {
    return false;
  }

  const normalized = text.toUpperCase();

  return normalized !== 'ALL' && normalized !== 'NULL' && normalized !== 'UNDEFINED';
}

/**
 * Build a params object, copying only the keys that carry a real value.
 *
 * `buildFilters({ status: 'ALL', category: 'AC' })` -> `{ category: 'AC' }`.
 */
export function buildFilters<T extends Record<string, string | undefined>>(
  source: T
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(source)) {
    if (isRealFilter(value)) {
      result[key as keyof T] = value as T[keyof T];
    }
  }

  return result;
}