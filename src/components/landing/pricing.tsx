import Link from 'next/link';

export default function Pricing() {
  return (
    <section
      id="early-access"
      className="scroll-mt-[72px] border-t border-line bg-bone-deep"
    >
      <div className="max-w-[1200px] mx-auto px-6 py-24">
        <div className="max-w-[680px] mx-auto bg-surface border-standard card-radius p-10 sm:p-16 text-center">
          <h2 className="h2-title text-ink mb-6">
            Free while we&rsquo;re in early access.
          </h2>
          <p className="body-large mb-8">
            We&rsquo;re new. Everything above is free right now — and anyone who
            plans a wedding with us during early access keeps it free through
            that wedding.
          </p>
          <Link href="/signup" className="btn-primary">
            Start planning for free
          </Link>
        </div>
      </div>
    </section>
  );
}
