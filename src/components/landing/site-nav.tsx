import Image from 'next/image';
import Link from 'next/link';

export default function SiteNav() {
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
            <a
              href="#how-it-works"
              className="hover:text-ink transition-colors"
            >
              How it works
            </a>
            <a href="#features" className="hover:text-ink transition-colors">
              Features
            </a>
            <a href="#faq" className="hover:text-ink transition-colors">
              FAQ
            </a>
          </nav>
          <Link href="/signup" className="btn-primary">
            Start planning for free
          </Link>
        </div>
      </div>
    </header>
  );
}
