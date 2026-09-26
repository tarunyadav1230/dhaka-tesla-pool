/**
 * API Integration Tests
 *
 * Tests against a real (test) database to verify:
 * - Auth flow (register/login)
 * - Ride request creation and ownership enforcement
 * - Capacity enforcement (Bullet has 3 seats)
 * - Invalid state transitions rejected
 * - Cancellation rules
 * - Users cannot see/modify other users' rides
 */

import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/prisma';

// ── Test Helpers ──────────────────────────────────────────────────────────────

async function cleanDb() {
  // Delete in dependency order
  await prisma.rideStatusEvent.deleteMany();
  await prisma.poolMembership.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.tesla.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
}

async function createTestDriver(suffix = '') {
  const res = await request(app).post('/api/auth/register').send({
    name: `Jashim${suffix}`,
    email: `jashim${suffix}@test.dhaka`,
    password: 'Bullet@2024',
    phone: `+880171100000${suffix || '1'}`,
    role: 'DRIVER',
  });
  return { token: res.body.data.token, user: res.body.data.user };
}

async function createTestPassenger(name: string, email: string, phone: string) {
  const res = await request(app).post('/api/auth/register').send({
    name,
    email,
    password: 'Password@2024',
    phone,
    role: 'PASSENGER',
  });
  return { token: res.body.data.token, user: res.body.data.user };
}

