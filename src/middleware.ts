// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Grab the authorization header from the request
  const basicAuth = req.headers.get('authorization');

  // Pull your secure username/password from your environment variables
  // (We use a fallback here just for local testing)
  const USER = process.env.ADMIN_USER ;
  const PWD = process.env.ADMIN_PASS ;

  if (basicAuth) {
    // The browser sends the auth as a base64 encoded string like "Basic dXNlcjpwYXNz"
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // If they match, let them in!
    if (user === USER && pwd === PWD) {
      return NextResponse.next();
    }
  }

  // If there's no auth header, or the password was wrong, kick them out
  // and trigger the browser's native password prompt
  return new NextResponse('Unauthorized access to Command Center.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

// This tells Next.js exactly which routes to protect.
// We protect EVERYTHING except the Next.js internal build files.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};