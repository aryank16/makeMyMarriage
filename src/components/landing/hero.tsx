import Link from 'next/link';

/* Everything in the browser mockup is illustrative — invented names and
 * numbers that show what the guest table looks like in use. None of it is
 * fetched, and it must not be presented as a real customer's data. */
const STATS = [
  { label: 'Invited', value: '284', accent: false },
  { label: 'Replied', value: '196', accent: true },
  { label: 'Attending', value: '412', accent: false },
  { label: 'Awaiting', value: '88', accent: false },
];

const FUNCTIONS = ['Mehendi', 'Sangeet', 'Wedding', 'Reception'];

const GUESTS: { name: string; allowed: number; invited: boolean[] }[] = [
  {
    name: 'Ramesh & Sunita Sharma',
    allowed: 4,
    invited: [true, true, true, true],
  },
  {
    name: 'Vikramaditya Singhania',
    allowed: 2,
    invited: [false, true, true, true],
  },
  {
    name: 'Meenakshi Iyer (Chithi)',
    allowed: 3,
    invited: [true, true, true, true],
  },
  {
    name: 'Kabir Mehta & Team (Office)',
    allowed: 6,
    invited: [false, false, false, true],
  },
  { name: 'Pooja & Aman Varma', allowed: 2, invited: [false, true, true, true] },
  {
    name: 'Harpreet & Jasleen Kaur',
    allowed: 2,
    invited: [true, true, true, true],
  },
];

export default function Hero() {
  return (
    <section className="max-w-[1200px] mx-auto px-6 py-24 lg:py-28">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        <div className="lg:col-span-5 flex flex-col items-start lg:pr-4">
          <span className="label-caps mb-4">Wedding planning</span>
          <h1 className="h1-title text-ink mb-6">
            Every function. Every guest. One place.
          </h1>
          <p className="body-large max-w-[460px] mb-8">
            From mehendi to reception — track who&rsquo;s invited to what,
            collect RSVPs without asking anyone to sign up, and keep every photo
            in one gallery.
          </p>
          <div className="flex flex-col items-start gap-3">
            <Link href="/signup" className="btn-primary">
              Start planning for free
            </Link>
            <span className="text-[15px] text-ink-muted">
              Free while we&rsquo;re in early access. No card needed.
            </span>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-surface border-standard card-radius shadow-sm overflow-hidden">
            <div className="bg-[#F6F2EC] px-4 py-3 border-b border-line flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4C8B8] shrink-0" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4C8B8] shrink-0" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4C8B8] shrink-0" />
                <span className="ml-3 text-[12px] text-ink-muted font-mono tracking-tight truncate">
                  app.makemymarriage.com/rohit-ananya/guests
                </span>
              </div>
              <span className="text-[12px] text-ink-muted font-medium px-2 py-0.5 rounded bg-white/70 border border-line shrink-0">
                Live Sync
              </span>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-bone border-standard card-radius p-3"
                  >
                    <div className="text-[11px] uppercase tracking-wider text-ink-muted font-medium">
                      {stat.label}
                    </div>
                    <div
                      className={`font-serif text-[26px] leading-none mt-1 ${
                        stat.accent ? 'text-accent' : 'text-ink'
                      }`}
                    >
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="py-2 pr-3 text-[11px] uppercase tracking-wider text-ink-muted font-medium">
                        Guest
                      </th>
                      <th className="py-2 px-2 text-[11px] uppercase tracking-wider text-ink-muted font-medium">
                        Allowed
                      </th>
                      {FUNCTIONS.map((fn) => (
                        <th
                          key={fn}
                          className="py-2 px-2 text-[11px] uppercase tracking-wider text-ink-muted font-medium text-center"
                        >
                          {fn}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {GUESTS.map((guest) => (
                      <tr key={guest.name} className="border-b border-line/70">
                        <td className="py-2.5 pr-3 text-[13px] text-ink whitespace-nowrap">
                          {guest.name}
                        </td>
                        <td className="py-2.5 px-2 text-[13px] text-ink-muted">
                          {guest.allowed}
                        </td>
                        {guest.invited.map((isInvited, i) => (
                          <td
                            key={FUNCTIONS[i]}
                            className={`py-2.5 px-2 text-[13px] text-center ${
                              isInvited ? 'text-accent' : 'text-ink-muted/60'
                            }`}
                          >
                            {isInvited ? '✓' : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
