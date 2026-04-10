/**
 * Serialize params into a query-string suffix (including the leading '?').
 * Returns an empty string if no params are provided or none are set.
 */
export function buildPaginationQuery(params?: object): string {
  if (!params) return '';
  const qp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      qp.append(key, String(value));
    }
  }
  const str = qp.toString();
  return str ? `?${str}` : '';
}
