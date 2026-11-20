import { ContentAudience } from "./enums/content-audience.enum";
import { ContentStageType } from "./enums/content-stage-type.enum";
import type {
  ContentAudienceDefinition,
  ContentStageDefinition,
} from "./types";

export const CONTENT_STUDIO_CATALOG_VERSION = "2026-11-19.five-stages.1";

/** As cinco etapas, iguais para os quatro públicos; só o prompt de cada uma muda por público. */
const STAGES: readonly ContentStageDefinition[] = [
  {
    type: ContentStageType.LESSON,
    name: "Lição",
    position: 1,
    required: true,
    dependencies: [],
  },
  {
    type: ContentStageType.LESSON_VISUALS,
    name: "Visuais da lição",
    position: 2,
    required: true,
    dependencies: [ContentStageType.LESSON],
  },
  {
    type: ContentStageType.VERSE_VISUALS,
    name: "Visual do versículo",
    position: 3,
    required: true,
    dependencies: [ContentStageType.LESSON],
  },
  {
    type: ContentStageType.VERSE_FIXATION,
    name: "Fixação divertida do versículo",
    position: 4,
    required: true,
    dependencies: [ContentStageType.LESSON],
  },
  {
    type: ContentStageType.STANDARD_GAME,
    name: "Brincadeira divertida",
    position: 5,
    required: true,
    dependencies: [ContentStageType.LESSON],
  },
];

export const CONTENT_AUDIENCE_CATALOG: readonly ContentAudienceDefinition[] = [
  {
    audience: ContentAudience.BABY,
    name: "Baby",
    minimumAge: 0,
    maximumAge: 2,
    stages: STAGES,
  },
  {
    audience: ContentAudience.CHILD,
    name: "Crianças",
    minimumAge: 3,
    maximumAge: 11,
    stages: STAGES,
  },
  {
    audience: ContentAudience.TEEN,
    name: "Adolescentes",
    minimumAge: 12,
    maximumAge: 15,
    stages: STAGES,
  },
  {
    audience: ContentAudience.ADULT,
    name: "Adultos",
    minimumAge: 16,
    maximumAge: null,
    stages: STAGES,
  },
] as const;

/** Acompanhamento da geração por SSE. */
export const GENERATION_STREAM = {
  /** Intervalo de leitura do banco (a fonte da verdade; funciona com várias instâncias da API). */
  pollMs: 1_500,
  heartbeatMs: 15_000,
  /** O cliente reconecta se ainda houver geração ativa. */
  maxDurationMs: 4 * 60_000,
  /** Sem geração ativa por este tempo, a conexão é encerrada. */
  idleMs: 30_000,
} as const;

/**
 * Capacidade de geração do Estúdio, valendo para TODOS os administradores juntos:
 * uma geração ativa por categoria (faixa etária) de um material e, no máximo, dois materiais com geração ativa.
 * Com 4 categorias por material, são no máximo 8 gerações simultâneas.
 */
export const GENERATION_CAPACITY = {
  maxPerCategory: 1,
  maxPackages: 2,
  maxTotal: 8,
  /** Trava nomeada do MySQL que serializa a checagem + criação do job (vale entre várias instâncias da API). */
  lockName: "content-studio:generation-capacity",
  lockWaitSeconds: 10,
} as const;
