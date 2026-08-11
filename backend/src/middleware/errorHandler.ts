import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errors: (err as any).issues?.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
      })) ?? [],
    });
    return;
  }

  // Custom app errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Prisma unique constraint violations
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'meta' in err
  ) {
    const prismaErr = err as { code: string; meta?: { target?: string[] } };
    if (prismaErr.code === 'P2002') {
      const fields = prismaErr.meta?.target?.join(', ') ?? 'field';
      res.status(409).json({
        success: false,
        message: `A record with this ${fields} already exists`,
      });
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Record not found',
      });
      return;
    }
  }

  // Generic fallback
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
  });
}
