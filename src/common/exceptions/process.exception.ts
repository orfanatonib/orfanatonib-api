import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCategory } from './error-category.enum';

export class ProcessException extends AppException {
    constructor(message: string, details?: unknown) {
        super(ErrorCategory.PROCESS, message, HttpStatus.INTERNAL_SERVER_ERROR, details);
    }
}
