import {
  ResourceNotFoundException,
  RuleException,
} from "src/common/exceptions";
import { LogRecordType } from "src/shared/providers/log-storage/enums";
import {
  AuditStoragePort,
  ObservabilityStoragePort,
} from "src/shared/providers/log-storage/ports/log-storage.port";

import { DeleteLogRecordsService } from "./delete-log-records.service";

/** Mais de 90 dias depois dos instantes usados abaixo (setembro/2026). */
const NOW = new Date("2027-01-15T12:00:00Z");

describe("DeleteLogRecordsService", () => {
  const obsDelete = jest.fn();
  const obsDeleteRange = jest.fn();
  const auditDelete = jest.fn();
  const auditDeleteRange = jest.fn();
  const service = new DeleteLogRecordsService(
    {
      queryable: true,
      delete: obsDelete,
      deleteRange: obsDeleteRange,
    } as unknown as ObservabilityStoragePort,
    {
      queryable: true,
      delete: auditDelete,
      deleteRange: auditDeleteRange,
    } as unknown as AuditStoragePort,
    () => NOW,
  );

  beforeEach(() => {
    obsDelete.mockReset();
    obsDeleteRange.mockReset();
    auditDelete.mockReset();
    auditDeleteRange.mockReset();
  });

  it("com storage file responde LOG_9101 sem apagar", async () => {
    const fileService = new DeleteLogRecordsService(
      {
        queryable: false,
        delete: obsDelete,
      } as unknown as ObservabilityStoragePort,
      { queryable: false, delete: auditDelete } as unknown as AuditStoragePort,
      () => NOW,
    );
    await expect(
      fileService.deleteAudit("evt-1", "2026-09-05T10:00:00Z"),
    ).rejects.toMatchObject({
      response: { details: { code: "LOG_9101" } },
    });
    expect(auditDelete).not.toHaveBeenCalled();
  });

  it("apaga um item do fluxo certo, normalizando o instante", async () => {
    auditDelete.mockResolvedValue(true);
    await expect(
      service.deleteAudit("evt-1", "2026-09-05T10:00:00Z"),
    ).resolves.toEqual({ deleted: 1 });
    expect(auditDelete).toHaveBeenCalledWith({
      recordType: LogRecordType.Audit,
      eventId: "evt-1",
      occurredAt: "2026-09-05T10:00:00.000Z",
    });
    expect(obsDelete).not.toHaveBeenCalled();
  });

  it("item inexistente ou instante inválido é 404", async () => {
    obsDelete.mockResolvedValue(false);
    await expect(
      service.deleteObservability("evt-1", "2026-09-05T10:00:00Z"),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    await expect(
      service.deleteObservability("evt-1", "ontem"),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(obsDelete).toHaveBeenCalledTimes(1);
  });

  it("intervalo valida antes de apagar e devolve a contagem", async () => {
    obsDeleteRange.mockResolvedValue(12);
    await expect(
      service.deleteObservabilityRange(
        "2026-09-04T00:00:00Z",
        "2026-09-05T00:00:00Z",
      ),
    ).resolves.toEqual({ deleted: 12 });
    expect(obsDeleteRange).toHaveBeenCalledWith({
      recordType: LogRecordType.Observability,
      from: new Date("2026-09-04T00:00:00Z"),
      to: new Date("2026-09-05T00:00:00Z"),
    });

    await expect(
      service.deleteAuditRange("2026-09-05T00:00:00Z", "2026-09-04T00:00:00Z"),
    ).rejects.toBeInstanceOf(RuleException);
    expect(auditDeleteRange).not.toHaveBeenCalled();
  });

  it("auditoria dentro da retenção mínima não é apagável: item e intervalo recebem LOG_9102", async () => {
    const recent = new Date(NOW.getTime() - 10 * 86_400_000).toISOString();
    await expect(service.deleteAudit("evt-1", recent)).rejects.toMatchObject({
      response: { details: { code: "LOG_9102" } },
    });
    await expect(
      service.deleteAuditRange(
        new Date(NOW.getTime() - 20 * 86_400_000).toISOString(),
        recent,
      ),
    ).rejects.toMatchObject({ response: { details: { code: "LOG_9102" } } });
    expect(auditDelete).not.toHaveBeenCalled();
    expect(auditDeleteRange).not.toHaveBeenCalled();
  });

  it("a retenção mínima vale só para auditoria: erro técnico recente pode ser apagado", async () => {
    obsDelete.mockResolvedValue(true);
    const recent = new Date(NOW.getTime() - 1 * 86_400_000).toISOString();
    await expect(service.deleteObservability("evt-1", recent)).resolves.toEqual(
      { deleted: 1 },
    );
  });
});
