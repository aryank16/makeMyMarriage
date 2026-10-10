/* The decorative panel beside the sign-in form.
 *
 * Nobody is authenticated when this renders, so none of these figures can be
 * real — they are illustrative marketing content, same as the approved design.
 * If this ever needs to show a visitor's actual wedding it has to move behind
 * the auth boundary. Treat the names and numbers below as copy, not data.
 *
 * The greys here (#786F66, #DFD6CA, #8C7D6E …) are outside the documented
 * brand palette; they came with the design and are scoped to this panel. */

function CalendarIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 text-[#8F7E6D]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 text-[#968779]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className="w-4 h-4 text-[#8C7D6E]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function WeddingPreview() {
  return (
    <div className="hidden lg:flex w-[55%] min-h-screen bg-[#F5EFE6] text-ink items-center justify-start p-12 relative overflow-hidden">
      <div className="w-full max-w-[460px] ml-12 flex flex-col items-center justify-center">
        <div className="w-full min-h-[580px] bg-[#EFE9DF] border border-[#E3DBD0] rounded-[20px] p-8 shadow-sm flex flex-col justify-between">
          {/* Top metadata row */}
          <div className="flex items-center justify-between text-[11px] font-medium tracking-[0.06em] text-[#786F66]">
            <div className="flex items-center gap-1.5 bg-bone/60 px-3 py-1.5 rounded-md border border-[#DFD6CA]">
              <CalendarIcon />
              <span className="uppercase font-medium">42 Days to Go</span>
            </div>
            <div className="flex items-center gap-1.5 tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5E7B5C]" />
              <span className="text-[#665D54]">Live Synced</span>
            </div>
          </div>

          {/* Centre couple section */}
          <div className="my-auto py-8 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-bone border border-[#DFD6CA] flex items-center justify-center mb-4 text-[#8A7968]">
              <StarIcon />
            </div>
            <div className="text-[11px] uppercase tracking-[0.14em] font-medium text-[#7D7368] mb-2">
              Active Celebration
            </div>
            <h2 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] text-ink mb-2">
              Aryan &amp; Ariana
            </h2>
            <div className="flex items-center justify-center gap-1.5 text-[13px] text-[#736A61]">
              <PinIcon />
              <span>The Oberoi Udaivilas · Udaipur</span>
            </div>
          </div>

          {/* Quote and stat */}
          <div className="bg-bone border border-[#E3DBD0] rounded-[14px] p-6">
            <p className="font-serif italic text-[16px] leading-[1.5] text-[#4A423A] mb-5">
              &ldquo;One shared space for your family, vendors, and closest
              circle. Everything in calm, effortless sync.&rdquo;
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-[#E8E0D5] text-[12px]">
              <span className="uppercase tracking-[0.08em] font-medium text-[#7A7167] text-[11px]">
                RSVP Attendance
              </span>
              <span className="font-medium text-ink tracking-wide">
                420 Confirmed
              </span>
            </div>
          </div>

          {/* Footer status */}
          <div className="mt-6 pt-2 flex items-center justify-between text-[12px] text-[#7D7369]">
            <div className="flex items-center gap-2">
              <ShieldIcon />
              <span>Encrypted Planning Suite</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
