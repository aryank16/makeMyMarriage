import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  RECOVERY_COOKIE,
  RECOVERY_COOKIE_MAX_AGE,
  RECOVERY_COOKIE_OPTIONS,
} from '@/lib/auth/recovery';

/**
 * Landing point for the link in a password-reset email.
 *
 * This is deliberately separate from /auth/callback: exchanging the code here
 * is what lets us mark the session as a recovery session, which the reset form
 * then requires. Going through the generic callback would leave the visitor
 * merely "signed in", indistinguishable from any other session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // From the visitor's side a truncated link and a rejected one are the same
  // event, so both get the one message rather than a distinction they cannot
  // act on differently.
  if (!code) {
    return NextResponse.redirect(`${origin}/forgot-password?error=link_invalid`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Expired link, already-used link, or opened in a different browser from
    // the one that asked — the PKCE verifier lives in the requesting browser.
    return NextResponse.redirect(
      `${origin}/forgot-password?error=link_invalid`,
    );
  }

  const response = NextResponse.redirect(`${origin}/auth/reset-password`);
  response.cookies.set(RECOVERY_COOKIE, '1', {
    ...RECOVERY_COOKIE_OPTIONS,
    maxAge: RECOVERY_COOKIE_MAX_AGE,
  });
  return response;
}
