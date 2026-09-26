import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

/**
 * Global error handler.
 * Catches anything thrown/passed to next() in controllers.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Prisma unique constraint violation
  if ('code' in err && (err as NodeJS.ErrnoException).code === 'P2002') {
    return sendError(res, 'A record with this value already exists', 409);
  }

  // Prisma record not found
  if ('code' in err && (err as NodeJS.ErrnoException).code === 'P2025') {
    return sendError(res, 'Record not found', 404);
  }

  return sendError(res, err.message || 'Internal server error', 500);
}
