import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCategory } from './error-category.enum';

export class RuleException extends AppException {
    constructor(message: string, details?: unknown) {
        super(ErrorCategory.RULE, message, HttpStatus.BAD_REQUEST, details);
    }
}
