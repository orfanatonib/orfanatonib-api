import type { GenerationActivityRow } from "../repositories/generation-activity.repository";
import { buildGenerationActivity } from "./generation-activity.utils";

const row = (over: Partial<GenerationActivityRow>): GenerationActivityRow => ({
  jobId: "j",
  stageId: "s",
  capability: "TEXT_STRUCTURED",
  status: "RUNNING",
  attempts: 1,
  progress: null,
  errorCode: null,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:01:00.000Z",
  heartbeatAt: null,
  stageType: "LESSON",
  trackId: "t1",
  audience: "BABY",
  packageId: "p1",
  theme: "Sansão",
  biblicalReferences: "Juízes 13",
  ...over,
});

describe("buildGenerationActivity", () => {
  it("conta categorias e materiais ativos e as vagas que sobram", () => {
    const result = buildGenerationActivity(
      [
        row({ jobId: "a", trackId: "t1", packageId: "p1" }),
        row({ jobId: "b", trackId: "t2", packageId: "p1" }),
        row({ jobId: "c", trackId: "t3", packageId: "p2" }),
      ],
      [],
    );
    expect(result.usage).toMatchObject({
      activeJobs: 3,
      activeCategories: 3,
      activePackages: 2,
      freeCategorySlots: 5,
      freePackageSlots: 0,
    });
    expect(result.limits.maxTotal).toBe(8);
  });

  it("lê o progresso gravado como JSON e calcula média e duração do que terminou", () => {
    const result = buildGenerationActivity(
      [row({ progress: '{"phase":"TEXT","step":"WRITING"}' })],
      [
        row({ jobId: "x", status: "SUCCEEDED" }),
        row({ jobId: "y", status: "FAILED", errorCode: "TIMEOUT" }),
      ],
    );
    expect(result.active[0].progress).toEqual({
      phase: "TEXT",
      step: "WRITING",
    });
    expect(result.recent[0].durationMs).toBe(60_000);
    expect(result.last24h).toEqual({
      succeeded: 1,
      failed: 1,
      cancelled: 0,
      averageDurationMs: 60_000,
    });
  });
});
