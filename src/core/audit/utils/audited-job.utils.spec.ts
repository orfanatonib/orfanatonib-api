import { AuditOutcome } from "../enums";
import { ActionBoundaryService } from "../services/action-boundary.service";
import { runAuditedJob } from "./audited-job.utils";

describe("runAuditedJob", () => {
  it("sem boundary só executa e devolve o resultado", async () => {
    await expect(
      runAuditedJob(undefined, "job", () => Promise.resolve(7)),
    ).resolves.toBe(7);
  });

  it("com boundary descreve o job como ScheduledJob e usa o outcome informado", async () => {
    const run = jest.fn(
      (
        _descriptor: unknown,
        execute: () => Promise<number>,
        outcomeOf: (r: number) => AuditOutcome | null,
      ) => execute().then((result) => ({ result, outcome: outcomeOf(result) })),
    );
    const boundary = { run } as unknown as ActionBoundaryService;

    const out = await runAuditedJob(
      boundary,
      "email-outbox-drain",
      () => Promise.resolve(0),
      (n) => (n > 0 ? AuditOutcome.Failed : null),
    );

    expect(run.mock.calls[0][0]).toEqual({
      actionType: "scheduled_job",
      actionName: "email-outbox-drain",
      jobName: "email-outbox-drain",
    });
    expect(out).toEqual({ result: 0, outcome: null });
  });

  it("por padrão o outcome é Succeeded", async () => {
    const run = jest.fn(
      (
        _d: unknown,
        execute: () => Promise<string>,
        outcomeOf: (r: string) => AuditOutcome | null,
      ) => execute().then((r) => outcomeOf(r)),
    );
    const boundary = { run } as unknown as ActionBoundaryService;
    await expect(
      runAuditedJob(boundary, "j", () => Promise.resolve("ok")),
    ).resolves.toBe(AuditOutcome.Succeeded);
  });
});
