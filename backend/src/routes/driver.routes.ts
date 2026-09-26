import { Router } from 'express';
import { asyncHandler } from '../utils/response';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getPendingRequests,
  acceptRides,
  getMyPools,
  getPool,
  updatePoolStatus,
  updateTeslaStatus,
} from '../controllers/driver.controller';

const router = Router();

// All driver routes require DRIVER role
router.use(authenticate, requireRole('DRIVER'));

// Tesla status
router.patch('/tesla/status', asyncHandler(updateTeslaStatus));

// Ride management
router.get('/requests', asyncHandler(getPendingRequests));
router.post('/pools/accept', asyncHandler(acceptRides));
router.get('/pools', asyncHandler(getMyPools));
router.get('/pools/:poolId', asyncHandler(getPool));
router.patch('/pools/:poolId/status', asyncHandler(updatePoolStatus));

export default router;
