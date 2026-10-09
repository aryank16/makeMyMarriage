/* A static picture of the guest-facing RSVP screen. The Yes/No controls and the
 * stepper are decoration — this is a marketing page, so nothing here submits
 * anything. The real RSVP flow lives behind the per-guest invitation link. */
const INVITED_FUNCTIONS = [
  { name: 'Sangeet Night', when: 'Dec 12, 7:00 PM', answer: 'Yes' },
  { name: 'Wedding Pheras', when: 'Dec 13, 10:00 AM', answer: 'Yes' },
  { name: 'Grand Reception', when: 'Dec 13, 7:30 PM', answer: null },
];

export default function GuestRsvp() {
  return (
    <section className="border-t border-line bg-bone-deep">
      <div className="max-w-[1200px] mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          <div className="lg:col-span-7 flex justify-center order-2 lg:order-1">
            <div className="w-[320px] bg-surface border-standard rounded-[28px] p-3 shadow-sm">
              <div className="flex justify-center py-2">
                <span className="w-16 h-1 rounded-full bg-line" />
              </div>

              <div className="px-4 pb-5">
                <div className="text-center mb-6">
                  <div className="label-caps mb-2">Personal invitation</div>
                  <h4 className="font-serif text-[26px] leading-[1.2] text-ink mb-1.5">
                    Priya &amp; Arjun invite you
                  </h4>
                  <p className="text-[14px] text-ink-muted">
                    Please RSVP by November 15
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {INVITED_FUNCTIONS.map((fn) => (
                    <li
                      key={fn.name}
                      className="border-standard card-radius p-3.5"
                    >
                      <div className="text-[15px] font-medium text-ink">
                        {fn.name}
                      </div>
                      <div className="text-[13px] text-ink-muted mb-3">
                        {fn.when}
                      </div>
                      <div className="flex gap-2">
                        <span
                          className={`flex-1 text-center text-[13px] py-1.5 rounded-md border ${
                            fn.answer === 'Yes'
                              ? 'bg-accent text-surface border-accent'
                              : 'border-line text-ink-muted'
                          }`}
                        >
                          Yes
                        </span>
                        <span className="flex-1 text-center text-[13px] py-1.5 rounded-md border border-line text-ink-muted">
                          No
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between border-standard card-radius px-3.5 py-3 mb-4">
                  <span className="text-[14px] text-ink">
                    How many are coming?
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-md border border-line flex items-center justify-center text-ink-muted">
                      −
                    </span>
                    <span className="font-serif text-[18px] text-ink w-4 text-center">
                      3
                    </span>
                    <span className="w-7 h-7 rounded-md border border-line flex items-center justify-center text-ink-muted">
                      +
                    </span>
                  </div>
                </div>

                <div className="btn-primary btn-block">Confirm Attendance</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 order-1 lg:order-2">
            <h2 className="h2-title text-ink mb-6">
              Your bua is not going to create an account.
            </h2>
            <p className="body-large">
              And she doesn&rsquo;t have to. Every guest gets a link. They tap
              it, see the functions they&rsquo;re invited to, say yes or no, and
              tell you how many are coming. Any phone, no app, no password.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
