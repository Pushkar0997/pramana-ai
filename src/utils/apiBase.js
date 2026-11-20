/**
 * Resolves the API origin for /api/* serverless endpoints.
 * On Firebase Hosting Spark Free Tier (*.web.app / *.firebaseapp.com), static
 * assets are served from Google CDN while /api/* routes cleanly to the free-tier
 * serverless API (CORS enabled) at $0.00 cost (INV-01).
 */

const FALLBACK_PUBLIC_API_ORIGIN = 'https://pramana-ai-eta.vercel.app';

export function getApiBase() {
  try {
    const envBase = import.meta?.env?.VITE_API_BASE;
    if (envBase) return String(envBase).replace(/\/+$/, '');
  } catch {
    // ignore in non-Vite runtimes
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host.endsWith('.web.app') || host.endsWith('.firebaseapp.com') || host.endsWith('.github.io')) {
      return FALLBACK_PUBLIC_API_ORIGIN;
    }
  }
  return '';
}

export function apiUrl(path) {
  const cleanPath = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${getApiBase()}${cleanPath}`;
}
