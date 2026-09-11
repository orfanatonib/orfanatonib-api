import { HttpStatus } from "@nestjs/common";
import { AppException } from "./app.exception";
import { ErrorCategory } from "./error-category.enum";

/**
 * Credencial ausente, inválida ou expirada (401).
 *
 * Não confundir com `AccessDeniedException` (403): 401 é "não sei quem você é",
 * 403 é "sei quem você é e você não pode". O `docs/ERROR_HANDLING_GUIDE.md`
 * classifica 401 como `BUSINESS`.
 */
export class UnauthenticatedException extends AppException {
  constructor(message: string, details?: unknown) {
    super(
      ErrorCategory.BUSINESS,
      message,
      HttpStatus.UNAUTHORIZED,
      details,
      "Unauthorized",
    );
  }
}
