/**
 * Creates and deletes pre-confirmed test accounts, for testing sign-in and
 * sign-out without email.
 *
 * The hosted project has "Confirm email" switched on, which is correct for
 * real users but makes the auth flows untestable: a made-up address never
 * receives the link, and Supabase's built-in mailer allows only about two
 * messages an hour for the whole project. This writes the row GoTrue would
 * have written once the link was clicked — password hashed with the same
 * bcrypt that GoTrue uses, email_confirmed_at already set — so no mail is
 * ever sent.
 *
 * It is a testing tool, not a seeding tool. The TEST_DOMAIN guard below is
 * what keeps it from ever touching a real account, so do not relax it.
 *
 *   npm run test:user -- create  qa@test.local 'Testflow1!' 'QA Tester'
 *   npm run test:user -- delete  qa@test.local
 *   npm run test:user -- list
 */
// Must come before the db import: src/lib/db reads DATABASE_URL at module
// load. Same approach as prisma.config.ts, so this needs no dotenv-cli
// wrapper in package.json.
import 'dotenv/config';
import { prisma } from '../src/lib/db';

/** Non-deliverable by design (RFC 6762 reserves .local for mDNS). */
const TEST_DOMAIN = '@test.local';

function assertTestAddress(email: string) {
  if (!email.toLowerCase().endsWith(TEST_DOMAIN)) {
    throw new Error(
      `Refusing to touch "${email}": this tool only handles ${TEST_DOMAIN} ` +
        'addresses, so it can never alter or delete a real account.',
    );
  }
}

async function create(email: string, password: string, name: string) {
  assertTestAddress(email);

  const existing = await prisma.$queryRaw<{ id: string }[]>`
    select id::text from auth.users where email = ${email}
  `;
  if (existing.length > 0) {
    console.log(`already exists: ${email}`);
    return;
  }

  // One transaction: a user without its identity row cannot sign in, and
  // would have to be cleaned up by hand.
  const [created] = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        -- GoTrue scans these into non-nullable Go strings. Leaving them NULL
        -- makes every sign-in for this account fail with a 500,
        -- "Database error querying schema", which looks nothing like the
        -- actual cause. They must be empty strings, not NULL.
        confirmation_token, recovery_token, email_change_token_new,
        email_change, email_change_token_current, phone_change,
        phone_change_token, reauthentication_token
      ) values (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
        'authenticated', 'authenticated', ${email},
        crypt(${password}, gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', ${name}::text),
        '', '', '', '', '', '', '', ''
      )
      returning id::text
    `;
    const id = rows[0].id;

    await tx.$executeRaw`
      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), ${id}::uuid,
        jsonb_build_object('sub', ${id}::text, 'email', ${email}::text),
        'email', ${email}, now(), now(), now()
      )
    `;

    return rows;
  });

  console.log(`created and confirmed: ${email}  (auth id ${created.id})`);
  console.log('sign in with it directly — no confirmation email is sent.');
}

async function remove(email: string) {
  assertTestAddress(email);

  const ours = await prisma.user.findUnique({ where: { email } });

  /* Weddings first. Wedding.createdById has no onDelete, so Prisma defaults
   * to Restrict and deleting the user fails outright — which is the normal
   * case, since the obvious way to test is sign up, onboard, create a
   * wedding. Everything hanging off a wedding cascades from the wedding. */
  let weddings = 0;
  if (ours) {
    const created = await prisma.wedding.findMany({
      where: { createdById: ours.id },
      select: { id: true },
    });
    for (const wedding of created) {
      await prisma.wedding.delete({ where: { id: wedding.id } });
    }
    weddings = created.length;
  }

  // Then our row: it references nothing in auth, but leaving it behind would
  // let a later account with the same address silently inherit it.
  const appRows = await prisma.user.deleteMany({ where: { email } });
  const authRows = await prisma.$executeRaw`delete from auth.users where email = ${email}`;

  console.log(
    `deleted ${authRows} auth user(s), ${appRows.count} app user row(s) ` +
      `and ${weddings} wedding(s) for ${email}`,
  );
}

async function list() {
  const rows = await prisma.$queryRaw<{ email: string; confirmed: string }[]>`
    select email, coalesce(email_confirmed_at::text, 'NOT CONFIRMED') as confirmed
      from auth.users
     where email like ${'%' + TEST_DOMAIN}
     order by created_at
  `;
  if (rows.length === 0) {
    console.log(`no ${TEST_DOMAIN} accounts`);
    return;
  }
  for (const r of rows) console.log(`  ${r.email}  confirmed=${r.confirmed}`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case 'create': {
      const [email, password, name] = rest;
      if (!email || !password) {
        throw new Error("usage: create <email@test.local> <password> [name]");
      }
      await create(email, password, name ?? 'Test User');
      break;
    }
    case 'delete': {
      const [email] = rest;
      if (!email) throw new Error('usage: delete <email@test.local>');
      await remove(email);
      break;
    }
    case 'list':
      await list();
      break;
    default:
      throw new Error('usage: create | delete | list');
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
