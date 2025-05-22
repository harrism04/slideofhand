import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Middleware's job is to set the cookie on the outgoing response
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // Middleware's job is to set the cookie on the outgoing response
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  )

  // Refresh session if expired - important for Server Components
  // and Server Actions.
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('[Middleware] Error refreshing session:', error.message);
  }
  // Optional: Minimal logging for user presence if needed for specific debugging
  // else if (user) {
  //   console.log('[Middleware] User session refreshed:', user.id);
  // }

  const { pathname } = request.nextUrl;

  // Define public paths: home page ('/') and any path starting with '/auth'
  const isPublicPath = pathname === '/' || pathname.startsWith('/auth');

  // If the path is not public and there's no authenticated user, redirect to /auth
  if (!isPublicPath && !user) {
    const loginUrl = new URL('/auth', request.url);
    // Optional: You could add a query param to redirect back after login
    // loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If public path or user is authenticated, proceed
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
