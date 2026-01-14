import { Injectable, NestMiddleware, RequestTimeoutException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TimeoutMiddleware implements NestMiddleware {
  constructor(private readonly timeoutMs: number = 30000) {} // 30 seconds default

  use(req: Request, res: Response, next: NextFunction): void {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        throw new RequestTimeoutException({
          message: `Request timeout after ${this.timeoutMs}ms`,
          details: {
            url: req.url,
            method: req.method,
            timeout: this.timeoutMs,
          },
          category: 'SERVER',
        });
      }
    }, this.timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  }
}
