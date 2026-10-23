import Image from 'next/image';
import Link from 'next/link';
import SignOutButton from '@/components/auth/sign-out-button';

/**
 * `signedIn` is the visitor's own address, or null.
 *
 * The landing page used to be identical whether or not you were signed in,
 * and its primary button pointed at /signup — which the proxy turns away for
 * anyone with a session, landing them inside a wedding they never asked to
 * open. On a shared laptop that is somebody else's guest list one click from
 * the front page. So the page says who it thinks you are, offers the way out,
 * and never moves you anywhere you did not choose to go.
 */
export default function SiteNav({ signedIn }: { signedIn: string | null }) {
  return (
    <header className="sticky top-0 z-50 h-[72px] bg-bone border-b border-line">
      <div className="max-w-[1200px] h-full mx-auto px-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center hover:opacity-90 transition-opacity"
        >
          <Image
            src="/logo.svg"
            alt="MakeMyMarriage"
            width={320}
            height={80}
            priority
            className="h-8 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-7 text-[15px] font-medium text-ink-muted">
            <a href="#how-it-works" className="hover:text-ink transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-ink transition-colors">
              Features
            </a>
            <a href="#faq" className="hover:text-ink transition-colors">
              FAQ
            </a>
          </nav>

          {signedIn ? (
            <div className="flex items-center gap-4 sm:gap-5">
              <span
                className="hidden sm:inline max-w-[200px] truncate text-[14px] text-ink-muted"
                title={signedIn}
              >
                {signedIn}
              </span>
              <SignOutButton />
              <Link href="/dashboard" className="btn-primary">
                Go to your weddings
              </Link>
            </div>
          ) : (
            <Link href="/signup" className="btn-primary">
              Start planning for free
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
