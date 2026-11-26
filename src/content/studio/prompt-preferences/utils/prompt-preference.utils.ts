import {
  PROMPT_PREFERENCE_MAX_LENGTH,
  PROMPT_PREFERENCE_MIN_LENGTH,
  PROMPT_PREFERENCE_PREVIEW_HEADER,
} from "../constants";
import { containsSensitiveContentInstruction } from "../../ai/utils/ai-provider-policy.util";

export type PromptValidationProblem = "TOO_SHORT" | "TOO_LONG" | "SENSITIVE";

/** Por que a orientação não pode ser salva, ou `null` quando pode. Texto vazio não é validado (é "voltar ao padrão"). */
export function validatePromptPreference(
  value: string,
): PromptValidationProblem | null {
  const trimmed = value.trim();
  if (trimmed.length < PROMPT_PREFERENCE_MIN_LENGTH) return "TOO_SHORT";
  if (value.length > PROMPT_PREFERENCE_MAX_LENGTH) return "TOO_LONG";
  if (containsSensitiveContentInstruction(trimmed)) return "SENSITIVE";
  return null;
}

export const PROMPT_PROBLEM_MESSAGES: Record<PromptValidationProblem, string> =
  {
    TOO_SHORT: `Escreva pelo menos ${PROMPT_PREFERENCE_MIN_LENGTH} caracteres.`,
    TOO_LONG: `A orientação passou do limite de ${PROMPT_PREFERENCE_MAX_LENGTH} caracteres.`,
    SENSITIVE:
      "A orientação pede conteúdo que o Estúdio não produz (dados pessoais, identificação de pessoas ou conteúdo impróprio).",
  };

/** Texto completo da etapa para a prévia: regras oficiais + a orientação do administrador. */
export function effectivePrompt(
  basePrompt: string,
  customPrompt: string | null,
): string {
  const custom = customPrompt?.trim();
  return custom
    ? `${basePrompt}\n\n${PROMPT_PREFERENCE_PREVIEW_HEADER}\n${custom}`
    : basePrompt;
}
