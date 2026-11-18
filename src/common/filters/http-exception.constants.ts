import { HttpStatus } from "@nestjs/common";

export const GENERIC_INTERNAL_MESSAGE = "Internal server error";

/** Ambientes em que a mensagem interna de um `Error` pode sair na resposta (desenvolvimento). */
export const ERROR_ENVIRONMENTS_THAT_EXPOSE_INTERNALS: readonly string[] = [
  "local",
  "dev",
];

export const ERROR_NAMES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "Bad Request",
  [HttpStatus.UNAUTHORIZED]: "Unauthorized",
  [HttpStatus.FORBIDDEN]: "Forbidden",
  [HttpStatus.NOT_FOUND]: "Not Found",
  [HttpStatus.CONFLICT]: "Conflict",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "Unprocessable Entity",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "Internal Server Error",
  [HttpStatus.BAD_GATEWAY]: "Bad Gateway",
  [HttpStatus.SERVICE_UNAVAILABLE]: "Service Unavailable",
};

export const MYSQL_ERROR_CODES = {
  DUPLICATE_ENTRY: "ER_DUP_ENTRY",
  NO_REFERENCED_ROW: "ER_NO_REFERENCED_ROW_2",
  ROW_IS_REFERENCED: "ER_ROW_IS_REFERENCED_2",
  DATA_TOO_LONG: "ER_DATA_TOO_LONG",
} as const;

/** Token de injeção das opções do filtro (opcional; usado em testes). */
export const GLOBAL_EXCEPTION_FILTER_OPTIONS = Symbol(
  "GLOBAL_EXCEPTION_FILTER_OPTIONS",
);
