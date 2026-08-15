import { createHmac } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'medaid-session';
const SESSION_TTL_SECONDS = 86400; // 24h

function signSession(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export async function POST(req: NextRequest) {
  const { DEMO_USERNAME, DEMO_PASSWORD, SESSION_SECRET } = process.env;
  if (!DEMO_USERNAME || !DEMO_PASSWORD || !SESSION_SECRET) {
    return NextResponse.json(
      {
        error:
          'Authentication is not configured: DEMO_USERNAME, DEMO_PASSWORD, and SESSION_SECRET environment variables are required',
      },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.redirect(new URL('/login?error=1', req.url));
  }

  const username = formData.get('username');
  const password = formData.get('password');

  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    username !== DEMO_USERNAME ||
    password !== DEMO_PASSWORD
  ) {
    return NextResponse.redirect(new URL('/login?error=1', req.url));
  }

  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ username, exp })).toString('base64url');
  const signature = signSession(payload, SESSION_SECRET);
  const cookieValue = `${payload}.${signature}`;

  const response = NextResponse.redirect(new URL('/', req.url));
  response.cookies.set(SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
