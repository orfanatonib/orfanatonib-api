import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { AUDIENCE_PROFILES } from "./audience-profiles.constants";
import {
  INTERNAL_OUTPUT_FIELDS,
  STAGE_OUTPUT_SCHEMAS,
} from "./stage-output-schemas";

export class StageOutputError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Saída inválida: ${issues.slice(0, 5).join("; ")}`);
    this.name = "StageOutputError";
  }
}

export interface ValidatedStageOutput {
  /** Conteúdo pronto para gravar (sem campos internos, sem Markdown). */
  readonly content: Record<string, unknown>;
  /** Campos internos (centralMessage, reviewerNotes): vão para o snapshot, não para o editor. */
  readonly internal: Record<string, unknown>;
}

type Schema = Record<string, unknown>;
const MAX_FIELD_CHARS = 7_000;

const asText = (value: unknown): string =>
  typeof value === "string" ? value : "";
const wordCount = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

/** Remove marcas de Markdown que o modelo às vezes insere, sem mexer no texto. */
export function sanitizeText(value: string): string {
  return value
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/__(.+?)__/gs, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[Image\s*#?\d*\]/gi, "")
    .trim();
}

function sanitize(value: unknown): unknown {
  if (typeof value === "string") return sanitizeText(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        sanitize(v),
      ]),
    );
  }
  return value;
}

function checkAgainstSchema(
  value: unknown,
  schema: Schema,
  path: string,
  issues: string[],
): void {
  if (Array.isArray(schema.enum)) {
    if (!(schema.enum as unknown[]).includes(value))
      issues.push(`${path}: valor fora da lista`);
    return;
  }
  switch (schema.type) {
    case "string":
      if (typeof value !== "string") issues.push(`${path}: esperado texto`);
      else if (value.length > MAX_FIELD_CHARS)
        issues.push(`${path}: texto acima de ${MAX_FIELD_CHARS} caracteres`);
      return;
    case "integer":
      if (!Number.isInteger(value)) issues.push(`${path}: esperado inteiro`);
      return;
    case "array": {
      if (!Array.isArray(value)) {
        issues.push(`${path}: esperado lista`);
        return;
      }
      value.forEach((item, i) =>
        checkAgainstSchema(
          item,
          schema.items as Schema,
          `${path}[${i}]`,
          issues,
        ),
      );
      return;
    }
    case "object": {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        issues.push(`${path}: esperado objeto`);
        return;
      }
      const record = value as Record<string, unknown>;
      const props = (schema.properties ?? {}) as Record<string, Schema>;
      for (const key of (schema.required ?? []) as string[]) {
        if (!(key in record))
          issues.push(`${path}.${key}: campo obrigatório ausente`);
      }
      for (const key of Object.keys(record)) {
        if (!(key in props)) issues.push(`${path}.${key}: campo desconhecido`);
      }
      for (const [key, sub] of Object.entries(props)) {
        if (key in record)
          checkAgainstSchema(record[key], sub, `${path}.${key}`, issues);
      }
      return;
    }
    default:
      return;
  }
}

function inRange(
  label: string,
  n: number,
  min: number,
  max: number,
  issues: string[],
): void {
  if (n < min || n > max)
    issues.push(`${label}: ${n} fora do intervalo ${min}–${max}`);
}

function audienceRules(
  stage: ContentStageType,
  audience: ContentAudience,
  content: Record<string, unknown>,
  issues: string[],
): void {
  const p = AUDIENCE_PROFILES[audience];
  const list = (key: string): unknown[] =>
    Array.isArray(content[key]) ? (content[key] as unknown[]) : [];

  if (stage === ContentStageType.LESSON) {
    const words = list("story").reduce<number>(
      (sum, block) =>
        sum + wordCount(asText((block as { body?: unknown }).body)),
      0,
    );
    // tolerância de 20% abaixo / 25% acima do orçamento do público
    inRange(
      "story (palavras)",
      words,
      Math.floor(p.lessonWords.min * 0.8),
      Math.ceil(p.lessonWords.max * 1.25),
      issues,
    );
    inRange(
      "reviewQuestions",
      list("reviewQuestions").length,
      p.reviewQuestions.min,
      p.reviewQuestions.max,
      issues,
    );
    if (
      !asText(
        (content.memoryVerse as { text?: unknown } | undefined)?.text,
      ).trim()
    )
      issues.push("memoryVerse.text vazio");
  }
  if (stage === ContentStageType.CANONICAL_BASE) {
    if (list("keyEvents").length === 0) issues.push("keyEvents vazio");
    if (
      !asText(
        (content.memoryVerse as { text?: unknown } | undefined)?.text,
      ).trim()
    )
      issues.push("memoryVerse.text vazio");
  }
  if (stage === ContentStageType.DISCUSSION) {
    inRange(
      "questions",
      list("questions").length,
      p.discussionQuestions.min,
      p.discussionQuestions.max,
      issues,
    );
  }
  if (stage === ContentStageType.ACTIVITY) {
    inRange(
      "steps",
      list("steps").length,
      p.activitySteps.min,
      p.activitySteps.max,
      issues,
    );
    if (list("materials").length === 0) issues.push("materials vazio");
    if (list("safetyRules").length === 0) issues.push("safetyRules vazio");
    const minutes = Number(content.durationMinutes);
    inRange(
      "durationMinutes",
      minutes,
      1,
      Math.max(10, Math.round(p.sessionMinutes / 2)),
      issues,
    );
  }
  if (stage === ContentStageType.VISUAL) {
    const items = list("items") as Array<{
      id?: unknown;
      description?: unknown;
    }>;
    inRange(
      "items",
      items.length,
      p.visualItems.min,
      p.visualItems.max,
      issues,
    );
    items.forEach((item, i) => {
      if (item.id !== `visual-${String(i + 1).padStart(2, "0")}`)
        issues.push(
          `items[${i}].id deve ser visual-${String(i + 1).padStart(2, "0")}`,
        );
    });
  }
  if (stage === ContentStageType.FACILITATOR_GUIDANCE) {
    const timeline = list("timeline") as Array<{ minutes?: unknown }>;
    if (timeline.length === 0) issues.push("timeline vazio");
    const total = timeline.reduce<number>(
      (sum, t) => sum + Number(t.minutes ?? 0),
      0,
    );
    inRange(
      "timeline (minutos)",
      total,
      Math.round(p.sessionMinutes * 0.5),
      Math.round(p.sessionMinutes * 1.5),
      issues,
    );
  }
}

/**
 * Valida a saída do provedor contra o esquema da etapa E as regras do público
 * (tamanho, quantidades), higieniza Markdown e separa os campos internos.
 */
export function validateStageOutput(
  stage: ContentStageType,
  audience: ContentAudience,
  output: Record<string, unknown>,
): ValidatedStageOutput {
  const cleaned = sanitize(output) as Record<string, unknown>;
  const issues: string[] = [];
  checkAgainstSchema(
    cleaned,
    STAGE_OUTPUT_SCHEMAS[stage] as Schema,
    "$",
    issues,
  );
  if (issues.length === 0) audienceRules(stage, audience, cleaned, issues);
  if (issues.length > 0) throw new StageOutputError(issues);

  const internal: Record<string, unknown> = {};
  const content: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(cleaned)) {
    if ((INTERNAL_OUTPUT_FIELDS as readonly string[]).includes(key))
      internal[key] = value;
    else content[key] = value;
  }
  return { content, internal };
}
