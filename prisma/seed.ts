import { randomBytes } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  type DietaryPreference,
  type EventType,
  PrismaClient,
  type Role,
  type RsvpStatus,
  type Side,
} from '@prisma/client';
import { ROLE_DEFAULTS } from '../src/lib/auth/permissions';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const token = () => randomBytes(32).toString('base64url');
const rupees = (n: number) => BigInt(Math.round(n * 100));
const daysFrom = (base: Date, d: number, hour = 18) => {
  const x = new Date(base);
  x.setDate(x.getDate() + d);
  x.setHours(hour, 0, 0, 0);
  return x;
};

async function main() {
  // Order matters: Wedding has a required createdBy relation.
  await prisma.$transaction([
    prisma.rsvp.deleteMany(),
    prisma.guest.deleteMany(),
    prisma.household.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.budgetCategory.deleteMany(),
    prisma.vendorEvent.deleteMany(),
    prisma.vendor.deleteMany(),
    prisma.task.deleteMany(),
    prisma.event.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.wedding.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const people = [
    { key: 'priya', name: 'Priya Sharma', phone: '+919810000001', role: 'OWNER', side: 'BRIDE' },
    { key: 'arjun', name: 'Arjun Mehta', phone: '+919810000002', role: 'COUPLE', side: 'GROOM' },
    { key: 'sunita', name: 'Sunita Sharma', phone: '+919810000003', role: 'PARENT', side: 'BRIDE' },
    { key: 'rakesh', name: 'Rakesh Mehta', phone: '+919810000004', role: 'PARENT', side: 'GROOM' },
    { key: 'neha', name: 'Neha Kapoor', phone: '+919810000005', role: 'PLANNER', side: 'SHARED' },
    { key: 'vikram', name: 'Vikram Sharma', phone: '+919810000006', role: 'COORDINATOR', side: 'BRIDE' },
  ] as const;

  const users = Object.fromEntries(
    await Promise.all(
      people.map(async (p) => [
        p.key,
        await prisma.user.create({
          data: { name: p.name, phone: p.phone, email: `${p.key}@example.com` },
        }),
      ]),
    ),
  );

  const weddingDate = daysFrom(new Date(), 75, 9);

  const wedding = await prisma.wedding.create({
    data: {
      slug: 'priya-arjun',
      brideName: 'Priya',
      groomName: 'Arjun',
      weddingDate,
      primaryCity: 'Jaipur',
      plannedTotal: rupees(2_500_000),
      createdById: users.priya.id,
    },
  });

  for (const p of people) {
    await prisma.membership.create({
      data: {
        weddingId: wedding.id,
        userId: users[p.key].id,
        role: p.role as Role,
        side: p.side as Side,
        permissions: ROLE_DEFAULTS[p.role as Role],
        acceptedAt: new Date(),
      },
    });
  }

  const eventSpecs: {
    name: string;
    type: EventType;
    offset: number;
    host: Side;
    venue: string;
    city: string;
    hour?: number;
  }[] = [
    { name: 'Mehendi', type: 'MEHENDI', offset: -2, host: 'BRIDE', venue: 'Sharma Residence', city: 'Jaipur' },
    { name: 'Haldi', type: 'HALDI', offset: -1, host: 'BRIDE', venue: 'Sharma Residence', city: 'Jaipur', hour: 11 },
    { name: 'Sangeet', type: 'SANGEET', offset: -1, host: 'SHARED', venue: 'Hotel Clarks Amer', city: 'Jaipur' },
    { name: 'Wedding', type: 'WEDDING', offset: 0, host: 'SHARED', venue: 'Narain Niwas Palace', city: 'Jaipur', hour: 9 },
    { name: 'Reception', type: 'RECEPTION', offset: 1, host: 'GROOM', venue: 'Hotel Clarks Amer', city: 'Jaipur' },
  ];

  const events = [];
  for (const [i, e] of eventSpecs.entries()) {
    events.push(
      await prisma.event.create({
        data: {
          weddingId: wedding.id,
          name: e.name,
          type: e.type,
          startAt: daysFrom(weddingDate, e.offset, e.hour ?? 18),
          hostSide: e.host,
          venueName: e.venue,
          venueCity: e.city,
          sortOrder: i,
        },
      }),
    );
  }

  // 20 households, ~60 guests, invited to different combinations of events —
  // the whole point of the data model, so the seed has to exercise it.
  const surnames = [
    'Agarwal', 'Bhatia', 'Chopra', 'Desai', 'Gupta', 'Iyer', 'Jain', 'Khanna',
    'Malhotra', 'Nair', 'Oberoi', 'Patel', 'Rao', 'Saxena', 'Trivedi',
    'Varma', 'Bedi', 'Chandra', 'Dutta', 'Grewal',
  ];
  const diets: DietaryPreference[] = [
    'VEG', 'VEG', 'VEG', 'NON_VEG', 'JAIN', 'NO_ONION_GARLIC', 'VEGAN', 'UNKNOWN',
  ];
  const statuses: RsvpStatus[] = ['YES', 'YES', 'YES', 'NO', 'PENDING', 'PENDING', 'MAYBE'];

  let guestCount = 0;
  let rsvpCount = 0;

  for (const [i, surname] of surnames.entries()) {
    const side: Side = i % 2 === 0 ? 'BRIDE' : 'GROOM';
    const household = await prisma.household.create({
      data: {
        weddingId: wedding.id,
        label: `The ${surname} family`,
        inviteToken: token(),
        city: i % 4 === 0 ? 'Mumbai' : i % 3 === 0 ? 'Delhi' : 'Jaipur',
      },
    });

    const members = (i % 3) + 1; // 1 to 3 people per household
    for (let m = 0; m < members; m++) {
      const guest = await prisma.guest.create({
        data: {
          weddingId: wedding.id,
          householdId: household.id,
          name: `${['Amit', 'Kavita', 'Rohit', 'Meera'][m % 4]} ${surname}`,
          phone: `+9198200${String(10000 + guestCount).slice(-5)}`,
          side,
          isPrimary: m === 0,
          dietary: diets[(i + m) % diets.length],
          relationship: side === 'BRIDE' ? 'Bride side' : 'Groom side',
          tags: i % 5 === 0 ? ['office'] : i % 3 === 0 ? ['college'] : ['relatives'],
        },
      });
      guestCount++;

      // Not everyone is invited to everything — that is the product.
      const invited =
        i % 5 === 0
          ? [events[3], events[4]] // reception-and-wedding only (colleagues)
          : i % 3 === 0
            ? [events[2], events[3], events[4]] // friends
            : events; // close family, everything

      for (const event of invited) {
        const status = statuses[(i + m + event.sortOrder) % statuses.length];
        await prisma.rsvp.create({
          data: {
            weddingId: wedding.id,
            guestId: guest.id,
            eventId: event.id,
            status,
            respondedAt: status === 'PENDING' ? null : new Date(),
          },
        });
        rsvpCount++;
      }
    }
  }

  const categorySpecs = [
    { name: 'Venue', side: 'SHARED', planned: 600_000 },
    { name: 'Catering', side: 'SHARED', planned: 750_000 },
    { name: 'Decor', side: 'BRIDE', planned: 300_000 },
    { name: 'Photography', side: 'SHARED', planned: 250_000 },
    { name: 'Makeup', side: 'BRIDE', planned: 120_000 },
    { name: 'Music and DJ', side: 'GROOM', planned: 150_000 },
    { name: 'Invitations', side: 'SHARED', planned: 80_000 },
  ] as const;

  const categories = Object.fromEntries(
    await Promise.all(
      categorySpecs.map(async (c, i) => [
        c.name,
        await prisma.budgetCategory.create({
          data: {
            weddingId: wedding.id,
            name: c.name,
            side: c.side as Side,
            plannedAmount: rupees(c.planned),
            sortOrder: i,
          },
        }),
      ]),
    ),
  );

  const vendorSpecs = [
    { name: 'Narain Niwas Palace', category: 'VENUE', cat: 'Venue', agreed: 620_000, side: 'SHARED', status: 'BOOKED', paid: 200_000 },
    { name: 'Rajasthani Rasoi Caterers', category: 'CATERING', cat: 'Catering', agreed: 780_000, side: 'SHARED', status: 'BOOKED', paid: 150_000 },
    { name: 'Studio Kiran', category: 'PHOTOGRAPHY', cat: 'Photography', agreed: 265_000, side: 'SHARED', status: 'BOOKED', paid: 100_000 },
    { name: 'Gulmohar Decorators', category: 'DECOR', cat: 'Decor', agreed: 340_000, side: 'BRIDE', status: 'NEGOTIATING', paid: 0 },
    { name: 'Anjali Makeup Artistry', category: 'MAKEUP', cat: 'Makeup', agreed: 110_000, side: 'BRIDE', status: 'BOOKED', paid: 30_000 },
    { name: 'DJ Rohan', category: 'MUSIC', cat: 'Music and DJ', agreed: 140_000, side: 'GROOM', status: 'SHORTLISTED', paid: 0 },
  ] as const;

  for (const v of vendorSpecs) {
    const vendor = await prisma.vendor.create({
      data: {
        weddingId: wedding.id,
        name: v.name,
        category: v.category,
        side: v.side as Side,
        status: v.status,
        agreedTotal: rupees(v.agreed),
        contactPerson: 'Front desk',
        phone: '+919830000000',
      },
    });

    if (v.paid > 0) {
      await prisma.payment.create({
        data: {
          weddingId: wedding.id,
          categoryId: categories[v.cat].id,
          vendorId: vendor.id,
          description: `Advance to ${v.name}`,
          amount: rupees(v.paid),
          side: v.side as Side,
          status: 'PAID',
          paidAt: daysFrom(new Date(), -20),
          method: 'BANK_TRANSFER',
          paidByUserId: v.side === 'GROOM' ? users.rakesh.id : users.sunita.id,
        },
      });
    }

    // One upcoming balance per booked vendor, so the due-payments alert has data.
    if (v.status === 'BOOKED') {
      await prisma.payment.create({
        data: {
          weddingId: wedding.id,
          categoryId: categories[v.cat].id,
          vendorId: vendor.id,
          description: `Balance to ${v.name}`,
          amount: rupees(v.agreed - v.paid),
          side: v.side as Side,
          status: 'DUE',
          dueDate: daysFrom(weddingDate, -7),
        },
      });
    }
  }

  const taskSpecs = [
    { title: 'Finalise and print invitations', offset: -60, status: 'DONE' },
    { title: 'Send invitations to outstation guests', offset: -45, status: 'IN_PROGRESS' },
    { title: 'Confirm catering menu and head count', offset: -30, status: 'TODO' },
    { title: 'Confirm pandit and muhurat timings', offset: -15, status: 'TODO' },
    { title: 'Share run sheet with all vendors', offset: -7, status: 'TODO' },
    { title: 'Confirm final head counts with the caterer', offset: -2, status: 'TODO' },
  ] as const;

  for (const t of taskSpecs) {
    await prisma.task.create({
      data: {
        weddingId: wedding.id,
        title: t.title,
        offsetDays: t.offset,
        dueDate: daysFrom(weddingDate, t.offset),
        status: t.status,
        templateKey: t.title.toLowerCase().replace(/\s+/g, '-'),
        completedAt: t.status === 'DONE' ? daysFrom(new Date(), -5) : null,
        assignees: { connect: [{ id: users.priya.id }] },
      },
    });
  }

  // A second, unrelated wedding. Its only job is to make cross-tenant leaks
  // visible in development, not just in the test suite.
  const other = await prisma.user.create({
    data: { name: 'Divya Reddy', phone: '+919899999999', email: 'divya@example.com' },
  });
  const otherWedding = await prisma.wedding.create({
    data: {
      slug: 'divya-karthik',
      brideName: 'Divya',
      groomName: 'Karthik',
      weddingDate: daysFrom(new Date(), 120, 9),
      primaryCity: 'Hyderabad',
      createdById: other.id,
    },
  });
  await prisma.membership.create({
    data: {
      weddingId: otherWedding.id,
      userId: other.id,
      role: 'OWNER',
      side: 'BRIDE',
      permissions: ROLE_DEFAULTS.OWNER,
      acceptedAt: new Date(),
    },
  });
  const otherHousehold = await prisma.household.create({
    data: { weddingId: otherWedding.id, label: 'The Reddy family', inviteToken: token() },
  });
  await prisma.guest.create({
    data: {
      weddingId: otherWedding.id,
      householdId: otherHousehold.id,
      name: 'Lakshmi Reddy',
      side: 'BRIDE',
      isPrimary: true,
    },
  });

  console.log(
    [
      '',
      'Seeded:',
      `  wedding        ${wedding.slug} (${wedding.id})`,
      `  organizers     ${people.length}`,
      `  events         ${events.length}`,
      `  households     ${surnames.length}`,
      `  guests         ${guestCount}`,
      `  rsvps          ${rsvpCount}`,
      `  vendors        ${vendorSpecs.length}`,
      `  categories     ${categorySpecs.length}`,
      `  tasks          ${taskSpecs.length}`,
      `  second wedding ${otherWedding.slug} (for cross-tenant checks)`,
      '',
    ].join('\n'),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
