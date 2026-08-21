import { NextResponse, type NextRequest } from 'next/server';
import { publicUrl } from '@/lib/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'medaid-session';

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(publicUrl(req, '/login'), 303);
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
