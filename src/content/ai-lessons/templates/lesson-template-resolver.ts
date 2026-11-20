import { lessonCategoryProfile } from '../constants/lesson-category-profiles.constants';
import { DEFAULT_LESSON_CATEGORY, LessonCategory, LessonStageType } from '../enums/lesson.enums';
import { isCutoutKitVisuals } from '../utils/story-visual-mode.utils';
import {
  LESSON_TEMPLATES,
  LessonTemplateContract,
  REGULAR_SCENE_VISUALS_TEMPLATE,
} from './lesson-templates';

const GAME_STAGES: readonly LessonStageType[] = [
  LessonStageType.STANDARD_GAME,
  LessonStageType.VERSE_FIXATION,
];

/**
 * Contrato da etapa para um público: o template base mais o perfil da
 * categoria (faixa etária, adaptações por idade, duração e tom).
 */
export function getLessonTemplate(
  stage: LessonStageType,
  category?: LessonCategory | null,
  visualType?: string | null,
): LessonTemplateContract {
  const resolved = category ?? DEFAULT_LESSON_CATEGORY;
  const profile = lessonCategoryProfile(resolved);
  const base =
    stage === LessonStageType.LESSON_VISUALS &&
    !isCutoutKitVisuals(resolved, visualType)
      ? REGULAR_SCENE_VISUALS_TEMPLATE
      : LESSON_TEMPLATES[stage];
  const audienceRule = `Público desta lição: ${profile.audience} (${profile.ageRange}), conduzido por ${profile.facilitator}.`;
  const exactStructure = GAME_STAGES.includes(stage)
    ? base.exactStructure.map((label) =>
        label === 'ADAPTAÇÕES POR IDADE'
          ? `ADAPTAÇÕES: ${profile.adaptations.younger} E ${profile.adaptations.older}`
          : label,
      )
    : base.exactStructure;
  return {
    ...base,
    key: `${base.key}.${profile.slug}`,
    exactStructure,
    rules: [...base.rules, audienceRule],
  };
}
