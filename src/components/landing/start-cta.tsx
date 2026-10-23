import Link from 'next/link';

/**
 * The landing page's primary button.
 *
 * Signed out it starts a sign-up. Signed in it goes to your weddings, and
 * says so — pointing it at /signup either way is what made the front page
 * drop a returning visitor straight into a dashboard, because the proxy
 * turns signed-in people away from the auth screens.
 */
export default function StartCta({ signedIn }: { signedIn: string | null }) {
  return signedIn ? (
    <Link href="/dashboard" className="btn-primary">
      Go to your weddings
    </Link>
  ) : (
    <Link href="/signup" className="btn-primary">
      Start planning for free
    </Link>
  );
}
