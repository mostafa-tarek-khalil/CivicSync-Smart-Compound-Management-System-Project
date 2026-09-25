/**
 * Environment configuration.
 *
 * `apiBaseUrl` is the single place the backend origin is declared. Every
 * service composes its URL from here instead of hard-coding
 * `http://localhost:3000`, so pointing the app at another backend is a
 * one-line change.
 */
export const environment = {
  production: false,

  /** Backend origin (no trailing slash, no /api suffix). */
  apiBaseUrl: 'http://localhost:3000',

  /** Convenience: the versioned API prefix. */
  apiUrl: 'http://localhost:3000/api',
};

/** Absolute URL for a backend upload path returned by the API. */
export function resolveUploadUrl(path: string | null | undefined): string {
  if (!path) {
    return '';
  }

  // Already absolute (e.g. an external avatar URL) — leave it alone.
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) {
    return path;
  }

  return `${environment.apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}