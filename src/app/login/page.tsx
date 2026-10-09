import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { safeNext } from '@/lib/auth/safe-next';
import { authErrorMessage } from '@/lib/auth/auth-messages';
import LoginForm from './login-form';
import WeddingPreview from './wedding-preview';

export const metadata: Metadata = {
  title: 'Log in · MakeMyMarriage',
};

export default async function LoginPage(props: PageProps<'/login'>) {
  const searchParams = await props.searchParams;
  const next = safeNext(searchParams.next);
  const callbackError = authErrorMessage(searchParams.error);

  /* Read on the server, at request time. A NEXT_PUBLIC_ variable would be
   * inlined into the client bundle at build time and the whole OAuth branch
   * dead-code eliminated, so flipping it on a deployed app would silently do
   * nothing until the next rebuild. */
  const googleEnabled = process.env.GOOGLE_AUTH_ENABLED === 'true';

  return (
    <main className="min-h-screen flex">
      <div className="w-full lg:w-[45%] min-h-screen bg-bone flex flex-col justify-between p-6 sm:p-12 lg:border-r lg:border-line">
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

        {callbackError && (
          <div
            role="alert"
            className="w-full max-w-[400px] mx-auto rounded-[10px] border border-line bg-surface px-4 py-3 text-[14px] leading-[1.5] text-ink"
          >
            {callbackError}
          </div>
        )}

        <LoginForm next={next} googleEnabled={googleEnabled} />

        <div className="w-full max-w-[400px] mx-auto pt-6 border-t border-line">
          <p className="text-[14px] leading-[1.6] text-ink-muted">
            Invited as a guest? You don&apos;t need an account — just open the
            invitation link you were sent.
          </p>
        </div>
      </div>

      <WeddingPreview />
    </main>
  );
}
