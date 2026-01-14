import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError, TypeORMError } from 'typeorm';
import { ValidationError } from 'class-validator';
import { v4 as uuidv4 } from 'uuid';
import { ErrorCategory } from '../exceptions/error-category.enum';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  category: ErrorCategory;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: any;
  correlationId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request.headers['x-request-id'] as string || 'unknown';
    const correlationId = this.generateCorrelationId();

    const errorDetails = this.extractErrorDetails(exception, request);
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

  private extractErrorDetails(exception: unknown, request: Request): {
    statusCode: number;
    message: string | string[];
    error: string;
    category: ErrorCategory;
    details?: any;
  } {
    const defaultDetails = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      category: ErrorCategory.SERVER as ErrorCategory,
    };

    try {
        if (exception instanceof HttpException) {
        return this.handleHttpException(exception);
      }

      if (exception instanceof EntityNotFoundError) {
        return this.handleEntityNotFoundError(exception);
      }

      if (exception instanceof QueryFailedError) {
        return this.handleQueryFailedError(exception);
      }

      if (exception instanceof TypeORMError) {
        return this.handleTypeORMError(exception);
      }

      if (exception instanceof ValidationError) {
        return this.handleValidationError(exception);
      }

        if (exception instanceof Error) {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: exception.message,
          error: 'Internal Server Error',
          category: ErrorCategory.SERVER,
          details: { stack: exception.stack },
        };
      }

        return {
        ...defaultDetails,
        message: 'Unknown error occurred',
        details: { originalError: String(exception) },
      };

    } catch (processingError) {
        this.logger.error('Error while processing exception', processingError);
      return defaultDetails;
    }
  }

  private handleHttpException(exception: HttpException): {
    statusCode: number;
    message: string | string[];
    error: string;
    category: ErrorCategory;
    details?: any;
  } {
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[] = exception.message;
    let error = this.getErrorName(statusCode);
    let category = this.deduceCategory(statusCode);
    let details: any;

    if (typeof exceptionResponse === 'object') {
      const responseObj = exceptionResponse as Record<string, unknown>;

      if (responseObj.message) {
        message = responseObj.message as string | string[];
      }

      if (responseObj.error) {
        error = responseObj.error as string;
      }

      if (responseObj.category) {
        category = responseObj.category as ErrorCategory;
      }

      if (responseObj.details) {
        details = responseObj.details;
      }
    }

    return { statusCode, message, error, category, details };
  }

  private handleEntityNotFoundError(exception: EntityNotFoundError): {
    statusCode: number;
    message: string | string[];
    error: string;
    category: ErrorCategory;
  } {
    return {
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Resource not found',
      error: 'Not Found',
      category: ErrorCategory.BUSINESS,
    };
  }

  private handleQueryFailedError(exception: QueryFailedError): {
    statusCode: number;
    message: string | string[];
    error: string;
    category: ErrorCategory;
    details?: any;
  } {
    const driverError = (exception as any).driverError;

    if (driverError?.code === 'ER_DUP_ENTRY') {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'A record with this information already exists',
        error: 'Conflict',
        category: ErrorCategory.BUSINESS,
        details: { constraint: driverError.constraint },
      };
    }

    if (driverError?.code === 'ER_NO_REFERENCED_ROW_2') {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Cannot create/update: referenced record does not exist',
        error: 'Bad Request',
        category: ErrorCategory.RULE,
        details: { constraint: driverError.constraint },
      };
    }

    if (driverError?.code === 'ER_ROW_IS_REFERENCED_2') {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Cannot delete: record is referenced by other data',
        error: 'Conflict',
        category: ErrorCategory.RULE,
        details: { constraint: driverError.constraint },
      };
    }

    if (driverError?.code === 'ER_DATA_TOO_LONG') {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Data provided exceeds maximum allowed length',
        error: 'Bad Request',
        category: ErrorCategory.RULE,
        details: { field: driverError.field },
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database operation failed',
      error: 'Internal Server Error',
      category: ErrorCategory.SERVER,
      details: {
        code: driverError?.code,
        errno: driverError?.errno,
        sqlState: driverError?.sqlState,
      },
    };
  }

  private handleTypeORMError(exception: TypeORMError): {
    statusCode: number;
    message: string | string[];
    error: string;
    category: ErrorCategory;
  } {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database operation failed',
      error: 'Internal Server Error',
      category: ErrorCategory.SERVER,
    };
  }

  private handleValidationError(exception: ValidationError): {
    statusCode: number;
    message: string | string[];
    error: string;
    category: ErrorCategory;
    details?: any;
  } {
    const messages = this.flattenValidationErrors(exception);

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: messages,
      error: 'Bad Request',
      category: ErrorCategory.RULE,
      details: { validationErrors: exception },
    };
  }

  private flattenValidationErrors(error: ValidationError, path = ''): string[] {
    const messages: string[] = [];

    if (error.constraints) {
      Object.values(error.constraints).forEach(constraint => {
        messages.push(`${path}${error.property}: ${constraint}`);
      });
    }

    if (error.children) {
      error.children.forEach(child => {
        messages.push(...this.flattenValidationErrors(child, `${path}${error.property}.`));
      });
    }

    return messages;
  }

  private logError(
    errorDetails: any,
    request: Request,
    requestId: string,
    correlationId: string,
    originalException: unknown
  ): void {
    const logContext = {
      requestId,
      correlationId,
      method: request.method,
      url: request.url,
      userId: (request as any).user?.id,
      userAgent: request.get('User-Agent'),
      ip: request.ip || request.connection?.remoteAddress,
      category: errorDetails.category,
      statusCode: errorDetails.statusCode,
    };

    const logMessage = `[${requestId}] ${request.method} ${request.url} - ${errorDetails.statusCode} (${errorDetails.category})`;

    if (errorDetails.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(logMessage, {
        ...logContext,
        error: originalException instanceof Error ? {
          message: originalException.message,
          stack: originalException.stack,
          name: originalException.name,
        } : originalException,
      });
    } else if (errorDetails.statusCode >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(logMessage, {
        ...logContext,
        message: errorDetails.message,
        details: errorDetails.details,
      });
    } else {
      this.logger.log(logMessage, logContext);
    }
  }

  private generateCorrelationId(): string {
    return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
