export enum LessonStatus {
  DRAFT = "DRAFT",
  IN_PROGRESS = "IN_PROGRESS",
  PACKAGE_READY = "PACKAGE_READY",
  IN_REVIEW = "IN_REVIEW",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
  READY_FOR_PUBLICATION = "READY_FOR_PUBLICATION",
  PUBLISHING = "PUBLISHING",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export enum LessonStageType {
  LESSON = "LESSON",
  LESSON_VISUALS = "LESSON_VISUALS",
  STANDARD_GAME = "STANDARD_GAME",
  VERSE_VISUALS = "VERSE_VISUALS",
  VERSE_FIXATION = "VERSE_FIXATION",
  MEDITATION_YOUNGER = "MEDITATION_YOUNGER",
  MEDITATION_OLDER = "MEDITATION_OLDER",
  MANUAL_WORK = "MANUAL_WORK",
}

/**
 * Pipeline do Estúdio Orfanato, na ordem de produção:
 * 1 lição (com dinâmica de apoio), 2 visuais da lição, 3 visual do versículo,
 * 4 fixação divertida do versículo, 5 brincadeira divertida.
 * As etapas de meditação e trabalho manual do Clubinho não fazem parte do Orfanato.
 */
export const LESSON_STAGE_ORDER: readonly LessonStageType[] = [
  LessonStageType.LESSON,
  LessonStageType.LESSON_VISUALS,
  LessonStageType.VERSE_VISUALS,
  LessonStageType.VERSE_FIXATION,
  LessonStageType.STANDARD_GAME,
];

/** Público da visita. Todos percorrem as mesmas cinco etapas; o que muda é o prompt. */
export enum LessonCategory {
  BABY = "BABY", // 0 a 2 anos
  CHILD = "CHILD", // 3 a 11 anos
  TEEN = "TEEN", // 12 a 15 anos
  ADULT = "ADULT", // 16 anos ou mais
}

export const DEFAULT_LESSON_CATEGORY = LessonCategory.CHILD;

/** Etapas por público: hoje todos usam as mesmas cinco, mas o prompt de cada uma muda. */
export const LESSON_STAGE_ORDER_BY_CATEGORY: Record<
  LessonCategory,
  readonly LessonStageType[]
> = {
  [LessonCategory.BABY]: LESSON_STAGE_ORDER,
  [LessonCategory.CHILD]: LESSON_STAGE_ORDER,
  [LessonCategory.TEEN]: LESSON_STAGE_ORDER,
  [LessonCategory.ADULT]: LESSON_STAGE_ORDER,
};

export function getLessonStageOrder(
  category?: LessonCategory | null,
): readonly LessonStageType[] {
  return LESSON_STAGE_ORDER_BY_CATEGORY[category ?? DEFAULT_LESSON_CATEGORY];
}

export enum LessonStageStatus {
  NOT_STARTED = "NOT_STARTED",
  GENERATING = "GENERATING",
  DRAFT = "DRAFT",
  PRODUCER_APPROVED = "PRODUCER_APPROVED",
  IN_REVIEW = "IN_REVIEW",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
  APPROVED = "APPROVED",
  FAILED = "FAILED",
  STALE = "STALE",
}

export enum LessonVersionSource {
  AI_GENERATED = "AI_GENERATED",
  MANUAL_EDIT = "MANUAL_EDIT",
  REGENERATION = "REGENERATION",
}

export enum LessonVisualType {
  CUTOUT_KIT = "CUTOUT_KIT",
  STORY_SEQUENCE = "STORY_SEQUENCE",
  CHARACTER_AND_EMOTION = "CHARACTER_AND_EMOTION",
  VISUAL_ANCHORS = "VISUAL_ANCHORS",
  INTERACTIVE_COLORING = "INTERACTIVE_COLORING",
}

/** Drawing style of the story visuals, independent of the format (kit or scenes). */
export enum LessonVisualStyle {
  /** Cute cartoon for young children (big heads and eyes, bright colours): the default. */
  CUTE_CARTOON = "CUTE_CARTOON",
  /** Soft children's-book painting: the style used before styles could be chosen. */
  ILLUSTRATED = "ILLUSTRATED",
  /** Bold black outline and flat colours, like the manual kits of the archive. */
  CLASSIC_CARTOON = "CLASSIC_CARTOON",
}

export enum CutoutCategory {
  CHARACTERS = "CHARACTERS",
  ANIMALS = "ANIMALS",
  BUILDINGS = "BUILDINGS",
  SCENERY = "SCENERY",
  SKY_AND_NATURE = "SKY_AND_NATURE",
  OBJECTS = "OBJECTS",
}

export enum LessonVisualOrientation {
  LANDSCAPE = "LANDSCAPE",
  PORTRAIT = "PORTRAIT",
}
