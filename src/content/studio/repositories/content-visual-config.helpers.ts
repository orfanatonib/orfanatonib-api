import { ContentAudience } from "../enums/content-audience.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import { VISUAL_STYLE_OPTIONS_BY_AUDIENCE } from "../ai/generation/visual-styles.constants";
import { RuleException } from "src/common/exceptions";
import type { RequestContentStageGenerationInput } from "../types";

/**
 * "Visuais da lição" só gera depois que o admin responde às perguntas (quantidade, tipo, desenho e formato):
 * a resposta é obrigatória nessa etapa e o desenho precisa ser um dos oferecidos ao público da categoria.
 */
export function assertVisualConfig(
  stageType: ContentStageType,
  audience: ContentAudience,
  input: RequestContentStageGenerationInput,
): void {
  const config = input.visualConfig;
  if (stageType !== ContentStageType.LESSON_VISUALS) return;
  if (!config)
    throw new RuleException(
      "Responda às perguntas dos visuais (quantidade, tipo, desenho e formato) antes de gerar",
      { field: "visualConfig" },
    );
  if (!VISUAL_STYLE_OPTIONS_BY_AUDIENCE[audience].includes(config.style))
    throw new RuleException(
      "Este desenho não é oferecido para a categoria da etapa",
      { field: "visualConfig.style" },
    );
}
