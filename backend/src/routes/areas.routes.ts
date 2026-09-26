import { Router } from 'express';
import { sendSuccess } from '../utils/response';
import { AREAS, AREA_NAMES } from '../utils/areas';
import { calculateFare, paisaToBdt } from '../utils/fare';

const router = Router();

/** GET /api/areas – list all valid Dhaka areas */
router.get('/', (_req, res) => {
  return sendSuccess(res, Object.values(AREAS));
});

/** GET /api/areas/fare-estimate?pickup=Banani&dropoff=Mohakhali */
router.get('/fare-estimate', (req, res) => {
  const { pickup, dropoff } = req.query as { pickup: string; dropoff: string };
  if (!pickup || !dropoff) {
    return res.status(400).json({ success: false, error: 'pickup and dropoff query params required' });
  }
  if (!AREA_NAMES.includes(pickup) || !AREA_NAMES.includes(dropoff)) {
    return res.status(400).json({ success: false, error: 'Invalid area name' });
  }
  const soloFare = calculateFare(pickup, dropoff, false);
  const poolFare = calculateFare(pickup, dropoff, true);
  return sendSuccess(res, {
    pickup,
    dropoff,
    soloFare: { ...soloFare, bdt: paisaToBdt(soloFare.finalFarePaisa) },
    poolFare: { ...poolFare, bdt: paisaToBdt(poolFare.finalFarePaisa) },
  });
});

export default router;
