import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { linkAuthUser } from '../src/lib/auth/session';
import { makeMembership, makeWedding, prisma, resetDb } from './helpers';

/**
 * Covers the bridge between Supabase auth and our own User table.
 *
 * This is the only code that writes `supabaseId`, and it had never executed
 * against a real database — auth.users was empty, so every User row in
 * development came from the seed with supabaseId NULL.
 */

beforeAll(resetDb);
beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

const identity = (over: Partial<Parameters<typeof linkAuthUser>[0]> = {}) => ({
  id: randomUUID(),
  email: `${randomUUID()}@test.local`,
  ...over,
});

describe('linkAuthUser', () => {
  it('creates a row on first sign-in and records the supabase id', async () => {
    const auth = identity({ name: 'Priya Sharma' });

    const user = await linkAuthUser(auth);

    expect(user.supabaseId).toBe(auth.id);
    expect(user.email).toBe(auth.email);
    expect(user.name).toBe('Priya Sharma');
    expect(await prisma.user.count()).toBe(1);
  });

  it('is idempotent — a second sign-in returns the same row', async () => {
    const auth = identity({ name: 'Priya Sharma' });

    const first = await linkAuthUser(auth);
    const second = await linkAuthUser(auth);

    expect(second.id).toBe(first.id);
    expect(await prisma.user.count()).toBe(1);
  });

  it('claims an invited row by email instead of duplicating it', async () => {
    // An organizer invited before they ever logged in: a User row exists with
    // no supabaseId, and it is already wired into a wedding.
    const invited = await prisma.user.create({
      data: { name: 'Rakesh Mehta', email: 'rakesh@test.local', phone: '+919810000004' },
    });
    const owner = await prisma.user.create({
      data: { name: 'Owner', email: 'owner@test.local' },
    });
    const wedding = await makeWedding(owner.id);
    await makeMembership({ weddingId: wedding.id, userId: invited.id, role: 'PARENT' });

    const auth = identity({ email: 'rakesh@test.local', name: 'Rakesh M' });
    const linked = await linkAuthUser(auth);

    expect(linked.id).toBe(invited.id);
    expect(linked.supabaseId).toBe(auth.id);
    expect(await prisma.user.count()).toBe(2);

    // The membership must still point at the same row, or they lose the wedding.
    const memberships = await prisma.membership.findMany({
      where: { userId: invited.id },
    });
    expect(memberships).toHaveLength(1);
    expect(memberships[0].weddingId).toBe(wedding.id);
  });

  it('keeps the invited row’s existing name rather than overwriting it', async () => {
    await prisma.user.create({
      data: { name: 'Rakesh Mehta', email: 'rakesh@test.local' },
    });

    const linked = await linkAuthUser(
      identity({ email: 'rakesh@test.local', name: 'rakesh' }),
    );

    expect(linked.name).toBe('Rakesh Mehta');
  });

  it('falls back to the email prefix when no name is supplied', async () => {
    const linked = await linkAuthUser({
      id: randomUUID(),
      email: 'nandini@test.local',
    });

    expect(linked.name).toBe('nandini');
  });

  it('treats a blank name as missing', async () => {
    const linked = await linkAuthUser({
      id: randomUUID(),
      email: 'blank@test.local',
      name: '   ',
    });

    expect(linked.name).toBe('blank');
  });

  it('keeps two different identities apart', async () => {
    const a = await linkAuthUser(identity({ name: 'A' }));
    const b = await linkAuthUser(identity({ name: 'B' }));

    expect(a.id).not.toBe(b.id);
    expect(a.supabaseId).not.toBe(b.supabaseId);
    expect(await prisma.user.count()).toBe(2);
  });
});
