import type { Request } from "express";

import type { ErrorCategory } from "../exceptions/error-category.enum";

export interface ErrorDetails {
  statusCode: number;
  message: string | string[];
  error: string;
  category: ErrorCategory;
  details?: Record<string, unknown>;
}

export interface ErrorResponse extends ErrorDetails {
  timestamp: string;
  path: string;
  requestId?: string;
  correlationId?: string;
}

export interface MysqlDriverError {
  code?: string;
  errno?: number;
  sqlState?: string;
  constraint?: string;
  field?: string;
}

export type RequestWithUser = Request & { user?: { id?: string } };

export interface GlobalExceptionFilterOptions {
  /** Expõe a mensagem interna de `Error` na resposta (só desenvolvimento). */
  exposeInternalErrors?: boolean;
}
