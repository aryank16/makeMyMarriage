import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RECOVERY_COOKIE } from '@/lib/auth/recovery';
import ResetPasswordForm from './reset-password-form';

export const metadata: Metadata = {
  title: 'Choose a new password · MakeMyMarriage',
};

export default async function ResetPasswordPage() {
  /* Two things have to hold, and a session alone is not enough for either.
   * The recovery cookie proves this visitor arrived through a reset email
   * rather than simply being signed in on a shared or stolen session, and the
   * user check makes sure there is an account to update. The server action
   * re-checks both, so this is only about not rendering a form that cannot
   * work. */
  const cookieStore = await cookies();
  if (!cookieStore.get(RECOVERY_COOKIE)) {
    redirect('/forgot-password?error=no_recovery');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/forgot-password?error=link_invalid');
  }

  return (
    <main className="min-h-screen bg-bone flex flex-col justify-between p-6 sm:p-12">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <Image
            src="/logo.svg"
            alt="MakeMyMarriage"
            width={320}
            height={80}
            priority
            className="h-8 w-auto"
          />
        </Link>
      </div>

      <ResetPasswordForm email={user.email ?? ''} />

      <div className="w-full max-w-[400px] mx-auto" />
    </main>
  );
}
