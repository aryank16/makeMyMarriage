# MakeMyMarriage

Wedding planning for Indian weddings: multi-event guest coordination at the core,
with vendors, budget, tasks, photo sharing and a public wedding site around it.

Full product spec and data model live in the project doc.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Postgres on Supabase via Prisma 7 · Vitest

## Getting started

The database is Supabase (managed Postgres). Nothing runs locally.

1. Create a project at [supabase.com](https://supabase.com) — pick the Mumbai or
   Singapore region for latency from India.
2. **Project Settings → Database → Connection string.** Copy both the
   **Transaction pooler** (port 6543) and **Direct connection** (port 5432) strings.
3. `cp .env.example .env` and paste them in as `DATABASE_URL` and `DIRECT_URL`.

```bash
npm install
npm run db:migrate       # apply migrations
npm run db:seed          # demo wedding: 5 events, 39 guests, 164 RSVPs
npm run dev
```

**The two connection strings are not interchangeable.** The pooler runs
PgBouncer in transaction mode, which breaks Prisma migrations and prepared
statements. The app uses the pooler; migrations use the direct connection.

## Scripts

| Command | Does |
| --- | --- |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Reset and reseed demo data |
| `npm run db:reset` | Drop, re-migrate and reseed |
| `npm run db:studio` | Prisma Studio |
| `npm test` | Vitest, against the `makemymarriage_test` database |
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

Tests run against a **separate database** (`makemymarriage_test`), created once with
`CREATE DATABASE makemymarriage_test;` on the same Supabase project. Copy
`.env.test.example` to `.env.test` and point it there.

> **Why a separate database and not a separate schema.** Prisma hard-qualifies
> table names with the datasource schema when it generates the client, so model
> queries ignore `search_path`. Both `?schema=` and `-c search_path=` change raw
> SQL while leaving `deleteMany()` pointed at `public` — so the suite truncates
> your development data while appearing to be isolated. `tests/helpers.ts`
> refuses to run unless the database name contains "test". Do not remove that guard.

`tests/authorization.test.ts` covers tenant isolation, module scopes, budget side
scoping and scope integrity. These are the tests that matter: they have been
mutation-checked, so breaking the permission check fails 6 of them and letting
non-members through fails 4.

## Not yet built

Authentication is not wired up — `requirePermission` takes a `userId` and the
session layer that supplies it is the next task. Supabase Auth with phone OTP is
the intended provider; see the spec.

## Viewing the data

Three options, in increasing order of effort:

- **Supabase dashboard** — the built-in table editor, nothing to install.
- **Prisma Studio** — `npm run db:studio`, opens a table browser locally.
- **TablePlus** — `brew install --cask tableplus`, a native macOS app. The
  closest equivalent to MongoDB Compass.
