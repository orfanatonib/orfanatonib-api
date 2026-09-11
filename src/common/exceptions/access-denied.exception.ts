import { HttpStatus } from "@nestjs/common";
import { AppException } from "./app.exception";
import { ErrorCategory } from "./error-category.enum";

/**
 * Ator autenticado que não tem permissão para a operação (403).
 * Para recurso que o ator sequer enxerga, use `ResourceNotFoundException`:
 * responder 404 evita revelar a existência do registro.
 */
export class AccessDeniedException extends AppException {
  constructor(message: string, details?: unknown) {
    super(
      ErrorCategory.BUSINESS,
      message,
      HttpStatus.FORBIDDEN,
      details,
      "Forbidden",
    );
  }
}
