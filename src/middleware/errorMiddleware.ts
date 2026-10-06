import { Request, Response, NextFunction } from 'express';
import { AppError } from '../helpers/appError';
import { logger } from '../helpers/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      details: err.details || null,
    });
    return;
  }

  logger.error(`Unhandled Error: ${err.message}\nStack: ${err.stack}`);

  res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: env.NODE_ENV === 'development' ? err.message : 'An unexpected server error occurred.',
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
