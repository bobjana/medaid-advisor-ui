import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'medaid-session';

function base64UrlDecode(str: string): Uint8Array<ArrayBuffer> {
  // Convert base64url to base64, then decode
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifySessionCookie(cookieValue: string, secret: string): Promise<boolean> {
  const dotIndex = cookieValue.indexOf('.');
  if (dotIndex === -1) return false;

  const payload = cookieValue.slice(0, dotIndex);
  const signature = cookieValue.slice(dotIndex + 1);

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const sigBytes = base64UrlDecode(signature);
  const verified = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload));
  if (!verified) return false;

  try {
    const data = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    return typeof data.exp === 'number' && Date.now() / 1000 < data.exp;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { SESSION_SECRET } = process.env;
  if (!SESSION_SECRET) {
    return new NextResponse('Authentication is not configured', { status: 500 });
  }

  const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;
  if (!cookieValue || !(await verifySessionCookie(cookieValue, SESSION_SECRET))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|api/login).*)'],
};
