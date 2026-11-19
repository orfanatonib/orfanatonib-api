import { ContentAudience } from "./enums/content-audience.enum";
import { ContentStageType } from "./enums/content-stage-type.enum";
import type { ContentAudienceDefinition } from "./types";

export const CONTENT_STUDIO_CATALOG_VERSION = "2026-10-01.mvp.1";

const COMMON_DEPENDENCY = [ContentStageType.CANONICAL_BASE] as const;

export const CONTENT_AUDIENCE_CATALOG: readonly ContentAudienceDefinition[] = [
  {
    audience: ContentAudience.BABY,
    name: "Baby",
    minimumAge: 0,
    maximumAge: 2,
    stages: [
      { type: ContentStageType.CANONICAL_BASE, name: "Base canônica", position: 1, required: true, dependencies: [] },
      { type: ContentStageType.LESSON, name: "Narrativa curta", position: 2, required: true, dependencies: COMMON_DEPENDENCY },
      { type: ContentStageType.ACTIVITY, name: "Atividade sensorial", position: 3, required: true, dependencies: [ContentStageType.LESSON] },
      { type: ContentStageType.VISUAL, name: "Apoio visual", position: 4, required: true, dependencies: [ContentStageType.LESSON] },
      { type: ContentStageType.FACILITATOR_GUIDANCE, name: "Orientação ao cuidador", position: 5, required: true, dependencies: [ContentStageType.LESSON, ContentStageType.ACTIVITY] },
    ],
  },
  {
    audience: ContentAudience.CHILD,
    name: "Crianças",
    minimumAge: 3,
    maximumAge: 11,
    stages: [
      { type: ContentStageType.CANONICAL_BASE, name: "Base canônica", position: 1, required: true, dependencies: [] },
      { type: ContentStageType.LESSON, name: "Lição", position: 2, required: true, dependencies: COMMON_DEPENDENCY },
      { type: ContentStageType.ACTIVITY, name: "Atividade", position: 3, required: true, dependencies: [ContentStageType.LESSON] },
      { type: ContentStageType.VISUAL, name: "Apoio visual", position: 4, required: true, dependencies: [ContentStageType.LESSON] },
      { type: ContentStageType.FACILITATOR_GUIDANCE, name: "Orientação ao líder", position: 5, required: true, dependencies: [ContentStageType.LESSON, ContentStageType.ACTIVITY] },
    ],
  },
  {
    audience: ContentAudience.TEEN,
    name: "Adolescentes",
    minimumAge: 12,
    maximumAge: 15,
    stages: [
      { type: ContentStageType.CANONICAL_BASE, name: "Base canônica", position: 1, required: true, dependencies: [] },
      { type: ContentStageType.LESSON, name: "Estudo", position: 2, required: true, dependencies: COMMON_DEPENDENCY },
      { type: ContentStageType.DISCUSSION, name: "Discussão", position: 3, required: true, dependencies: [ContentStageType.LESSON] },
      { type: ContentStageType.ACTIVITY, name: "Dinâmica e aplicação", position: 4, required: true, dependencies: [ContentStageType.DISCUSSION] },
      { type: ContentStageType.FACILITATOR_GUIDANCE, name: "Orientação ao facilitador", position: 5, required: true, dependencies: [ContentStageType.LESSON, ContentStageType.DISCUSSION] },
    ],
  },
  {
    audience: ContentAudience.ADULT,
    name: "Adultos",
    minimumAge: 16,
    maximumAge: null,
    stages: [
      { type: ContentStageType.CANONICAL_BASE, name: "Base canônica", position: 1, required: true, dependencies: [] },
      { type: ContentStageType.LESSON, name: "Estudo", position: 2, required: true, dependencies: COMMON_DEPENDENCY },
      { type: ContentStageType.DISCUSSION, name: "Discussão e reflexão", position: 3, required: true, dependencies: [ContentStageType.LESSON] },
      { type: ContentStageType.ACTIVITY, name: "Aplicação", position: 4, required: true, dependencies: [ContentStageType.DISCUSSION] },
      { type: ContentStageType.FACILITATOR_GUIDANCE, name: "Orientação ao facilitador", position: 5, required: true, dependencies: [ContentStageType.LESSON, ContentStageType.DISCUSSION] },
    ],
  },
] as const;

