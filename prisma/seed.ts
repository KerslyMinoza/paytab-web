import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash('password123', 12);

  const kersly = await prisma.user.upsert({
    where: { email: 'kersly@example.com' },
    update: {},
    create: { name: 'Kersly', email: 'kersly@example.com', passwordHash: hash, emailVerified: true },
  });

  const erick = await prisma.user.upsert({
    where: { email: 'erick@example.com' },
    update: {},
    create: { name: 'Erick', email: 'erick@example.com', passwordHash: hash, emailVerified: true },
  });

  const arnie = await prisma.user.upsert({
    where: { email: 'arnie@example.com' },
    update: {},
    create: { name: 'Arnie', email: 'arnie@example.com', passwordHash: hash, emailVerified: true },
  });

  const sheila = await prisma.user.upsert({
    where: { email: 'sheila@example.com' },
    update: {},
    create: { name: 'Sheila', email: 'sheila@example.com', passwordHash: hash, emailVerified: true },
  });

  const friendPairs: [string, string][] = [
    [kersly.id, erick.id],
    [kersly.id, arnie.id],
    [kersly.id, sheila.id],
  ];

  for (const [a, b] of friendPairs) {
    await prisma.friendship.upsert({
      where: { userId_friendId: { userId: a, friendId: b } },
      update: {},
      create: { userId: a, friendId: b, status: 'ACCEPTED' },
    });
    await prisma.friendship.upsert({
      where: { userId_friendId: { userId: b, friendId: a } },
      update: {},
      create: { userId: b, friendId: a, status: 'ACCEPTED' },
    });
  }

  const group = await prisma.group.create({
    data: {
      name: 'The Dales Camping',
      createdBy: kersly.id,
      members: {
        create: [
          { userId: kersly.id, role: 'ADMIN' },
          { userId: erick.id, role: 'MEMBER' },
          { userId: arnie.id, role: 'MEMBER' },
          { userId: sheila.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const expenses = [
    {
      desc: 'coffee',
      amount: 500,
      paidBy: kersly.id,
      splitWith: [kersly.id, erick.id],
    },
    {
      desc: 'hot choco',
      amount: 400,
      paidBy: erick.id,
      splitWith: [kersly.id, erick.id, arnie.id],
    },
    {
      desc: 'Utan',
      amount: 100,
      paidBy: sheila.id,
      splitWith: [kersly.id, sheila.id, arnie.id],
    },
    {
      desc: 'Dinner',
      amount: 500,
      paidBy: kersly.id,
      splitWith: [kersly.id, sheila.id, arnie.id, erick.id],
    },
  ];

  for (const exp of expenses) {
    const perPerson = parseFloat(
      (exp.amount / exp.splitWith.length).toFixed(2),
    );
    await prisma.expense.create({
      data: {
        groupId: group.id,
        description: exp.desc,
        amount: exp.amount,
        paidById: exp.paidBy,
        date: new Date('2025-03-06'),
        splits: {
          create: exp.splitWith.map((userId) => ({
            userId,
            amount: perPerson,
          })),
        },
      },
    });
  }

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
