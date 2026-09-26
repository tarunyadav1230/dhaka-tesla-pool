import { Router } from 'express';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/response';
import { register, login, getMe, RegisterSchema, LoginSchema } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', validate(RegisterSchema), asyncHandler(register));
router.post('/login', validate(LoginSchema), asyncHandler(login));
router.get('/me', authenticate, asyncHandler(getMe));

export default router;
