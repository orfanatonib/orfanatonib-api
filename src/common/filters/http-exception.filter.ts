import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ValidationError } from "class-validator";
import { randomUUID } from "node:crypto";
import { Response } from "express";
import { EntityNotFoundError, QueryFailedError, TypeORMError } from "typeorm";

import { RequestContextService } from "src/core/request-context/request-context.service";
import { ErrorCategory } from "../exceptions/error-category.enum";
import {
  ERROR_ENVIRONMENTS_THAT_EXPOSE_INTERNALS,
  GLOBAL_EXCEPTION_FILTER_OPTIONS,
  ERROR_NAMES,
  GENERIC_INTERNAL_MESSAGE,
  MYSQL_ERROR_CODES,
} from "./http-exception.constants";
import type {
  ErrorDetails,
  ErrorResponse,
  GlobalExceptionFilterOptions,
  MysqlDriverError,
  RequestWithUser,
} from "./http-exception.types";

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly exposeInternalErrors: boolean;

  constructor(
    @Optional() private readonly requestContext?: RequestContextService,
    @Optional() config?: ConfigService,
    @Optional()
    @Inject(GLOBAL_EXCEPTION_FILTER_OPTIONS)
    options?: GlobalExceptionFilterOptions,
  ) {
    const environment = config?.get<string>("ENVIRONMENT") ?? "local";
    this.exposeInternalErrors =
      options?.exposeInternalErrors ??
      ERROR_ENVIRONMENTS_THAT_EXPOSE_INTERNALS.includes(environment);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithUser>();

    const requestId = this.requestContext?.getRequestId() ?? "unknown";
    const correlationId = this.generateCorrelationId();

    const errorDetails = this.extractErrorDetails(exception);
    this.logError(errorDetails, request, requestId, correlationId, exception);

    const errorResponse: ErrorResponse = {
      statusCode: errorDetails.statusCode,
      message: errorDetails.message,
      error: errorDetails.error,
      category: errorDetails.category,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      correlationId,
      ...(errorDetails.details && { details: errorDetails.details }),
    };

    response.status(errorDetails.statusCode).json(errorResponse);
  }

  private extractErrorDetails(exception: unknown): ErrorDetails {
    const defaultDetails: ErrorDetails = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: GENERIC_INTERNAL_MESSAGE,
      error: ERROR_NAMES[HttpStatus.INTERNAL_SERVER_ERROR],
      category: ErrorCategory.SERVER,
    };

    try {
      if (exception instanceof HttpException) {
        return this.handleHttpException(exception);
      }
      if (exception instanceof EntityNotFoundError) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: "Resource not found",
          error: ERROR_NAMES[HttpStatus.NOT_FOUND],
          category: ErrorCategory.BUSINESS,
        };
      }
      if (exception instanceof QueryFailedError) {
        return this.handleQueryFailedError(exception);
      }
      if (exception instanceof TypeORMError) {
        return { ...defaultDetails, message: "Database operation failed" };
      }
      if (exception instanceof ValidationError) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: this.flattenValidationErrors(exception),
          error: ERROR_NAMES[HttpStatus.BAD_REQUEST],
          category: ErrorCategory.RULE,
        };
      }
      if (exception instanceof Error) {
        // Mensagem interna (SQL, caminho, valor) só em desenvolvimento; o stack nunca sai na resposta.
        return {
          ...defaultDetails,
          message: this.exposeInternalErrors
            ? exception.message
            : GENERIC_INTERNAL_MESSAGE,
        };
      }
      return { ...defaultDetails, message: "Unknown error occurred" };
    } catch (processingError) {
      this.logger.error("Error while processing exception", processingError);
      return defaultDetails;
    }
  }

  private handleHttpException(exception: HttpException): ErrorDetails {
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[] = exception.message;
    let error = ERROR_NAMES[statusCode] ?? "Error";
    let category = this.deduceCategory(statusCode);
    let details: Record<string, unknown> | undefined;

    if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
      const body = exceptionResponse as Record<string, unknown>;
      if (body.message) message = body.message as string | string[];
      if (typeof body.error === "string") error = body.error;
      if (body.category) category = body.category as ErrorCategory;
      if (body.details) details = body.details as Record<string, unknown>;
    }

    return { statusCode, message, error, category, details };
  }

  private handleQueryFailedError(exception: QueryFailedError): ErrorDetails {
    const driverError = (
      exception as QueryFailedError & { driverError?: MysqlDriverError }
    ).driverError;
    const code = driverError?.code;

    if (code === MYSQL_ERROR_CODES.DUPLICATE_ENTRY) {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: "A record with this information already exists",
        error: ERROR_NAMES[HttpStatus.CONFLICT],
        category: ErrorCategory.BUSINESS,
        details: { constraint: driverError?.constraint },
      };
    }
    if (code === MYSQL_ERROR_CODES.NO_REFERENCED_ROW) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Cannot create/update: referenced record does not exist",
        error: ERROR_NAMES[HttpStatus.BAD_REQUEST],
        category: ErrorCategory.RULE,
        details: { constraint: driverError?.constraint },
      };
    }
    if (code === MYSQL_ERROR_CODES.ROW_IS_REFERENCED) {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: "Cannot delete: record is referenced by other data",
        error: ERROR_NAMES[HttpStatus.CONFLICT],
        category: ErrorCategory.RULE,
        details: { constraint: driverError?.constraint },
      };
    }
    if (code === MYSQL_ERROR_CODES.DATA_TOO_LONG) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Data provided exceeds maximum allowed length",
        error: ERROR_NAMES[HttpStatus.BAD_REQUEST],
        category: ErrorCategory.RULE,
        details: { field: driverError?.field },
      };
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Database operation failed",
      error: ERROR_NAMES[HttpStatus.INTERNAL_SERVER_ERROR],
      category: ErrorCategory.SERVER,
      details: {
        code,
        errno: driverError?.errno,
        sqlState: driverError?.sqlState,
      },
    };
  }

  private flattenValidationErrors(error: ValidationError, path = ""): string[] {
    const messages: string[] = [];
    if (error.constraints) {
      for (const constraint of Object.values(error.constraints)) {
        messages.push(`${path}${error.property}: ${constraint}`);
      }
    }
    for (const child of error.children ?? []) {
      messages.push(
        ...this.flattenValidationErrors(child, `${path}${error.property}.`),
      );
    }
    return messages;
  }

  /**
   * Um registro por erro, sem dado pessoal: o caminho vai **sem query string**
   * (ela pode carregar nome buscado), e IP/User-Agent não são gravados.
   */
  private logError(
    errorDetails: ErrorDetails,
    request: RequestWithUser,
    requestId: string,
    correlationId: string,
    originalException: unknown,
  ): void {
    const path = (request.originalUrl ?? request.url ?? "").split("?")[0];
    const logContext = {
      requestId,
      correlationId,
      method: request.method,
      path,
      userId: request.user?.id,
      category: errorDetails.category,
      statusCode: errorDetails.statusCode,
    };
    const logMessage = `[${requestId}] ${request.method} ${path} - ${errorDetails.statusCode} (${errorDetails.category})`;

    if (errorDetails.statusCode >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(logMessage, {
        ...logContext,
        error:
          originalException instanceof Error
            ? {
                name: originalException.name,
                message: originalException.message,
                stack: originalException.stack,
              }
            : { name: "NonError" },
      });
    } else if (errorDetails.statusCode >= Number(HttpStatus.BAD_REQUEST)) {
      this.logger.warn(logMessage, {
        ...logContext,
        message: errorDetails.message,
      });
    } else {
      this.logger.log(logMessage, logContext);
    }
  }

  private generateCorrelationId(): string {
    return `corr-${randomUUID()}`;
  }

  private deduceCategory(statusCode: number): ErrorCategory {
    if (statusCode >= 500) return ErrorCategory.SERVER;
    if (statusCode === 400) return ErrorCategory.RULE;
    return ErrorCategory.BUSINESS;
  }
}
