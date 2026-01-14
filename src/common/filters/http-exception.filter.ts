import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { ErrorCategory } from '../exceptions/error-category.enum';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  category: string;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let category: string = ErrorCategory.SERVER;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string | string[]) || exception.message;
        error = (responseObj.error as string) || this.getErrorName(statusCode);
        if (responseObj.category) {
          category = responseObj.category as string;
        }
      }

      if (!category || category === ErrorCategory.SERVER) {
        category = this.deduceCategory(statusCode);
      }

    } else if (exception instanceof EntityNotFoundError) {
      statusCode = HttpStatus.NOT_FOUND;
      message = exception.message;
      error = 'Not Found';
      category = ErrorCategory.BUSINESS;
    } else if (exception instanceof QueryFailedError) {
      const driverError = (exception as any).driverError;

      if (driverError?.code === 'ER_DUP_ENTRY') {
        statusCode = HttpStatus.CONFLICT;
        message = 'Duplicate entry detected';
        error = 'Conflict';
        category = ErrorCategory.BUSINESS;
      } else if (driverError?.code === 'ER_NO_REFERENCED_ROW_2' || driverError?.code === 'ER_ROW_IS_REFERENCED_2') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Invalid relation failure';
        error = 'Bad Request';
        category = ErrorCategory.RULE;
      } else {
        message = 'Database error';
        category = ErrorCategory.SERVER;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error('Unknown exception type', JSON.stringify(exception));
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${statusCode}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${statusCode}: ${JSON.stringify(message)}`,
      );
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      error,
      category,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(errorResponse);
  }

  private deduceCategory(statusCode: number): ErrorCategory {
    if (statusCode >= 500) {
      return ErrorCategory.SERVER;
    }
    if (statusCode === 400) {
      return ErrorCategory.RULE;
    }
    return ErrorCategory.BUSINESS;
  }

  private getErrorName(statusCode: number): string {
    const errorNames: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
      [HttpStatus.BAD_GATEWAY]: 'Bad Gateway',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
    };

    return errorNames[statusCode] || 'Error';
  }
}
