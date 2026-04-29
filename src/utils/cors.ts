// Shared between the HTTP server bootstrap and the WebSocket gateway. Lives in
// utils/ so the gateway can import it without pulling in src/main's app graph.
export function getCorsOrigin(): true | (string | RegExp)[] {
  if (process.env.NODE_ENV === 'development') return true;

  const frontendAppUrl = process.env.FRONTEND_APP_URL;
  if (!frontendAppUrl) {
    throw new Error('FRONTEND_APP_URL environment variable must be set');
  }

  const allowedOrigins: (string | RegExp)[] = [frontendAppUrl.replace(/\/+$/, '')];

  if (process.env.NODE_ENV !== 'production') {
    // Allow Vercel preview branch URLs in non-production environments
    allowedOrigins.push(/^https:\/\/bloom-frontend-[\w-]+-chaynhq\.vercel\.app$/);
  }

  return allowedOrigins;
}
