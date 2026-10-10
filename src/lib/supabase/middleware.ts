import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/auth/safe-next';

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/auth',
  '/i/',
  '/w/',
];

/* Screens that only make sense when signed out. Someone already signed in
 * who lands here — a bookmark, the back button, a stale tab — gets sent on
 * instead of being shown a sign-in form they do not need.
 *
 * /auth is deliberately absent: the recovery link signs you in before
 * /auth/reset-password renders, so redirecting authenticated users away from
 * it would make choosing a new password impossible. */
const SIGNED_OUT_ONLY_PATHS = ['/login', '/signup', '/forgot-password'];

const matches = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`));

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() revalidates the token with Supabase. Do not replace it with
  // getSession(), which trusts whatever is in the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = path === '/' || matches(path, PUBLIC_PATHS);

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (user && matches(path, SIGNED_OUT_ONLY_PATHS)) {
    // Honour ?next= so a half-finished redirect still lands where it meant
    // to. safeNext refuses auth screens, so this cannot bounce in a loop.
    const target = safeNext(request.nextUrl.searchParams.get('next'));
    return NextResponse.redirect(new URL(target, request.url));
  }

  return response;
}
