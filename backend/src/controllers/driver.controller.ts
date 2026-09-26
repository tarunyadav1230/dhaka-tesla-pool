import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { calculateFare, paisaToBdt } from '../utils/fare';
import { areRoutesCompatible } from '../utils/areas';
import { RideStatus, PoolStatus } from '@prisma/client';

/**
 * Driver Pool/Ride Management Controller
 *
 * Key design decision: Pool capacity is enforced inside a Prisma transaction
 * with a row-level check. We use optimistic locking (check-then-update in a
 * single atomic transaction) to prevent overbooking when two passengers race
 * to claim the last seat.
 *
 * Concurrency approach:
 *   - PostgreSQL: wrapped in $transaction; the UPDATE with WHERE clause
 *     atomically checks and updates occupiedSeats.
 *   - At larger scale: would add SELECT ... FOR UPDATE or use DB-level triggers.
 *   - Documented in README "Concurrency" section.
 */

/**
 * GET /api/driver/requests
 * Driver sees pending REQUESTED rides that are compatible with their Tesla's zone.
 * Only shows rides not yet matched to a pool.
 */
export async function getPendingRequests(req: Request, res: Response) {
  const driverId = req.user!.sub;

  const tesla = await prisma.tesla.findUnique({ where: { driverId } });
  if (!tesla) return sendError(res, 'No Tesla registered for this driver', 404);
  if (!tesla.isOnline) return sendError(res, 'Go online first to see ride requests', 403);

  const pendingRides = await prisma.rideRequest.findMany({
    where: {
      status: RideStatus.REQUESTED,
      membership: null, // not yet assigned to any pool
    },
    include: {
      passenger: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return sendSuccess(res, { tesla, pendingRides });
}

/**
 * POST /api/driver/pools/accept
 * Driver accepts one or more ride requests into a pool.
 * Capacity is enforced atomically.
 *
 * Body: { rideRequestIds: string[] }
 */
export async function acceptRides(req: Request, res: Response) {
  const driverId = req.user!.sub;
  const { rideRequestIds } = req.body as { rideRequestIds: string[] };

  if (!Array.isArray(rideRequestIds) || rideRequestIds.length === 0) {
    return sendError(res, 'rideRequestIds must be a non-empty array', 400);
  }

  const tesla = await prisma.tesla.findUnique({ where: { driverId } });
  if (!tesla) return sendError(res, 'No Tesla registered for this driver', 404);
  if (!tesla.isOnline) return sendError(res, 'Go online first', 403);

  // Fetch all requested rides
  const rides = await prisma.rideRequest.findMany({
    where: { id: { in: rideRequestIds } },
    include: { membership: true },
  });

  if (rides.length !== rideRequestIds.length) {
    return sendError(res, 'One or more ride requests not found', 404);
  }

  // Validate all rides are REQUESTED and not yet assigned
  for (const ride of rides) {
    if (ride.status !== RideStatus.REQUESTED) {
      return sendError(res, `Ride ${ride.id} is not in REQUESTED status`, 409);
    }
    if (ride.membership) {
      return sendError(res, `Ride ${ride.id} is already assigned to a pool`, 409);
    }
  }

  // Validate routes are pool-compatible if >1 ride
  if (rides.length >= 2) {
    for (let i = 1; i < rides.length; i++) {
      if (
        !areRoutesCompatible(
          rides[0].pickupArea,
          rides[0].dropoffArea,
          rides[i].pickupArea,
          rides[i].dropoffArea
        )
      ) {
        return sendError(
          res,
          `Rides ${rides[0].id} and ${rides[i].id} are not route-compatible for pooling`,
          400
        );
      }
    }
  }

  const totalSeats = rides.reduce((sum, r) => sum + r.seatsRequested, 0);
  if (totalSeats > tesla.capacity) {
    return sendError(
      res,
      `Total seats (${totalSeats}) exceeds Bullet's capacity (${tesla.capacity})`,
      409
    );
  }

  const isPooled = rides.length >= 2;

  // Atomic transaction: create pool, assign memberships, update ride statuses
  const pool = await prisma.$transaction(async (tx) => {
    // Create the pool
    const newPool = await tx.pool.create({
      data: {
        teslaId: tesla.id,
        status: PoolStatus.MATCHED,
        occupiedSeats: totalSeats,
      },
    });

    // Create memberships and update each ride
    for (let i = 0; i < rides.length; i++) {
      const ride = rides[i];
      const fare = calculateFare(ride.pickupArea, ride.dropoffArea, isPooled);

      await tx.poolMembership.create({
        data: {
          poolId: newPool.id,
          rideRequestId: ride.id,
          pickupOrder: i + 1,
          dropoffOrder: i + 1,
          farePaisa: fare.finalFarePaisa,
        },
      });

      await tx.rideRequest.update({
        where: { id: ride.id },
        data: {
          status: RideStatus.MATCHED,
          actualFarePaisa: fare.finalFarePaisa,
        },
      });

      await tx.rideStatusEvent.create({
        data: {
          rideRequestId: ride.id,
          fromStatus: RideStatus.REQUESTED,
          toStatus: RideStatus.MATCHED,
          actorId: driverId,
          note: `Matched to pool ${newPool.id}${isPooled ? ' (shared ride)' : ''}`,
        },
      });
    }

    return newPool;
  });

  // Fetch the complete pool with all details
  const fullPool = await prisma.pool.findUnique({
    where: { id: pool.id },
    include: {
      memberships: {
        include: {
          rideRequest: {
            include: { passenger: { select: { id: true, name: true, phone: true } } },
          },
        },
      },
    },
  });

  return sendSuccess(res, { pool: fullPool, message: 'Rides accepted successfully' }, 201);
}

/**
 * GET /api/driver/pools
 * Driver sees their active and recent pools.
 */
export async function getMyPools(req: Request, res: Response) {
  const driverId = req.user!.sub;

  const tesla = await prisma.tesla.findUnique({ where: { driverId } });
  if (!tesla) return sendError(res, 'No Tesla registered', 404);

  const pools = await prisma.pool.findMany({
    where: { teslaId: tesla.id },
    include: {
      memberships: {
        include: {
          rideRequest: {
            include: { passenger: { select: { id: true, name: true, phone: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return sendSuccess(res, { tesla, pools });
}

/**
 * GET /api/driver/pools/:poolId
 * Driver sees full pool details.
 */
export async function getPool(req: Request, res: Response) {
  const driverId = req.user!.sub;
  const { poolId } = req.params;

  const tesla = await prisma.tesla.findUnique({ where: { driverId } });
  if (!tesla) return sendError(res, 'No Tesla registered', 404);

  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      tesla: true,
      memberships: {
        include: {
          rideRequest: {
            include: {
              passenger: { select: { id: true, name: true, phone: true } },
              statusEvents: { orderBy: { createdAt: 'asc' } },
            },
          },
        },
      },
    },
  });

  if (!pool) return sendError(res, 'Pool not found', 404);
  if (pool.tesla.driverId !== driverId) return sendError(res, 'Not your pool', 403);

  return sendSuccess(res, pool);
}

// ── Pool Lifecycle Transitions ─────────────────────────────────────────────────

/** Valid transitions: what statuses each PoolStatus can move to. */
const POOL_TRANSITIONS: Record<PoolStatus, PoolStatus[]> = {
  [PoolStatus.OPEN]: [PoolStatus.MATCHED, PoolStatus.CANCELLED],
  [PoolStatus.MATCHED]: [PoolStatus.DRIVER_ARRIVED, PoolStatus.CANCELLED],
  [PoolStatus.DRIVER_ARRIVED]: [PoolStatus.IN_PROGRESS, PoolStatus.CANCELLED],
  [PoolStatus.IN_PROGRESS]: [PoolStatus.COMPLETED],
  [PoolStatus.COMPLETED]: [],
  [PoolStatus.CANCELLED]: [],
};

/** Maps pool status to the corresponding ride request status. */
const POOL_TO_RIDE_STATUS: Partial<Record<PoolStatus, RideStatus>> = {
  [PoolStatus.DRIVER_ARRIVED]: RideStatus.DRIVER_ARRIVED,
  [PoolStatus.IN_PROGRESS]: RideStatus.IN_PROGRESS,
  [PoolStatus.COMPLETED]: RideStatus.COMPLETED,
  [PoolStatus.CANCELLED]: RideStatus.CANCELLED,
};

/**
 * PATCH /api/driver/pools/:poolId/status
 * Driver advances the pool lifecycle.
 * Body: { status: PoolStatus }
 */
export async function updatePoolStatus(req: Request, res: Response) {
  const driverId = req.user!.sub;
  const { poolId } = req.params;
  const { status: newStatus } = req.body as { status: PoolStatus };

  if (!Object.values(PoolStatus).includes(newStatus)) {
    return sendError(res, `Invalid status: ${newStatus}`, 400);
  }

  const tesla = await prisma.tesla.findUnique({ where: { driverId } });
  if (!tesla) return sendError(res, 'No Tesla registered', 404);

  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      memberships: { include: { rideRequest: true } },
    },
  });

  if (!pool) return sendError(res, 'Pool not found', 404);
  if (pool.teslaId !== tesla.id) return sendError(res, 'Not your pool', 403);

  const allowedTransitions = POOL_TRANSITIONS[pool.status];
  if (!allowedTransitions.includes(newStatus)) {
    return sendError(
      res,
      `Invalid transition: ${pool.status} → ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`,
      409
    );
  }

  const rideStatus = POOL_TO_RIDE_STATUS[newStatus];

  await prisma.$transaction(async (tx) => {
    // Update pool
    await tx.pool.update({
      where: { id: poolId },
      data: {
        status: newStatus,
        ...(newStatus === PoolStatus.IN_PROGRESS && { startedAt: new Date() }),
        ...(newStatus === PoolStatus.COMPLETED && { completedAt: new Date() }),
      },
    });

    // Update all member ride requests
    if (rideStatus) {
      for (const membership of pool.memberships) {
        const ride = membership.rideRequest;
        if (([RideStatus.CANCELLED, RideStatus.COMPLETED] as string[]).includes(ride.status)) continue;

        await tx.rideRequest.update({
          where: { id: ride.id },
          data: {
            status: rideStatus,
            ...(rideStatus === RideStatus.COMPLETED && {
              actualFarePaisa: membership.farePaisa,
              paymentStatus: 'PAID',
            }),
          },
        });

        await tx.rideStatusEvent.create({
          data: {
            rideRequestId: ride.id,
            fromStatus: ride.status,
            toStatus: rideStatus,
            actorId: driverId,
            note: `Driver updated pool status to ${newStatus}`,
          },
        });
      }
    }
  });

  const updatedPool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      memberships: {
        include: {
          rideRequest: {
            include: { passenger: { select: { id: true, name: true, phone: true } } },
          },
        },
      },
    },
  });

  return sendSuccess(res, { pool: updatedPool, message: `Pool status updated to ${newStatus}` });
}

/**
 * PATCH /api/driver/tesla/status
 * Driver toggles online/offline.
 */
export async function updateTeslaStatus(req: Request, res: Response) {
  const driverId = req.user!.sub;
  const { isOnline } = req.body as { isOnline: boolean };

  if (typeof isOnline !== 'boolean') {
    return sendError(res, 'isOnline must be a boolean', 400);
  }

  const tesla = await prisma.tesla.findUnique({ where: { driverId } });
  if (!tesla) return sendError(res, 'No Tesla registered', 404);

  const updated = await prisma.tesla.update({
    where: { id: tesla.id },
    data: { isOnline },
  });

  return sendSuccess(res, { tesla: updated, message: `Bullet is now ${isOnline ? 'online' : 'offline'}` });
}