async function createTesla(driverToken: string, capacity = 3) {
  const driver = await prisma.user.findFirst({ where: { role: 'DRIVER' } });
  return prisma.tesla.create({
    data: {
      driverId: driver!.id,
      name: 'Bullet',
      licensePlate: `DHAKA-T-${Date.now()}`,
      capacity,
      isOnline: true,
    },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
  await prisma.$disconnect();
});

// ── Auth Tests ────────────────────────────────────────────────────────────────
describe('Auth', () => {
  it('registers a passenger successfully', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Nusrat Jahan',
      email: 'nusrat@test.dhaka',
      password: 'Nusrat@2024',
      phone: '+8801711000002',
      role: 'PASSENGER',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('PASSENGER');
  });

  it('rejects duplicate email', async () => {
    await createTestPassenger('Nusrat', 'nusrat@test.dhaka', '+8801711000002');
    const res = await request(app).post('/api/auth/register').send({
      name: 'Nusrat2',
      email: 'nusrat@test.dhaka', // duplicate
      password: 'Nusrat@2024',
      phone: '+8801711000099',
      role: 'PASSENGER',
    });
    expect(res.status).toBe(409);
  });

  it('returns 401 for wrong password', async () => {
    await createTestPassenger('Nusrat', 'nusrat@test.dhaka', '+8801711000002');
    const res = await request(app).post('/api/auth/login').send({
      email: 'nusrat@test.dhaka',
      password: 'wrong',
    });
    expect(res.status).toBe(401);
  });

  it('returns token and user on successful login', async () => {
    await createTestPassenger('Nusrat', 'nusrat@test.dhaka', '+8801711000002');
    const res = await request(app).post('/api/auth/login').send({
      email: 'nusrat@test.dhaka',
      password: 'Password@2024',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });
});

// ── Ride Request Tests ────────────────────────────────────────────────────────
describe('Ride Requests', () => {
  it('creates a ride request with estimated fare', async () => {
    const { token } = await createTestPassenger('Nusrat', 'nusrat@test.dhaka', '+8801711000002');
    const res = await request(app)
      .post('/api/rides/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ pickupArea: 'Banani', dropoffArea: 'Mohakhali' });

    expect(res.status).toBe(201);
    expect(res.body.data.rideRequest.status).toBe('REQUESTED');
    expect(res.body.data.rideRequest.estimatedFarePaisa).toBeGreaterThan(0);
  });

  it('rejects same pickup and dropoff', async () => {
    const { token } = await createTestPassenger('Nusrat', 'nusrat@test.dhaka', '+8801711000002');
    const res = await request(app)
      .post('/api/rides/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ pickupArea: 'Banani', dropoffArea: 'Banani' });
    expect(res.status).toBe(400);
  });

  it('prevents a passenger from having two active rides', async () => {
    const { token } = await createTestPassenger('Nusrat', 'nusrat@test.dhaka', '+8801711000002');
    await request(app)
      .post('/api/rides/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ pickupArea: 'Banani', dropoffArea: 'Mohakhali' });

    const res = await request(app)
      .post('/api/rides/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ pickupArea: 'Banani', dropoffArea: 'Gulshan' });
    expect(res.status).toBe(409);
  });

  it('enforces ownership: passenger cannot view another passenger\'s ride', async () => {
    const nusrat = await createTestPassenger('Nusrat', 'nusrat@test.dhaka', '+8801711000002');
    const rafiq = await createTestPassenger('Rafiq', 'rafiq@test.dhaka', '+8801711000003');

    // Nusrat creates a ride
    const rideRes = await request(app)
      .post('/api/rides/request')
      .set('Authorization', `Bearer ${nusrat.token}`)
      .send({ pickupArea: 'Banani', dropoffArea: 'Mohakhali' });
    const rideId = rideRes.body.data.rideRequest.id;

    // Rafiq tries to view it
    const res = await request(app)
      .get(`/api/rides/${rideId}`)
      .set('Authorization', `Bearer ${rafiq.token}`);
    expect(res.status).toBe(403);
  });

  it('allows cancellation in REQUESTED status', async () => {
    const { token } = await createTestPassenger('Nusrat', 'nusrat@test.dhaka', '+8801711000002');
    const rideRes = await request(app)
      .post('/api/rides/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ pickupArea: 'Banani', dropoffArea: 'Mohakhali' });
    const rideId = rideRes.body.data.rideRequest.id;

    const cancelRes = await request(app)
      .post(`/api/rides/${rideId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Changed plans' });
    expect(cancelRes.status).toBe(200);
  });

  it('blocks cancellation in IN_PROGRESS status', async () => {
    // Create a ride in IN_PROGRESS by directly setting DB status
    const { token, user } = await createTestPassenger('Nusrat', 'nusrat@test.dhaka', '+8801711000002');
    const rideRes = await request(app)
      .post('/api/rides/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ pickupArea: 'Banani', dropoffArea: 'Mohakhali' });
    const rideId = rideRes.body.data.rideRequest.id;

    // Force status to IN_PROGRESS
    await prisma.rideRequest.update({ where: { id: rideId }, data: { status: 'IN_PROGRESS' } });

    const cancelRes = await request(app)
      .post(`/api/rides/${rideId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(cancelRes.status).toBe(409);
  });
});

// ── Driver / Pool Capacity Tests ──────────────────────────────────────────────
describe('Pool Capacity Enforcement', () => {
  it('rejects acceptance when total seats exceed Bullet\'s capacity', async () => {
    const driver = await createTestDriver();
    await createTesla(driver.token);

    // Create 4 ride requests (each 1 seat), but Bullet only has 3
    const passengers = await Promise.all([
      createTestPassenger('P1', 'p1@test.dhaka', '+8801711000011'),
      createTestPassenger('P2', 'p2@test.dhaka', '+8801711000012'),
      createTestPassenger('P3', 'p3@test.dhaka', '+8801711000013'),
      createTestPassenger('P4', 'p4@test.dhaka', '+8801711000014'),
    ]);

    const rideIds: string[] = [];
    for (const p of passengers) {
      const r = await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${p.token}`)
        .send({ pickupArea: 'Banani', dropoffArea: 'Gulshan' });
      rideIds.push(r.body.data.rideRequest.id);
    }

    // Try to accept all 4 (exceeds capacity of 3)
    const res = await request(app)
      .post('/api/driver/pools/accept')
      .set('Authorization', `Bearer ${driver.token}`)
      .send({ rideRequestIds: rideIds });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('capacity');
  });

  it('rejects invalid pool status transition', async () => {
    const driver = await createTestDriver();
    const tesla = await createTesla(driver.token);

    // Create a pool directly in MATCHED status
    const pool = await prisma.pool.create({
      data: { teslaId: tesla.id, status: 'MATCHED', occupiedSeats: 1 },
    });

    // Try to jump from MATCHED to COMPLETED (invalid)
    const res = await request(app)
      .patch(`/api/driver/pools/${pool.id}/status`)
      .set('Authorization', `Bearer ${driver.token}`)
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Invalid transition');
  });

  it('blocks a passenger from managing another passenger\'s ride', async () => {
    const nusrat = await createTestPassenger('Nusrat', 'nusrat@test.dhaka', '+8801711000002');
    const shirin = await createTestPassenger('Shirin', 'shirin@test.dhaka', '+8801711000004');

    const rideRes = await request(app)
      .post('/api/rides/request')
      .set('Authorization', `Bearer ${nusrat.token}`)
      .send({ pickupArea: 'Banani', dropoffArea: 'Mohakhali' });
    const rideId = rideRes.body.data.rideRequest.id;

    // Shirin tries to cancel Nusrat's ride
    const cancelRes = await request(app)
      .post(`/api/rides/${rideId}/cancel`)
      .set('Authorization', `Bearer ${shirin.token}`)
      .send({});
    expect(cancelRes.status).toBe(403);
  });

  it('driver cannot access rides while offline', async () => {
    const driver = await createTestDriver();
    // Tesla is offline by default in createTesla mock, need to create it offline
    await prisma.tesla.create({
      data: {
        driverId: driver.user.id,
        name: 'Bullet',
        licensePlate: `DHAKA-T-OFFLINE`,
        capacity: 3,
        isOnline: false,
      },
    });

    const res = await request(app)
      .get('/api/driver/requests')
      .set('Authorization', `Bearer ${driver.token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('online');
  });
});
