import type { Metadata } from 'next';
import { getSignedInEmail } from '@/lib/auth/session';
import SiteNav from '@/components/landing/site-nav';
import Hero from '@/components/landing/hero';
import { CredibilityBand, Problem } from '@/components/landing/problem';
import HowItWorks from '@/components/landing/how-it-works';
import Headcounts from '@/components/landing/headcounts';
import GuestRsvp from '@/components/landing/guest-rsvp';
import Gallery from '@/components/landing/gallery';
import EverythingElse from '@/components/landing/everything-else';
import Pricing from '@/components/landing/pricing';
import Faq from '@/components/landing/faq';
import FinalCta from '@/components/landing/final-cta';
import SiteFooter from '@/components/landing/site-footer';

export const metadata: Metadata = {
  title: 'MakeMyMarriage — Indian Wedding Planning Software',
  description:
    'Track who’s invited to which function, collect RSVPs without asking anyone to sign up, and keep every photo in one gallery.',
};

export default async function Home() {
  /* Reading the session makes this page render per request rather than
   * statically. That is the price of the page being able to tell you that
   * you are signed in, and it is worth paying: the proxy already resolves
   * the session on every request to "/" anyway. */
  const signedIn = await getSignedInEmail();

  return (
    <>
      <SiteNav signedIn={signedIn} />
      <main>
        <Hero signedIn={signedIn} />
        <CredibilityBand />
        <Problem />
        <HowItWorks />
        <Headcounts />
        <GuestRsvp />
        <Gallery />
        <EverythingElse />
        <Pricing signedIn={signedIn} />
        <Faq />
        <FinalCta signedIn={signedIn} />
      </main>
      <SiteFooter />
    </>
  );
}
