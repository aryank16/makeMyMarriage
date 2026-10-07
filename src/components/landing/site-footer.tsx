import Link from 'next/link';

const PRODUCT_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'FAQ', href: '#faq' },
];

const LEGAL_LINKS = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Contact', href: '/contact' },
];

export default function SiteFooter() {
  return (
    <footer className="bg-ink text-bone">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-6">
            <p className="font-serif text-[24px] leading-[1.3]">
              Every function. Every guest. One place.
            </p>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-[13px] uppercase tracking-[0.08em] font-medium text-bone/60 mb-4">
              Product
            </h3>
            <ul className="space-y-3 text-[15px]">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-bone/80 hover:text-bone transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-[13px] uppercase tracking-[0.08em] font-medium text-bone/60 mb-4">
              Legal
            </h3>
            <ul className="space-y-3 text-[15px]">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-bone/80 hover:text-bone transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-bone/15 text-[14px] text-bone/60">
          © {new Date().getFullYear()} MakeMyMarriage
        </div>
      </div>
    </footer>
  );
}
