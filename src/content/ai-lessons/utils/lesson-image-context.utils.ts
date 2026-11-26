import { lessonCategoryProfile } from "../constants/lesson-category-profiles.constants";
import { LessonImageContext } from "../providers/lesson-llm.types";

export function lessonImageContextPrompt(context?: LessonImageContext): string {
  const profile = lessonCategoryProfile(context?.category);
  return `Ilustração bíblica do Ministério Orfanato NIB para ${profile.audience}. ${profile.storyVisuals} Fidelidade ao contexto bíblico da NVI e à descrição fechada recebida da lição aprovada. Não desenhe o condutor nem os objetos de apoio citados apenas nas marcações de ação.`;
}
