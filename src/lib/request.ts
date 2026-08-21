import type { NextRequest } from 'next/server';

/**
 * Build a public absolute URL for a pathname using the forwarded host/proto
 * headers. `req.url` / `req.nextUrl` carry the standalone server's HOSTNAME
 * (0.0.0.0) rather than the public hostname, so they must not be used as a
 * redirect base.
 */
export function publicUrl(req: NextRequest, pathname: string): URL {
  const host =
    req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  return new URL(pathname, `${proto}://${host}`);
}
