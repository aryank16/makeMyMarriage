import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { prisma as defaultPrisma } from '@/lib/db';
import { ROLE_DEFAULTS } from '@/lib/auth/permissions';
import { EVENT_PRESETS, eventDateFrom, presetByKey } from './event-presets';
import { isValidSlug, slugify } from './slug';

export const createWeddingSchema = z.object({
  brideName: z.string().trim().min(1, 'Required').max(80),
  groomName: z.string().trim().min(1, 'Required').max(80),
  weddingDate: z.coerce.date().nullable(),
  primaryCity: z.string().trim().min(1, 'Required').max(80),
  creatorSide: z.enum(['BRIDE', 'GROOM', 'SHARED']),
  eventKeys: z.array(z.string()).default([]),
});

export type CreateWeddingInput = z.infer<typeof createWeddingSchema>;

/** Append -2, -3 ... until the slug is free. */
async function uniqueSlug(base: string, client: PrismaClient): Promise<string> {
  const candidate = isValidSlug(base) ? base : `wedding-${Date.now()}`;
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? candidate : `${candidate}-${n}`;
    const taken = await client.wedding.findUnique({ where: { slug } });
    if (!taken) return slug;
  }
  return `${candidate}-${Date.now()}`;
}

/**
 * Creates the wedding, the creator's OWNER membership, and the selected
 * events — in one transaction, because a wedding without its owner membership
 * is a record nobody can reach.
 */
export async function createWedding(
  userId: string,
  input: CreateWeddingInput,
  client: PrismaClient = defaultPrisma,
) {
  const data = createWeddingSchema.parse(input);
  const slug = await uniqueSlug(slugify(data.brideName, data.groomName), client);

  return client.$transaction(async (tx) => {
    const wedding = await tx.wedding.create({
      data: {
        slug,
        brideName: data.brideName,
        groomName: data.groomName,
        weddingDate: data.weddingDate,
        primaryCity: data.primaryCity,
        createdById: userId,
      },
    });

    await tx.membership.create({
      data: {
        weddingId: wedding.id,
        userId,
        role: 'OWNER',
        side: data.creatorSide,
        permissions: ROLE_DEFAULTS.OWNER,
        acceptedAt: new Date(),
      },
    });

    // Events only get dates if the wedding date is known. Without it they are
    // still created, so the couple can fill dates in later.
    const keys = data.eventKeys.length
      ? data.eventKeys
      : EVENT_PRESETS.filter((p) => p.common).map((p) => p.key);

    const presets = keys
      .map(presetByKey)
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .sort((a, b) => a.offsetDays - b.offsetDays || a.defaultHour - b.defaultHour);

    for (const [i, preset] of presets.entries()) {
      await tx.event.create({
        data: {
          weddingId: wedding.id,
          name: preset.label,
          type: preset.type,
          startAt: data.weddingDate
            ? eventDateFrom(data.weddingDate, preset.offsetDays, preset.defaultHour)
            : new Date(0), // sentinel: "date not set", surfaced in the UI
          hostSide: preset.hostSide,
          venueCity: data.primaryCity,
          sortOrder: i,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        weddingId: wedding.id,
        actorId: userId,
        action: 'wedding.create',
        entityType: 'Wedding',
        entityId: wedding.id,
        after: { slug, events: presets.length },
      },
    });

    return wedding;
  });
}
