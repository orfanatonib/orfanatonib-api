import { NestFactory } from "@nestjs/core";
import type { NextFunction, Request, Response } from "express";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { StructuredLoggerService } from "./core/observability/providers/structured-logger.service";
import { writeBootstrapFailure } from "./core/observability/utils/bootstrap-failure.utils";
import { RuleException } from "./common/exceptions";
import { DEPLOYED_ENVIRONMENTS } from "./config/env.constants";
import { createCorsOptions, parseAllowedOrigins } from "./config/cors.config";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ["error", "warn", "log", "debug", "verbose"],
      bufferLogs: true,
    });
    app.useLogger(app.get(StructuredLoggerService));

    const { origins } = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);
    const environment =
      process.env.ENVIRONMENT || process.env.NODE_ENV || "local";
    if (origins.length === 0 && DEPLOYED_ENVIRONMENTS.includes(environment)) {
      logger.warn(
        "CORS_ALLOWED_ORIGINS não definida: qualquer origem é aceita com credenciais. Defina a lista de origens do front.",
      );
    }
    app.enableCors(createCorsOptions(origins));

    app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
      next();
    });

    // Filtro e interceptor globais são providers do AppModule (APP_FILTER/APP_INTERCEPTOR).
    // Encerramento gracioso pelos hooks do Nest (SIGINT/SIGTERM fecham o app).
    // Atrás de proxy/balanceador: confia só no número de saltos informado (IP real do cliente).
    const proxyHops = Number(process.env.TRUST_PROXY_HOPS);
    if (Number.isInteger(proxyHops) && proxyHops > 0) {
      (
        app.getHttpAdapter().getInstance() as {
          set: (k: string, v: number) => void;
        }
      ).set("trust proxy", proxyHops);
    }
    app.enableShutdownHooks();

    app.useGlobalPipes(
      new ValidationPipe({
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
          const formattedErrors = errors.map((error) => ({
            field: error.property,
            constraints: error.constraints,
            children: error.children?.map((child) => ({
              field: child.property,
              constraints: child.constraints,
            })),
          }));

          // Precisa ser uma exceção, não um objeto simples: o Nest lança o que
          // esta função devolve, e um objeto cru não é classificável pelo
          // GlobalExceptionFilter — virava 500 "Unknown error occurred".
          return new RuleException("Validation failed", formattedErrors);
        },
      }),
    );

    const port = process.env.PORT ?? 3000;

    await app.listen(port);

    logger.log(`🚀 Application started successfully on port ${port}`);
    logger.log(`📊 Health check available at: http://localhost:${port}/health`);
  } catch (error) {
    logger.error("❌ Failed to start application", error);
    writeBootstrapFailure(error);
    process.exit(1);
  }
}

void bootstrap();
