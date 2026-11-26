import { RequestContextService } from "src/core/request-context/request-context.service";
import { ProcessException } from "src/common/exceptions";
import {
  LogActorType,
  LogSourceType,
} from "src/shared/providers/log-storage/enums";

import { AuditActionType, AuditOutcome } from "../enums";
import { ActionBoundaryService } from "./action-boundary.service";
import { WriteAuditEventService } from "./write-audit-event.service";

describe("ActionBoundaryService", () => {
  const requestContext = new RequestContextService();
  const recordBoundaryOutcome = jest.fn();
  const boundary = new ActionBoundaryService(requestContext, {
    recordBoundaryOutcome,
  } as unknown as WriteAuditEventService);
  const descriptor = {
    actionType: AuditActionType.ScheduledJob,
    actionName: "job-x",
    jobName: "job-x",
  };

  beforeEach(() => recordBoundaryOutcome.mockClear());

  it("executa dentro de um contexto de job e grava o resultado traduzido", async () => {
    let seen: unknown;
    const result = await boundary.run(
      descriptor,
      () => {
        seen = requestContext.get();
        return Promise.resolve("ok");
      },
      () => AuditOutcome.Succeeded,
    );

    expect(result).toBe("ok");
    expect(seen).toMatchObject({
      sourceType: LogSourceType.Job,
      actorType: LogActorType.System,
      jobName: "job-x",
    });
    expect(recordBoundaryOutcome).toHaveBeenCalledWith(seen, descriptor, {
      outcome: AuditOutcome.Succeeded,
      errorCode: null,
      statusCode: null,
    });
    expect(requestContext.get()).toBeNull();
  });

  it("resultado sem ação (null) não é auditado", async () => {
    await boundary.run(
      descriptor,
      () => Promise.resolve("skip"),
      () => null,
    );
    expect(recordBoundaryOutcome).not.toHaveBeenCalled();
  });

  it("exceção vira falha com código catalogado e é relançada", async () => {
    await expect(
      boundary.run(
        descriptor,
        () =>
          Promise.reject(new ProcessException("x", { code: "DATABASE_ERROR" })),
        () => AuditOutcome.Succeeded,
      ),
    ).rejects.toBeInstanceOf(ProcessException);
    expect(recordBoundaryOutcome).toHaveBeenCalledWith(
      expect.anything(),
      descriptor,
      {
        outcome: AuditOutcome.Failed,
        errorCode: "DATABASE_ERROR",
        statusCode: null,
      },
    );
  });
});
