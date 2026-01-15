import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError as ClassValidatorError } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ValidationMiddleware.name);

  constructor(private readonly dtoClass: any) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.method === 'GET' || req.method === 'DELETE') {
        if (req.query && Object.keys(req.query).length > 0) {
          const queryDto = plainToClass(this.dtoClass, req.query);
          const errors = await validate(queryDto as object, {
            whitelist: true,
            forbidNonWhitelisted: true,
          });

          if (errors.length > 0) {
            throw new BadRequestException({
              message: 'Invalid query parameters',
              details: this.formatValidationErrors(errors),
              category: 'RULE',
            });
          }
        }
      } else {
        if (req.body && Object.keys(req.body).length > 0) {
          const dtoInstance = plainToClass(this.dtoClass, req.body);
          const errors = await validate(dtoInstance as object, {
            whitelist: true,
            forbidNonWhitelisted: true,
          });

          if (errors.length > 0) {
            throw new BadRequestException({
              message: 'Invalid request data',
              details: this.formatValidationErrors(errors),
              category: 'RULE',
            });
          }

          req.body = dtoInstance;
        }
      }

      next();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Validation middleware error', error);
      throw new BadRequestException({
        message: 'Validation processing failed',
        details: error.message,
        category: 'SERVER',
      });
    }
  }

  private formatValidationErrors(errors: ClassValidatorError[]): any {
    const formattedErrors: any = {};

    const processError = (error: ClassValidatorError, path = ''): void => {
      const currentPath = path ? `${path}.${error.property}` : error.property;

      if (error.constraints) {
        formattedErrors[currentPath] = Object.values(error.constraints);
      }

      if (error.children && error.children.length > 0) {
        error.children.forEach(child => processError(child, currentPath));
      }
    };

    errors.forEach(error => processError(error));

    return {
      fields: formattedErrors,
      totalErrors: Object.keys(formattedErrors).length,
    };
  }
}

export function createValidationMiddleware(dtoClass: any) {
  return new ValidationMiddleware(dtoClass);
}
