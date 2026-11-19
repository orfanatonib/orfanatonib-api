import { ContentGenerationJobStatus } from "../enums/content-generation-job-status.enum";
import {
  formatSseFrame,
  isActiveJobStatus,
  jobsSignature,
  latestJobPerStage,
} from "./generation-stream.utils";

describe("generation-stream.utils", () => {
  it("formata frames SSE", () => {
    expect(formatSseFrame({ event: "jobs", data: [{ a: 1 }] })).toBe(
      'event: jobs\ndata: [{"a":1}]\n\n',
    );
    expect(formatSseFrame({ comment: "a\nb" })).toBe(": a b\n\n");
  });
  it("estados ativos", () => {
    expect(isActiveJobStatus(ContentGenerationJobStatus.RUNNING)).toBe(true);
    expect(isActiveJobStatus(ContentGenerationJobStatus.SUCCEEDED)).toBe(false);
  });
  it("último job por etapa e assinatura estável", () => {
    expect(
      latestJobPerStage([
        { stageId: "a", n: 2 },
        { stageId: "a", n: 1 },
        { stageId: "b", n: 3 },
      ]),
    ).toEqual([
      { stageId: "a", n: 2 },
      { stageId: "b", n: 3 },
    ]);
    const a = {
      id: "1",
      stageId: "a",
      status: ContentGenerationJobStatus.PENDING,
      attempts: 0,
      updatedAt: new Date(1),
    };
    const b = { ...a, id: "2", stageId: "b" };
    expect(jobsSignature([a, b])).toBe(jobsSignature([b, a]));
    expect(jobsSignature([a])).not.toBe(
      jobsSignature([{ ...a, status: ContentGenerationJobStatus.RUNNING }]),
    );
  });
});
