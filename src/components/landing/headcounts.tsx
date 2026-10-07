/* Illustrative figures, not live data — see the note in hero.tsx.
 *
 * "Confirmed Heads" exceeds "Replied" on the reception row because a reply
 * carries a party size: 270 replies can confirm 296 people. That is the whole
 * point of the feature, so the numbers are deliberate, not a typo. */
const ROWS = [
  { name: 'Haldi Ceremony', invited: 64, replied: 58, heads: 54 },
  { name: 'Mehendi Evening', invited: 110, replied: 94, heads: 88 },
  { name: 'Sangeet & Cocktail', invited: 220, replied: 185, heads: 172 },
  { name: 'Wedding Pheras', invited: 180, replied: 162, heads: 158 },
  { name: 'Grand Reception', invited: 340, replied: 270, heads: 296 },
];

export default function Headcounts() {
  return (
    <section className="max-w-[1200px] mx-auto px-6 py-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
        <div className="lg:col-span-5">
          <h2 className="h2-title text-ink mb-6">
            Know exactly how many are coming. To each function.
          </h2>
          <p className="body-large">
            Your caterer doesn&rsquo;t need a guest list, they need a number. As
            replies come in, you see confirmed heads for every function
            separately — because the people at your haldi aren&rsquo;t the
            people at your reception.
          </p>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-surface border-standard card-radius overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <span className="text-[15px] font-medium text-ink">
                Function Headcounts
              </span>
              <span className="text-[12px] text-ink-muted">Updated 10m ago</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-3 pl-5 pr-3 text-[11px] uppercase tracking-wider text-ink-muted font-medium">
                      Function
                    </th>
                    <th className="py-3 px-3 text-[11px] uppercase tracking-wider text-ink-muted font-medium text-right">
                      Invited
                    </th>
                    <th className="py-3 px-3 text-[11px] uppercase tracking-wider text-ink-muted font-medium text-right">
                      Replied
                    </th>
                    <th className="py-3 pl-3 pr-5 text-[11px] uppercase tracking-wider text-ink-muted font-medium text-right">
                      Confirmed Heads
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.name} className="border-b border-line/70">
                      <td className="py-4 pl-5 pr-3 text-[15px] text-ink whitespace-nowrap">
                        {row.name}
                      </td>
                      <td className="py-4 px-3 text-[15px] text-ink-muted text-right">
                        {row.invited}
                      </td>
                      <td className="py-4 px-3 text-[15px] text-ink-muted text-right">
                        {row.replied}
                      </td>
                      <td className="py-4 pl-3 pr-5 text-right">
                        <span className="font-serif text-[22px] text-accent">
                          {row.heads}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
