import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { Role } from '@prisma/client';

// ── Validation Schemas ────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  phone: z.string().regex(/^[+]?[\d\s\-().]{7,20}$/, 'Must be a valid phone number (7-15 digits)'),
  role: z.enum(['PASSENGER', 'DRIVER']),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function signToken(userId: string, role: Role, name: string) {
  return jwt.sign(
    { sub: userId, role, name },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as `${number}d` | `${number}h` | `${number}s` | number }
  );
}

function sanitizeUser(user: { id: string; name: string; email: string; phone: string; role: Role; walletBalancePaisa: number; createdAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    walletBalancePaisa: user.walletBalancePaisa,
    createdAt: user.createdAt,
  };
}

// ── Controllers ───────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response) {
  const { name, email, password, phone, role } = req.body as z.infer<typeof RegisterSchema>;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
  });
  if (existing) {
    return sendError(res, 'Email or phone already registered', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, phone, role },
  });

  const token = signToken(user.id, user.role, user.name);
  return sendSuccess(res, { token, user: sanitizeUser(user) }, 201);
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as z.infer<typeof LoginSchema>;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return sendError(res, 'Invalid email or password', 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return sendError(res, 'Invalid email or password', 401);

  const token = signToken(user.id, user.role, user.name);
  return sendSuccess(res, { token, user: sanitizeUser(user) });
}

export async function getMe(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    include: { tesla: true },
  });
  if (!user) return sendError(res, 'User not found', 404);

  return sendSuccess(res, { ...sanitizeUser(user), tesla: user.tesla });
}
