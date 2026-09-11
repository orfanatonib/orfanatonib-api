import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCategory } from "./error-category.enum";

export class AppException extends HttpException {
  public readonly category: ErrorCategory;

  constructor(
    category: ErrorCategory,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown,
    /**
     * Nome do erro no corpo da resposta. Por padrão repete a categoria,
     * como sempre foi; o `docs/ERROR_HANDLING_GUIDE.md` pede o nome HTTP
     * em alguns status (401 -> "Unauthorized"), e é isso que este
     * parâmetro permite sem mexer no que já está publicado.
     */
    error: string = category,
  ) {
    super(
      {
        message,
        category,
        details,
        error,
      },
      status,
    );
    this.category = category;
  }
}
