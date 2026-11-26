import { HttpStatus } from '@nestjs/common';
import { AppException as OrfanatoException, ErrorCategory } from 'src/common/exceptions';
import { ErrorCode } from './error-codes.enum';
export class AppException extends OrfanatoException {
  constructor(public readonly code: ErrorCode, message: string, httpStatus: HttpStatus, public readonly details?: unknown) {
    super(httpStatus >= 500 ? ErrorCategory.SERVER : ErrorCategory.RULE, message, httpStatus, details, code);
  }
  getCode(): ErrorCode { return this.code; }
  getDetails(): unknown { return this.details; }
}
