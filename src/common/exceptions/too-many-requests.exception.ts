import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCategory } from './error-category.enum';

export class TooManyRequestsException extends AppException {
    constructor(message: string, retryAfter?: number) {
        super(ErrorCategory.RULE, message, HttpStatus.TOO_MANY_REQUESTS, {
            retryAfter: retryAfter || 60,
        });

        if (retryAfter) {
            this.retryAfter = retryAfter;
        }
    }

    private retryAfter?: number;

    getRetryAfter(): number | undefined {
        return this.retryAfter;
    }
}
