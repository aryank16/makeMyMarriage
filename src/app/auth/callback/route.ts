import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/auth/safe-next';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Same validation the login page applies. Without it an absolute `next`
  // makes the template below unparseable and the route throws a 500 after the
  // session has already been exchanged.
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);

    // Only a stable code travels in the URL. The raw Supabase message would
    // be rendered back on the login page, which turns the query string into a
    // way to put arbitrary text in front of the user on our own domain.
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}
