import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { authErrorMessage } from '@/lib/auth/auth-messages';
import ForgotPasswordForm from './forgot-password-form';

export const metadata: Metadata = {
  title: 'Reset your password · MakeMyMarriage',
};

export default async function ForgotPasswordPage(
  props: PageProps<'/forgot-password'>,
) {
  /* /auth/recovery and /auth/reset-password both bounce back here when a link
   * is dead or was never a recovery link. Without this the visitor would land
   * on an empty form with no idea why. */
  const searchParams = await props.searchParams;
  const error = authErrorMessage(searchParams.error);

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

      {error && (
        <div
          role="alert"
          className="w-full max-w-[400px] mx-auto rounded-[10px] border border-line bg-surface px-4 py-3 text-[14px] leading-[1.5] text-ink"
        >
          {error}
        </div>
      )}

      <ForgotPasswordForm />

      <div className="w-full max-w-[400px] mx-auto" />
    </main>
  );
}
