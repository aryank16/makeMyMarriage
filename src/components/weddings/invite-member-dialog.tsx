'use client';

import { useRef, type ReactNode } from 'react';

/**
 * "Invite a member" shortcut: a button that opens the invite form in a modal.
 *
 * Built on the native <dialog>, so focus trapping, Esc to close, inertness of
 * the page behind and the backdrop all come from the browser rather than
 * being reimplemented badly. The form inside is the same component the
 * Organizers tab renders, and it posts to a server action — submitting
 * navigates, which tears the dialog down on its own.
 */
export default function InviteMemberDialog({
  children,
  label = 'Invite a member',
}: {
  children: ReactNode;
  label?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="btn-primary"
      >
        {label}
      </button>

      <dialog
        ref={ref}
        // Clicking the backdrop closes it. The check is on the dialog itself
        // because the backdrop is not a separate element — a click landing on
        // the dialog's own box is outside the content card.
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="m-auto w-[calc(100vw-2rem)] max-w-[560px] bg-transparent p-0 backdrop:bg-ink/40"
      >
        <div className="bg-surface border-standard card-radius p-6 sm:p-8 text-left">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="font-serif text-[24px] leading-tight text-ink">
                Invite a member
              </h2>
              <p className="mt-1 text-[14px] text-ink-muted">
                They will be able to help plan this wedding.
              </p>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Close"
              className="shrink-0 -mt-1 -mr-1 p-2 text-ink-muted hover:text-ink transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {children}
        </div>
      </dialog>
    </>
  );
}
