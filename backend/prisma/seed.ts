/**
 * Prisma Seed Script – Dhaka Tesla Pool
 *
 * Cast:
 *   Jashim   – Driver, owns Bullet (3-seat Tesla)
 *   Nusrat   – Passenger, rides Banani → Mohakhali
 *   Rafiq    – Passenger, rides Banani → Gulshan 1
 *   Shirin   – Passenger (the edge-case last-seat challenger)
 */

import { PrismaClient, Role, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Dhaka Tesla Pool database...');

  // ── Hash passwords ──────────────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // ── Create Users ────────────────────────────────────────────────────────────
  const jashim = await prisma.user.upsert({
    where: { email: 'jashim@teslapool.dhaka' },
    update: {},
    create: {
      name: 'Jashim Uddin',
      email: 'jashim@teslapool.dhaka',
      passwordHash: hash('Bullet@2024'),
      phone: '+8801711000001',
      role: Role.DRIVER,
      walletBalancePaisa: 500000, // 5000 BDT
    },
  });

  const nusrat = await prisma.user.upsert({
    where: { email: 'nusrat@teslapool.dhaka' },
    update: {},
    create: {
      name: 'Nusrat Jahan',
      email: 'nusrat@teslapool.dhaka',
      passwordHash: hash('Nusrat@2024'),
      phone: '+8801711000002',
      role: Role.PASSENGER,
      walletBalancePaisa: 100000, // 1000 BDT
    },
  });

  const rafiq = await prisma.user.upsert({
    where: { email: 'rafiq@teslapool.dhaka' },
    update: {},
    create: {
      name: 'Rafiq Islam',
      email: 'rafiq@teslapool.dhaka',
      passwordHash: hash('Rafiq@2024'),
      phone: '+8801711000003',
      role: Role.PASSENGER,
      walletBalancePaisa: 75000, // 750 BDT
    },
  });

  const shirin = await prisma.user.upsert({
    where: { email: 'shirin@teslapool.dhaka' },
    update: {},
    create: {
      name: 'Shirin Akter',
      email: 'shirin@teslapool.dhaka',
      passwordHash: hash('Shirin@2024'),
      phone: '+8801711000004',
      role: Role.PASSENGER,
      walletBalancePaisa: 50000, // 500 BDT
    },
  });

  console.log(`✅ Users: Jashim (${jashim.id.slice(0, 8)}), Nusrat (${nusrat.id.slice(0, 8)}), Rafiq (${rafiq.id.slice(0, 8)}), Shirin (${shirin.id.slice(0, 8)})`);

  // ── Create Bullet (Jashim's Tesla) ─────────────────────────────────────────
  const bullet = await prisma.tesla.upsert({
    where: { licensePlate: 'DHAKA-T-BULLET' },
    update: {},
    create: {
      driverId: jashim.id,
      name: 'Bullet',
      licensePlate: 'DHAKA-T-BULLET',
      capacity: 3,
      isOnline: false,
    },
  });

  console.log(`✅ Tesla: Bullet (${bullet.id.slice(0, 8)}) – 3-seat capacity, owned by Jashim`);
  console.log('');
  console.log('🎭 Demo credentials:');
  console.log('   Driver:     jashim@teslapool.dhaka  / Bullet@2024');
  console.log('   Passenger:  nusrat@teslapool.dhaka  / Nusrat@2024');
  console.log('   Passenger:  rafiq@teslapool.dhaka   / Rafiq@2024');
  console.log('   Passenger:  shirin@teslapool.dhaka  / Shirin@2024');
  console.log('');
  console.log('🏁 Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
