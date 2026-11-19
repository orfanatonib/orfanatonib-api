import { Inject, Injectable } from "@nestjs/common";

import {
  ResourceConflictException,
  ResourceNotFoundException,
} from "src/common/exceptions";
import { LOG_ERROR_CODES } from "src/core/observability/utils/error-code.utils";
import { LOG_STORAGE_CLOCK } from "src/shared/providers/log-storage/constants";
import {
  LogRecordType,
  LogStorageKind,
} from "src/shared/providers/log-storage/enums";
import {
  AuditStoragePort,
  ObservabilityStoragePort,
} from "src/shared/providers/log-storage/ports/log-storage.port";
import {
  Clock,
  QueryableRecordType,
} from "src/shared/providers/log-storage/types";

import { LOG_RECORDS_AUDIT_MIN_RETENTION_DAYS } from "../constants";
import { DeleteLogRecordsResponseDto } from "../dto/delete-log-record.dto";
import { assertQueryable, validateRange } from "../utils";

/**
 * Exclusão administrativa de registros (item ou intervalo).
 *
 * Existe a pedido do solicitante (2026-09-05), revendo a decisão inicial de
 * não haver rota de exclusão. A própria chamada `DELETE` é auditada pelo
 * interceptor global, então apagar deixa rastro: quem, quando, qual `eventId`
 * ou qual intervalo.
 */
@Injectable()
export class DeleteLogRecordsService {
  constructor(
    private readonly observability: ObservabilityStoragePort,
    private readonly audit: AuditStoragePort,
    @Inject(LOG_STORAGE_CLOCK) private readonly clock: Clock,
  ) {}

  /** Recusa apagar auditoria dentro da retenção mínima (`LOG_9102`). */
  private assertDeletableAudit(
    recordType: QueryableRecordType,
    upTo: Date,
  ): void {
    if (recordType !== LogRecordType.Audit) return;
    const limit =
      this.clock().getTime() -
      LOG_RECORDS_AUDIT_MIN_RETENTION_DAYS * 86_400_000;
    if (upTo.getTime() > limit) {
      throw new ResourceConflictException(
        `Auditoria com menos de ${LOG_RECORDS_AUDIT_MIN_RETENTION_DAYS} dias não pode ser apagada`,
        {
          code: LOG_ERROR_CODES.AUDIT_RETENTION_ACTIVE,
          minRetentionDays: LOG_RECORDS_AUDIT_MIN_RETENTION_DAYS,
        },
      );
    }
  }

  deleteObservability(
    eventId: string,
    occurredAt: string,
  ): Promise<DeleteLogRecordsResponseDto> {
    return this.deleteOne(LogRecordType.Observability, eventId, occurredAt);
  }

  deleteAudit(
    eventId: string,
    occurredAt: string,
  ): Promise<DeleteLogRecordsResponseDto> {
    return this.deleteOne(LogRecordType.Audit, eventId, occurredAt);
  }

  deleteObservabilityRange(
    from: string,
    to: string,
  ): Promise<DeleteLogRecordsResponseDto> {
    return this.deleteRange(LogRecordType.Observability, from, to);
  }

  deleteAuditRange(
    from: string,
    to: string,
  ): Promise<DeleteLogRecordsResponseDto> {
    return this.deleteRange(LogRecordType.Audit, from, to);
  }

  private storageOf(recordType: QueryableRecordType) {
    return recordType === LogRecordType.Audit ? this.audit : this.observability;
  }

  private async deleteOne(
    recordType: QueryableRecordType,
    eventId: string,
    occurredAt: string,
  ): Promise<DeleteLogRecordsResponseDto> {
    const storage = this.storageOf(recordType);
    assertQueryable(storage, LogStorageKind.File);
    const instant = new Date(occurredAt);
    if (Number.isNaN(instant.getTime())) {
      throw new ResourceNotFoundException("Registro não encontrado", {
        code: LOG_ERROR_CODES.RESOURCE_NOT_FOUND,
      });
    }
    this.assertDeletableAudit(recordType, instant);
    const removed = await storage.delete({
      recordType,
      eventId,
      occurredAt: instant.toISOString(),
    });
    if (!removed) {
      throw new ResourceNotFoundException("Registro não encontrado", {
        code: LOG_ERROR_CODES.RESOURCE_NOT_FOUND,
        eventId,
      });
    }
    return { deleted: 1 };
  }

  private async deleteRange(
    recordType: QueryableRecordType,
    from: string,
    to: string,
  ): Promise<DeleteLogRecordsResponseDto> {
    const storage = this.storageOf(recordType);
    assertQueryable(storage, LogStorageKind.File);
    const range = validateRange(from, to);
    this.assertDeletableAudit(recordType, range.to);
    const deleted = await storage.deleteRange({
      recordType,
      from: range.from,
      to: range.to,
    });
    return { deleted };
  }
}
