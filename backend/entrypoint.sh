#!/bin/sh
set -e

echo "⏳ Running database migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  
  const jashim = await prisma.user.upsert({
    where: { email: 'jashim@teslapool.dhaka' },
    update: {},
    create: {
      name: 'Jashim Uddin',
      email: 'jashim@teslapool.dhaka',
      passwordHash: hash('Bullet@2024'),
      phone: '+8801711000001',
      role: 'DRIVER',
      walletBalancePaisa: 500000,
    },
  });

  await prisma.user.upsert({ where: { email: 'nusrat@teslapool.dhaka' }, update: {}, create: { name: 'Nusrat Jahan', email: 'nusrat@teslapool.dhaka', passwordHash: hash('Nusrat@2024'), phone: '+8801711000002', role: 'PASSENGER', walletBalancePaisa: 100000 } });
  await prisma.user.upsert({ where: { email: 'rafiq@teslapool.dhaka' }, update: {}, create: { name: 'Rafiq Islam', email: 'rafiq@teslapool.dhaka', passwordHash: hash('Rafiq@2024'), phone: '+8801711000003', role: 'PASSENGER', walletBalancePaisa: 75000 } });
  await prisma.user.upsert({ where: { email: 'shirin@teslapool.dhaka' }, update: {}, create: { name: 'Shirin Akter', email: 'shirin@teslapool.dhaka', passwordHash: hash('Shirin@2024'), phone: '+8801711000004', role: 'PASSENGER', walletBalancePaisa: 50000 } });

  await prisma.tesla.upsert({
    where: { licensePlate: 'DHAKA-T-BULLET' },
    update: {},
    create: { driverId: jashim.id, name: 'Bullet', licensePlate: 'DHAKA-T-BULLET', capacity: 3, isOnline: false },
  });

  console.log('Seed complete');
}

seed().catch(console.error).finally(() => prisma.\$disconnect());
"

echo "🚀 Starting API server..."
node dist/index.js
