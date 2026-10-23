import StartCta from '@/components/landing/start-cta';

export default function FinalCta({ signedIn }: { signedIn: string | null }) {
  return (
    <section className="border-t border-line">
      <div className="max-w-[1200px] mx-auto px-6 py-32 lg:py-40 text-center">
        <h2 className="h2-title text-ink mb-5">
          Start with your first function.
        </h2>
        <p className="body-large mb-8">
          Takes about three minutes. Free while we&rsquo;re in early access.
        </p>
        <StartCta signedIn={signedIn} />
      </div>
    </section>
  );
}
