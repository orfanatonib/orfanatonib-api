import { Global, Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";

import { AutomaticActionContextGuard } from "./guards/automatic-action-context.guard";
import { AuditInterceptor } from "./interceptors/audit.interceptor";
import { ActionBoundaryService } from "./services/action-boundary.service";
import { AuditDeduplicationService } from "./services/audit-deduplication.service";
import { WriteAuditEventService } from "./services/write-audit-event.service";

/**
 * Auditoria transversal de todas as ações.
 *
 * Um guard de descoberta, um interceptor de sucesso e um filtro de falha
 * cobrem o boundary HTTP inteiro — inclusive controllers futuros — sem
 * decorator nem chamada manual. O filtro global (`common/filters`) já é
 * registrado por `APP_FILTER` no `AppModule` e recebe o serviço de auditoria
 * por injeção opcional.
 */
@Global()
@Module({
  providers: [
    AuditDeduplicationService,
    WriteAuditEventService,
    ActionBoundaryService,
    { provide: APP_GUARD, useClass: AutomaticActionContextGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [WriteAuditEventService, ActionBoundaryService],
})
export class AuditModule {}
