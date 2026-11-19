import type { ContentPackageEntity } from "../entities/content-package.entity";
import { ContentAudience } from "../enums/content-audience.enum";
import { ContentStageStatus } from "../enums/content-stage-status.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import { ContentPackageListItemResponseDto } from "./content-package-response.dto";

const stage = (
  position: number,
  stageType: ContentStageType,
  status: ContentStageStatus,
  currentVersionId: string | null,
) => ({
  position,
  stageType,
  status,
  currentVersionId,
  required: true,
});

describe("ContentPackageListItemResponseDto.fromEntity", () => {
  const entity = {
    id: "p1",
    theme: "t",
    biblicalReferences: "r",
    status: "IN_PROGRESS",
    templateCatalogVersion: "v",
    createdById: "u",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    tracks: [
      {
        audience: ContentAudience.ADULT,
        minimumAge: 18,
        stages: [
          stage(2, ContentStageType.LESSON, ContentStageStatus.FAILED, null),
          stage(
            1,
            ContentStageType.CANONICAL_BASE,
            ContentStageStatus.APPROVED,
            "v1",
          ),
        ],
      },
      {
        audience: ContentAudience.BABY,
        minimumAge: 0,
        stages: [
          stage(
            1,
            ContentStageType.CANONICAL_BASE,
            ContentStageStatus.GENERATING,
            null,
          ),
        ],
      },
    ],
  } as unknown as ContentPackageEntity;

  it("conta etapas por situação e ordena os segmentos (faixa mais nova primeiro, etapas por posição)", () => {
    const dto = ContentPackageListItemResponseDto.fromEntity(entity);
    expect(dto).toMatchObject({
      stagesCount: 3,
      approvedStagesCount: 1,
      stagesWithContentCount: 1,
      generatingStagesCount: 1,
      failedStagesCount: 1,
    });
    expect(
      dto.stageSegments.map((s) => `${s.audience}:${s.stageType}:${s.status}`),
    ).toEqual([
      "BABY:CANONICAL_BASE:GENERATING",
      "ADULT:CANONICAL_BASE:APPROVED",
      "ADULT:LESSON:FAILED",
    ]);
  });
});
