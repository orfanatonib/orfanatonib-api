import { Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";

import { ComponentsRegistry } from "./discovery/components.registry";
import { RequestContextMiddleware } from "./request-context.middleware";
import { RequestContextService } from "./request-context.service";

/**
 * Contexto por execução e descoberta automática de componentes.
 *
 * Global porque logger, auditoria, filtro e jobs precisam do mesmo serviço
 * sem que cada módulo o importe.
 */
@Global()
@Module({
  providers: [
    RequestContextService,
    RequestContextMiddleware,
    ComponentsRegistry,
  ],
  exports: [
    RequestContextService,
    RequestContextMiddleware,
    ComponentsRegistry,
  ],
})
export class RequestContextModule implements NestModule {
  /** Primeiro no pipeline: o contexto precisa existir antes de qualquer guard. */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
