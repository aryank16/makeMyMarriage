import { inviteAction } from '@/app/dashboard/[weddingId]/members/actions';

/**
 * Two roles, and the only difference between them is people. Both run the
 * whole wedding — guests, events, vendors, the expense log, photos, tasks —
 * because a planning team that cannot edit the plan is not a team.
 */
export const ROLE_SUMMARY: Record<string, string> = {
  ADMIN: 'Everything, including inviting and removing organizers',
  MANAGER: 'Everything except managing organizers',
};

/**
 * The invite form, shared by the Organizers tab and the overview shortcut.
 *
 * One component rather than two copies: the role list, the side default and
 * the wording about what each role can see are access-control decisions, and
 * two versions of that would eventually disagree.
 *
 * `returnTo` is where the server action sends the browser afterwards, so the
 * shortcut returns you to the overview instead of dumping you on a tab you
 * were not on. It is validated server-side before being used.
 */
export default function InviteOrganizerForm({
  weddingId,
  assignableRoles,
  defaultSide,
  mailerReady,
  returnTo,
  chrome = true,
}: {
  weddingId: string;
  assignableRoles: string[];
  defaultSide: string;
  mailerReady: boolean;
  returnTo: string;
  /** False inside a dialog, which supplies its own surface. */
  chrome?: boolean;
}) {
  return (
    <form
      action={inviteAction}
      className={
        chrome
          ? 'bg-surface border-standard card-radius p-5 sm:p-6 space-y-5'
          : 'space-y-5'
      }
    >
      <input type="hidden" name="weddingId" value={weddingId} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <div>
        <label
          htmlFor="email"
          className="block text-[14px] font-medium text-ink mb-2"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="priya@example.com"
          className="input-field"
        />
        <p className="mt-2 text-[13px] text-ink-muted">
          They must sign in with this exact address for the invitation to reach
          them.
        </p>
      </div>

      <div>
        <label
          htmlFor="name"
          className="block text-[14px] font-medium text-ink mb-2"
        >
          Name <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="off"
          placeholder="Priya Sharma"
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="role"
            className="block text-[14px] font-medium text-ink mb-2"
          >
            Role
          </label>
          <select id="role" name="role" defaultValue="MANAGER" className="input-field">
            {assignableRoles.map((role) => (
              <option key={role} value={role}>
                {role.charAt(0) + role.slice(1).toLowerCase()} &mdash;{' '}
                {ROLE_SUMMARY[role]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="side"
            className="block text-[14px] font-medium text-ink mb-2"
          >
            Side
          </label>
          <select
            id="side"
            name="side"
            defaultValue={defaultSide}
            className="input-field"
          >
            <option value="BRIDE">Bride&apos;s side</option>
            <option value="GROOM">Groom&apos;s side</option>
            <option value="SHARED">Both</option>
          </select>
        </div>
      </div>

      <p className="text-[13px] leading-[1.6] text-ink-muted">
        Both roles see the whole wedding, including the full expense log. Side
        records which family they belong to; it does not restrict what they can
        open. Only an admin can invite or remove other organizers.
      </p>

      <button type="submit" className="btn-primary btn-block">
        {mailerReady ? 'Send invitation' : 'Add organizer'}
      </button>

      {!mailerReady && (
        <p className="text-[13px] leading-[1.6] text-ink-muted">
          Email delivery is not configured, so nothing will be sent. The person
          still gets the invitation the moment they sign in with that address.
        </p>
      )}
    </form>
  );
}
