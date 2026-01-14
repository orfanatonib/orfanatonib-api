import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

interface RequestLogContext {
    requestId: string;
    method: string;
    url: string;
    userAgent: string;
    ip: string;
    userId?: string;
    timestamp: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();
        const startTime = Date.now();

        const requestId = uuidv4();
        const logContext: RequestLogContext = {
            requestId,
            method: request.method,
            url: request.url,
            userAgent: request.get('User-Agent') || 'Unknown',
            ip: this.getClientIp(request),
            userId: (request as any).user?.id,
            timestamp: new Date().toISOString(),
        };

        response.setHeader('X-Request-ID', requestId);

        return next
            .handle()
            .pipe(
                catchError((error) => {
                    const duration = Date.now() - startTime;
                    const statusCode = error.status || 500;

                    this.logger.error(
                        `❌ ERROR [${requestId}] ${logContext.method} ${logContext.url} - ${statusCode} - ${duration}ms - ${error.message}`
                    );

                    throw error;
                })
            );
    }

    private getClientIp(request: Request): string {
        return (
            request.ip ||
            request.connection?.remoteAddress ||
            request.socket?.remoteAddress ||
            (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            'Unknown'
        );
    }
}
