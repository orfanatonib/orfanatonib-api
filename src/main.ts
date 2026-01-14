import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters';
import { LoggingInterceptor } from './common/interceptors';
import { RateLimitingMiddleware, TimeoutMiddleware } from './common/middlewares';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    app.enableCors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
      credentials: true,
      maxAge: 86400,
    });

    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      next();
    });

    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new LoggingInterceptor());

    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: false,
      disableErrorMessages: false,
      validationError: {
        target: false,
        value: false,
      },
      exceptionFactory: (errors) => {
        const formattedErrors = errors.map(error => ({
          field: error.property,
          constraints: error.constraints,
          children: error.children?.map(child => ({
            field: child.property,
            constraints: child.constraints,
          })),
        }));

        return {
          statusCode: 400,
          message: 'Validation failed',
          error: 'Bad Request',
          category: 'RULE',
          details: formattedErrors,
        } as any;
      },
    }));

    const port = process.env.PORT ?? 3000;

    await app.listen(port);

    logger.log(`🚀 Application started successfully on port ${port}`);
    logger.log(`📊 Health check available at: http://localhost:${port}/health`);

    process.on('SIGINT', async () => {
      logger.log('🛑 Received SIGINT, shutting down gracefully...');
      await app.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.log('🛑 Received SIGTERM, shutting down gracefully...');
      await app.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();
