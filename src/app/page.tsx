import type { Metadata } from 'next';
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

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <CredibilityBand />
        <Problem />
        <HowItWorks />
        <Headcounts />
        <GuestRsvp />
        <Gallery />
        <EverythingElse />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
