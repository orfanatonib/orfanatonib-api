import { HttpStatus } from "@nestjs/common";
import { AppException } from "./app.exception";
import { ErrorCategory } from "./error-category.enum";

export class ResourceNotFoundException extends AppException {
  constructor(message: string, details?: unknown) {
    super(
      ErrorCategory.BUSINESS,
      message,
      HttpStatus.NOT_FOUND,
      details,
      "Not Found",
    );
  }
}
