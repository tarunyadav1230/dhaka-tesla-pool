import { Request, Response, NextFunction } from 'express';

/**
 * Standard API response helpers.
 * All responses follow: { success, data?, error?, message? }
 */

export function sendSuccess(res: Response, data: unknown, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function sendError(res: Response, message: string, statusCode = 400, details?: unknown) {
  const body: Record<string, unknown> = { success: false, error: message };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

/**
 * Async route wrapper – eliminates try/catch boilerplate in every controller.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
