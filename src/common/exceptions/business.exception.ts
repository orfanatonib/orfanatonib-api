import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCategory } from './error-category.enum';

export class BusinessException extends AppException {
    constructor(message: string, details?: unknown) {
        super(ErrorCategory.BUSINESS, message, HttpStatus.UNPROCESSABLE_ENTITY, details);
    }
}
