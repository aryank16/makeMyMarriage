import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { authErrorMessage } from '@/lib/auth/auth-messages';
import WeddingPreview from '@/components/auth/wedding-preview';
import SignupForm from './signup-form';

export const metadata: Metadata = {
  title: 'Create your account · MakeMyMarriage',
};

export default async function SignupPage(props: PageProps<'/signup'>) {
  const searchParams = await props.searchParams;
  const callbackError = authErrorMessage(searchParams.error);

  // Read per request, not inlined at build time — see the note in login/page.tsx.
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

        <SignupForm googleEnabled={googleEnabled} />

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
