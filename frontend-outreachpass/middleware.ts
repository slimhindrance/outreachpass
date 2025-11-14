import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { runWithAmplifyServerContext } from '@/utils/amplifyServerUtils';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Validate authentication using Amplify server-side session
  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec);
        return (
          session.tokens?.accessToken !== undefined &&
          session.tokens?.idToken !== undefined
        );
      } catch (error) {
        console.error('[Middleware] Auth validation error:', error);
        return false;
      }
    },
  });

  if (authenticated) {
    return response;
  }

  // Redirect to home with return URL
  const url = request.nextUrl.clone();
  url.pathname = '/';
  url.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match admin routes only
     * Exclude API routes, static files, auth callback
     */
    '/admin/:path*',
  ],
};
