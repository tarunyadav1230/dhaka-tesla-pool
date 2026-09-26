import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { calculateFare, paisaToBdt } from '../utils/fare';
import { AREA_NAMES, getArea } from '../utils/areas';
import { RideStatus, PaymentMethod, PoolStatus } from '@prisma/client';
import { areRoutesCompatible } from '../utils/areas';

// ── Validation Schemas ────────────────────────────────────────────────────────

export const RequestRideSchema = z.object({
  pickupArea: z.enum(AREA_NAMES as [string, ...string[]]),
  dropoffArea: z.enum(AREA_NAMES as [string, ...string[]]),
  seatsRequested: z.number().int().min(1).max(3).default(1),
  paymentMethod: z.enum(['CASH', 'TESLA_PAY']).default('CASH'),
});

export const CancelRideSchema = z.object({
  reason: z.string().max(200).optional(),
});

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/rides/request
 * Passenger requests a ride. Estimated fare calculated immediately.
 * Pool discount applied optimistically (shown as "if shared").
 */
export async function requestRide(req: Request, res: Response) {
  const passengerId = req.user!.sub;
  const { pickupArea, dropoffArea, seatsRequested, paymentMethod } =
    req.body as z.infer<typeof RequestRideSchema>;

  if (pickupArea === dropoffArea) {
    return sendError(res, 'Pickup and dropoff must be different areas', 400);
  }

  // Check no active ride already exists for this passenger
  const activeRide = await prisma.rideRequest.findFirst({
    where: {
      passengerId,
      status: { in: [RideStatus.REQUESTED, RideStatus.MATCHED, RideStatus.DRIVER_ARRIVED, RideStatus.IN_PROGRESS] },
    },
  });
  if (activeRide) {
    return sendError(res, 'You already have an active ride request', 409);
  }

  // Calculate fare (solo first, pool discount shown separately)
  const pickup = getArea(pickupArea);
  const dropoff = getArea(dropoffArea);
  const fareBreakdown = calculateFare(pickupArea, dropoffArea, false); // solo fare for estimate

  const rideRequest = await prisma.rideRequest.create({
    data: {
      passengerId,
      pickupArea,
      dropoffArea,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      seatsRequested,
      estimatedFarePaisa: fareBreakdown.finalFarePaisa,
      paymentMethod: paymentMethod as PaymentMethod,
      status: RideStatus.REQUESTED,
    },
  });

  // Record the status event
  await prisma.rideStatusEvent.create({
    data: {
      rideRequestId: rideRequest.id,
      toStatus: RideStatus.REQUESTED,
      actorId: passengerId,
      note: `Ride requested: ${pickupArea} → ${dropoffArea}`,
    },
  });

  return sendSuccess(
    res,
    {
      rideRequest,
      fareBreakdown: {
        ...fareBreakdown,
        estimatedBdt: paisaToBdt(fareBreakdown.finalFarePaisa),
        pooledEstimatedBdt: paisaToBdt(calculateFare(pickupArea, dropoffArea, true).finalFarePaisa),
      },
    },
    201
  );
}

/**
 * GET /api/rides
 * Passenger sees their own active + recent rides.
 */
export async function getMyRides(req: Request, res: Response) {
  const passengerId = req.user!.sub;

  const rides = await prisma.rideRequest.findMany({
    where: { passengerId },
    include: {
      membership: {
        include: {
          pool: {
            include: {
              tesla: { include: { driver: { select: { id: true, name: true, phone: true } } } },
              memberships: {
                select: { id: true, farePaisa: true, pickupOrder: true, dropoffOrder: true },
              },
            },
          },
        },
      },
      statusEvents: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return sendSuccess(res, rides);
}

/**
 * GET /api/rides/:id
 * Passenger sees their single ride. Ownership enforced.
 */
export async function getRide(req: Request, res: Response) {
  const { id } = req.params;
  const passengerId = req.user!.sub;

  const ride = await prisma.rideRequest.findUnique({
    where: { id },
    include: {
      membership: {
        include: {
          pool: {
            include: {
              tesla: {
                include: {
                  driver: { select: { id: true, name: true, phone: true } },
                },
              },
              // Do NOT expose other passengers' details to this passenger
              memberships: {
                select: {
                  id: true,
                  farePaisa: true,
                  pickupOrder: true,
                  dropoffOrder: true,
                  rideRequest: { select: { pickupArea: true, dropoffArea: true } },
                },
              },
            },
          },
        },
      },
      statusEvents: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!ride) return sendError(res, 'Ride not found', 404);
  if (ride.passengerId !== passengerId) return sendError(res, 'Not your ride', 403);

  return sendSuccess(res, ride);
}

/**
 * POST /api/rides/:id/cancel
 * Passenger cancels their ride. Only valid in REQUESTED or MATCHED states.
 */
export async function cancelRide(req: Request, res: Response) {
  const { id } = req.params;
  const passengerId = req.user!.sub;
  const { reason } = req.body as z.infer<typeof CancelRideSchema>;

  const ride = await prisma.rideRequest.findUnique({
    where: { id },
    include: { membership: { include: { pool: true } } },
  });

  if (!ride) return sendError(res, 'Ride not found', 404);
  if (ride.passengerId !== passengerId) return sendError(res, 'Not your ride', 403);

  const cancellableStatuses: RideStatus[] = [RideStatus.REQUESTED, RideStatus.MATCHED];
  if (!cancellableStatuses.includes(ride.status)) {
    return sendError(
      res,
      `Cannot cancel a ride in "${ride.status}" status. Only REQUESTED or MATCHED rides can be cancelled.`,
      409
    );
  }

  // Transaction: cancel ride + update pool seat count if pooled
  await prisma.$transaction(async (tx) => {
    await tx.rideRequest.update({
      where: { id },
      data: {
        status: RideStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason || 'Cancelled by passenger',
      },
    });

    await tx.rideStatusEvent.create({
      data: {
        rideRequestId: id,
        fromStatus: ride.status,
        toStatus: RideStatus.CANCELLED,
        actorId: passengerId,
        note: reason || 'Cancelled by passenger',
      },
    });

    // If part of a pool, free the seat
    if (ride.membership?.pool) {
      const pool = ride.membership.pool;
      const newOccupied = Math.max(0, pool.occupiedSeats - ride.seatsRequested);
      await tx.pool.update({
        where: { id: pool.id },
        data: { occupiedSeats: newOccupied },
      });
    }
  });

  return sendSuccess(res, { message: 'Ride cancelled successfully' });
}
