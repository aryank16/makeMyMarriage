import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Was `middleware.ts` at the repo root, which silently did nothing.
 *
 * Next 16 renamed the convention to `proxy`, and for a project using `src/`
 * the file has to sit next to `app/` — so the old root-level middleware.ts
 * was never loaded. Nothing failed loudly: every protected page already
 * calls getCurrentUser() and redirects on its own, so the app looked
 * correct while the session refresh and the central route guard were both
 * absent.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets and images.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
