import { Router } from 'express';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/response';
import { authenticate, requireRole } from '../middleware/auth';
import {
  requestRide,
  getMyRides,
  getRide,
  cancelRide,
  RequestRideSchema,
  CancelRideSchema,
} from '../controllers/ride.controller';

const router = Router();

// All ride routes require passenger auth
router.use(authenticate, requireRole('PASSENGER'));

router.post('/request', validate(RequestRideSchema), asyncHandler(requestRide));
router.get('/', asyncHandler(getMyRides));
router.get('/:id', asyncHandler(getRide));
router.post('/:id/cancel', validate(CancelRideSchema), asyncHandler(cancelRide));

export default router;
