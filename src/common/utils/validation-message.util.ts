import type { ValidationError } from "class-validator";

/**
 * Mensagem de falha de validação/parse para devolver em 400, sem vazar stack.
 * `validateOrReject` rejeita com `ValidationError[]`; qualquer outra coisa usa a
 * mensagem do `Error` ou o texto de reserva.
 */
export const validationMessage = (error: unknown, fallback: string): string => {
  if (Array.isArray(error)) {
    return (error as ValidationError[])
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .join("; ");
  }
  return error instanceof Error && error.message ? error.message : fallback;
};

/** Stack de um `unknown` vindo de `catch`, só para o log. */
export const errorStack = (error: unknown): string | undefined =>
  error instanceof Error ? error.stack : undefined;
