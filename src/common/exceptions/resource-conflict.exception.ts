import { HttpStatus } from "@nestjs/common";
import { AppException } from "./app.exception";
import { ErrorCategory } from "./error-category.enum";

/**
 * Estado atual do recurso impede a operação (409): e-mail já cadastrado,
 * nome duplicado, cadastro já concluído.
 *
 * O `docs/ERROR_HANDLING_GUIDE.md` usa exatamente este caso como exemplo de
 * 409 — "Já existe um usuário com este email" — com `error: "Conflict"`.
 */
export class ResourceConflictException extends AppException {
  constructor(message: string, details?: unknown) {
    super(
      ErrorCategory.BUSINESS,
      message,
      HttpStatus.CONFLICT,
      details,
      "Conflict",
    );
  }
}
