// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Basic-auth gate for the whole app. Credentials come from ADMIN_USER /
// ADMIN_PASS; if either is unset, nobody gets in.
function isAuthorized(header: string | null): boolean {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;
  if (!user || !pass || !header?.startsWith('Basic ')) return false;

  let decoded: string;
  try {
    // "Basic dXNlcjpwYXNz" -> "user:pass"
    decoded = atob(header.slice('Basic '.length).trim());
  } catch {
    return false; // not valid base64
  }

  // Split on the FIRST colon only: passwords may contain colons.
  const sep = decoded.indexOf(':');
  if (sep < 0) return false;
  return decoded.slice(0, sep) === user && decoded.slice(sep + 1) === pass;
}

export function proxy(req: NextRequest) {
  if (isAuthorized(req.headers.get('authorization'))) {
    return NextResponse.next();
  }

  // Triggers the browser's native password prompt.
  return new NextResponse('Unauthorized access to Command Center.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

// Protect everything except Next's build files and the /uploads image route.
// User photos are served as <img> subresources, and browsers don't reliably
// resend basic-auth credentials for those, so a protected /uploads made every
// photo 401. The route itself only serves files inside public/uploads.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
};
