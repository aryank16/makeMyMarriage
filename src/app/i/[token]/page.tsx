import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { hasDate } from '@/lib/weddings/event-time';

/**
 * A guest's own invitation. Public: the token in the URL is the credential,
 * which is why it is 32 random bytes and why this page is in PUBLIC_PATHS.
 *
 * This is the one screen in the product that is allowed to look like a
 * wedding invitation. Everywhere else the brief is "serious software, never
 * an invitation website" — but no guest ever sees those screens, and this is
 * the thing their family actually receives. It keeps the palette and the two
 * typefaces so it still belongs to the product; the serenity comes from
 * space and scale rather than ornament.
 *
 * Deliberately read-only for now. Responding is the RSVP work, and a page
 * that shows the functions beats withholding the link until it can take an
 * answer.
 */

export const metadata: Metadata = {
  title: 'Your invitation',
  // Links get forwarded. Nothing about someone's invitation belongs in a
  // search index.
  robots: { index: false, follow: false },
};

const IST = 'Asia/Kolkata';

/** "Thursday 19 November" — no comma, as the design sets it. */
function dayLabel(d: Date) {
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'long', timeZone: IST });
  const day = d.toLocaleDateString('en-IN', { day: 'numeric', timeZone: IST });
  const month = d.toLocaleDateString('en-IN', { month: 'long', timeZone: IST });
  return `${weekday} ${day} ${month}`;
}

function timeLabel(d: Date) {
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: IST,
  });
}

async function findGuest(token: string) {
  // An empty path segment must not reach the query at all.
  if (!token) return null;
  return prisma.guest.findUnique({
    where: { inviteToken: token },
    select: {
      name: true,
      allowedGuests: true,
      wedding: {
        select: {
          brideName: true,
          groomName: true,
          weddingDate: true,
          primaryCity: true,
          events: {
            where: { publicOnWebsite: true },
            orderBy: [{ startAt: 'asc' }, { sortOrder: 'asc' }],
            select: {
              id: true,
              name: true,
              startAt: true,
              venueName: true,
              venueAddress: true,
              venueCity: true,
              venueMapUrl: true,
              dressCode: true,
            },
          },
        },
      },
    },
  });
}

export default async function GuestInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const guest = await findGuest(token);
  if (!guest) notFound();

  const { wedding } = guest;

  return (
    <main className="w-full max-w-[560px] mx-auto flex-1 flex flex-col px-6 sm:px-10 py-16 sm:py-24">
      <header className="text-center mb-8 sm:mb-12">
        <p className="select-none text-[11px] sm:text-[12px] font-medium uppercase tracking-[0.22em] text-accent">
          You are invited
        </p>

        <h1 className="font-serif text-[58px] sm:text-[76px] leading-[0.95] tracking-[-0.01em] text-ink mt-6 sm:mt-8 mb-4">
          {wedding.brideName}{' '}
          {/* The one ornamental moment on the page. Asymmetric margins
              because the glyph is italic: it leans into the groom's name, so
              an even gap reads as a lopsided one. */}
          <span className="font-serif italic text-[1.12em] text-accent inline-block ml-0.5 mr-2">
            &amp;
          </span>{' '}
          {wedding.groomName}
        </h1>

        <p className="text-[14px] sm:text-[15px] tracking-[0.03em] text-ink-muted">
          {wedding.weddingDate
            ? `${wedding.weddingDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: IST,
              })} · ${wedding.primaryCity}`
            : wedding.primaryCity}
        </p>
      </header>

      <section className="my-6 sm:my-10 rounded-[6px] border border-line bg-bone-deep px-6 sm:px-8 py-6 text-center">
        {/* Balanced so the sentence does not leave a one-word last line,
            which is what centred text does on a narrow phone. */}
        <p className="text-pretty text-[15px] sm:text-[16px] leading-[1.65] text-ink [text-wrap:balance]">
          Dear <span className="font-medium">{guest.name}</span>, we would be
          honoured to have you with us.
        </p>
        {guest.allowedGuests > 1 && (
          <p className="mt-2.5 text-[12px] sm:text-[13px] font-light tracking-[0.02em] text-ink-muted">
            This invitation is for {guest.allowedGuests} people.
          </p>
        )}
      </section>

      <div className="my-10 sm:my-14 flex items-center justify-center gap-3">
        <div className="h-px w-12 sm:w-16 bg-line" />
        <div className="h-1.5 w-1.5 rotate-45 border border-accent bg-bone" />
        <div className="h-px w-12 sm:w-16 bg-line" />
      </div>

      <section className="mt-2 mb-16 sm:mb-20 pl-2">
        {wedding.events.length === 0 ? (
          <p className="text-center text-[15px] leading-[1.6] text-ink-muted">
            The schedule is still being finalised. This page will show it as
            soon as it is — keep the link.
          </p>
        ) : (
          <div className="relative">
            {/* The stem stops short at both ends so it reads as a thread
                between the functions rather than a rule down the page. */}
            <div className="absolute left-[5px] top-[14px] bottom-[24px] w-px bg-line" />

            <ol className="space-y-12 sm:space-y-16">
              {wedding.events.map((e) => {
                const place = [e.venueName, e.venueAddress, e.venueCity]
                  .filter(Boolean)
                  .join(', ');

                return (
                  <li key={e.id} className="relative pl-7 sm:pl-8">
                    {/* The ring is the page colour, so the node punches a
                        gap in the stem instead of sitting on top of it. */}
                    <div className="absolute left-0 top-[10px] h-[11px] w-[11px] rotate-45 border border-accent bg-bone shadow-[0_0_0_3px_var(--bone)]" />

                    <h2 className="font-serif text-[26px] sm:text-[28px] leading-none text-ink mb-2">
                      {e.name}
                    </h2>

                    <div className="space-y-1">
                      <p className="text-[14px] sm:text-[15px] text-ink">
                        {hasDate(e.startAt)
                          ? `${dayLabel(e.startAt)} · ${timeLabel(e.startAt)}`
                          : 'Date to be confirmed'}
                      </p>

                      {place && (
                        <p className="flex flex-wrap items-center gap-2 text-[13px] sm:text-[14px] text-ink-muted">
                          <span>{place}</span>
                          {e.venueMapUrl && (
                            <>
                              <span aria-hidden className="select-none text-line">
                                ·
                              </span>
                              <a
                                href={e.venueMapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[12px] sm:text-[13px] font-medium tracking-[0.01em] text-accent underline-offset-2 hover:underline"
                              >
                                Map
                              </a>
                            </>
                          )}
                        </p>
                      )}

                      {e.dressCode && (
                        <p className="pt-0.5 text-[12px] sm:text-[13px] font-light italic text-ink-muted">
                          Dress code: {e.dressCode}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>

      <footer className="mt-auto border-t border-line/60 pt-8 sm:pt-12 text-center">
        <p className="mx-auto max-w-[340px] text-[12px] sm:text-[13px] font-light leading-relaxed text-ink-muted">
          Keep this link — it is yours, and it always shows the latest
          schedule.
        </p>
      </footer>
    </main>
  );
}
