import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  console.log('[Middleware] Incoming cookies:', request.cookies.getAll());
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
          const cookieValue = request.cookies.get(name)?.value;
          console.log(`[Middleware] Supabase client GET cookie: ${name} = ${cookieValue === undefined ? 'undefined' : '******'}`); // Avoid logging sensitive token value
          return cookieValue;
        },
        set(name: string, value: string, options: CookieOptions) {
          console.log(`[Middleware] Supabase client SET cookie: ${name}, Options: ${JSON.stringify(options)}`);
          // Middleware's job is to set the cookie on the outgoing response
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          console.log(`[Middleware] Supabase client REMOVE cookie: ${name}, Options: ${JSON.stringify(options)}`);
          // Middleware's job is to set the cookie on the outgoing response
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  )

  // Refresh session if expired - important for Server Components
  // and Server Actions.
  // This will also update the cookies in the response / request
  // via the set/remove handlers passed to createServerClient.
  const { data: { user }, error } = await supabase.auth.getUser(); // Using getUser() is often preferred in middleware to just get user state. getSession() also works.

  if (error) {
    console.error('[Middleware] Error getting user:', error.message);
  } else {
    console.log('[Middleware] User from supabase.auth.getUser():', user ? user.id : 'No user');
  }

  console.log('[Middleware] Outgoing response cookies:', response.cookies.getAll());
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
