# MakeMyMarriage

Wedding planning for Indian weddings: multi-event guest coordination at the core,
with vendors, budget, tasks, photo sharing and a public wedding site around it.

Full product spec and data model live in the project doc.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Postgres via Prisma 7 · Vitest

## Getting started

```bash
cp .env.example .env     # defaults match docker-compose
npm install
npm run db:up            # Postgres 17 in Docker on :5432
npm run db:migrate       # apply migrations
npm run db:seed          # demo wedding: 5 events, 39 guests, 164 RSVPs
npm run dev
```

## Scripts

| Command | Does |
| --- | --- |
| `npm run db:up` / `db:down` | Start or stop the local Postgres container |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Reset and reseed demo data |
| `npm run db:reset` | Drop, re-migrate and reseed |
| `npm run db:studio` | Prisma Studio |
| `npm test` | Vitest, against `makemymarriage_test` |
| `npm run typecheck` | `tsc --noEmit` |

## The three things to know before changing code

**1. `Rsvp` is the keystone.** One row per `(guestId, eventId)`. A row with status
`PENDING` *is* the invitation — no row means not invited. Head counts, dietary
rollups and reminder targeting all derive from this table. Do not add an
`attending` field to `Guest`.

**2. Authorization goes through one function.** `requirePermission(userId,
weddingId, module, level)` in `src/lib/auth/require-permission.ts`. Every
tenant-scoped query uses the `weddingId` it returns, never one taken from a
request parameter. A non-member gets a 404, not a 403, so wedding ids cannot be
probed.

**3. Permissions are a scope object, not a boolean.** `Membership.permissions`
holds the enforced scope; `Role` only supplies a default bundle. Budget defaults
to own-side-only for every family role — the groom's family must not see the
bride's family's itemised spend unless that side opts in. `visibleBudgetSides()`
is the only correct way to filter budget data by side.

## Tests

`tests/authorization.test.ts` covers tenant isolation, module scopes, budget side
scoping and scope integrity. These are the tests that matter: they have been
mutation-checked, so breaking the permission check fails 6 of them and letting
non-members through fails 4.

## Not yet built

Authentication is not wired up — `requirePermission` takes a `userId` and the
session layer that supplies it is the next task. Supabase Auth with phone OTP is
the intended provider; see the spec.
