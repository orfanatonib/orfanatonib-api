import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCategory } from './error-category.enum';

export class AppException extends HttpException {
    public readonly category: ErrorCategory;

    constructor(
        category: ErrorCategory,
        message: string,
        status: HttpStatus = HttpStatus.BAD_REQUEST,
        details?: unknown,
    ) {
        super(
            {
                message,
                category,
                details,
                error: category,
            },
            status,
        );
        this.category = category;
    }
}
