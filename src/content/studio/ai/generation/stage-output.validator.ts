import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { AUDIENCE_PROFILES } from "./audience-profiles.constants";
import type { VisualConfig } from "../../dto/visual-config.dto";
import { findSensitiveWords } from "./sensitive-words.constants";
import {
  INTERNAL_OUTPUT_FIELDS,
  STAGE_OUTPUT_SCHEMAS,
} from "./stage-output-schemas";
import {
  AUDIENCE_VISUAL_ART,
  CutoutCategory,
  LessonVisualFormat,
} from "./visual-art.constants";

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

const normalizeVerse = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[“”"'‘’«»]/g, "")
    .replace(/[\s,;:.!?…—–-]+/g, " ")
    .trim();

const verseTextOf = (value: unknown): string =>
  asText((value as { text?: unknown } | undefined)?.text);

/** Versículo aprovado na lição, quando já existe (fonte fechada das etapas seguintes). */
export interface UpstreamVerse {
  readonly text: string;
  readonly reference: string;
}

function checkVerseMatches(
  verse: unknown,
  upstream: UpstreamVerse | null | undefined,
  issues: string[],
): void {
  if (!upstream) return;
  const record = (verse ?? {}) as { text?: unknown; reference?: unknown };
  if (normalizeVerse(asText(record.text)) !== normalizeVerse(upstream.text))
    issues.push("verse.text difere do versículo aprovado na lição");
  if (asText(record.reference).trim() !== upstream.reference.trim())
    issues.push("verse.reference difere da referência aprovada na lição");
}

function checkFunDocument(
  p: (typeof AUDIENCE_PROFILES)[ContentAudience],
  content: Record<string, unknown>,
  list: (key: string) => unknown[],
  issues: string[],
): void {
  inRange(
    "steps",
    list("steps").length,
    p.activitySteps.min,
    p.activitySteps.max,
    issues,
  );
  if (list("materials").length === 0) issues.push("materials vazio");
  if (list("funMechanics").length === 0) issues.push("funMechanics vazio");
  if (list("safetyRules").length === 0) issues.push("safetyRules vazio");
  if (list("ageAdaptations").length !== 2)
    issues.push("ageAdaptations deve ter exatamente duas frases");
  inRange(
    "durationMinutes",
    Number(content.durationMinutes),
    p.gameMinutes.min,
    p.gameMinutes.max,
    issues,
  );
  // Imagem compilada: um título curto por passo (escritos na arte) e a frase do quadro final.
  const stepTitles = list("stepTitles").map(asText);
  if (stepTitles.length !== list("steps").length)
    issues.push(
      `stepTitles: ${stepTitles.length} títulos para ${list("steps").length} passos (deve haver um por passo)`,
    );
  stepTitles.forEach((title, i) => {
    if (!title.trim() || wordCount(title) > 5)
      issues.push(`stepTitles[${i}] vazio ou com mais de 5 palavras`);
  });
  const closing = asText(content.closingPhrase).trim();
  if (!closing || wordCount(closing) > 12)
    issues.push("closingPhrase vazia ou com mais de 12 palavras");
  if (!asText(content.visualSummary).trim()) issues.push("visualSummary vazio");
  if (!asText(content.imagePrompt).trim()) issues.push("imagePrompt vazio");
}

/** Palavras que indicam risco ou exposição em passos e materiais (sem acento, minúsculas). */
const UNSAFE_FUN_PATTERN =
  /(?<![a-z])(vend[ae]s?|vendad[oa]s?|vendar|faca|facas|tesoura|tesouras|estilete|fogo|vela|velas|fosforo|isqueiro|escada|escadas|empurr\w*|castigo|punic\u0327?ao|prenda)(?![a-z])/;
/** O que o bebê nunca pode ter (objeto pequeno, correria, competição, som alto). */
const UNSAFE_BABY_PATTERN =
  /(?<![a-z])(bexig\w*|bal[aã]o|baloes|bolinha de gude|moeda|moedas|pilha|pilhas|corr(er|a|am|ia)|correria|placar|cronometr\w*|competi\w*|apito)(?![a-z])/;

/**
 * Minúsculas sem acentos, MAS mantendo a cedilha: sem ela, "faça" (verbo) viraria "faca" (objeto cortante).
 */
const plain = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u0326\u0328-\u036f]/g, "")
    .toLowerCase();

/** Fixação e brincadeira: nada de risco em passos, materiais, mecânicas e preparação (as regras de segurança podem citar). */
function checkFunSafety(
  audience: ContentAudience,
  content: Record<string, unknown>,
  issues: string[],
): void {
  const parts: Array<[string, unknown]> = [
    ["steps", content.steps],
    ["materials", content.materials],
    ["funMechanics", content.funMechanics],
    ["preparation", content.preparation],
  ];
  for (const [field, value] of parts) {
    const text = plain(
      Array.isArray(value) ? value.map(asText).join(" ; ") : asText(value),
    );
    const generic = UNSAFE_FUN_PATTERN.exec(text)?.[1];
    if (generic)
      issues.push(
        `${field}: "${generic}" é risco ou exposição; troque por algo seguro`,
      );
    const baby =
      audience === ContentAudience.BABY
        ? UNSAFE_BABY_PATTERN.exec(text)?.[1]
        : undefined;
    if (baby)
      issues.push(
        `${field}: "${baby}" não serve para bebês (objeto pequeno, correria, competição ou som alto)`,
      );
  }
}

/** Brincadeira em espaço pequeno: nada de correr, percurso, pista, circuito, estafeta ou quadra (sem acento, minúsculas). */
const BIG_SPACE_PATTERN =
  /(?<![a-z])(corr(er|e|a|am|ida|idas|ia|endo|erem)|percurso|pista|circuito|quadra|campo|patio|estafeta|revezamento|trilha|trilhas|cabo de guerra)(?![a-z])/;

function checkGameSpace(
  content: Record<string, unknown>,
  issues: string[],
): void {
  if (!asText(content.spaceNeeded).trim()) issues.push("spaceNeeded vazio");
  const parts: Array<[string, unknown]> = [
    ["steps", content.steps],
    ["materials", content.materials],
    ["funMechanics", content.funMechanics],
    ["preparation", content.preparation],
    ["spaceNeeded", content.spaceNeeded],
  ];
  for (const [field, value] of parts) {
    const text = plain(
      Array.isArray(value) ? value.map(asText).join(" ; ") : asText(value),
    );
    const big = BIG_SPACE_PATTERN.exec(text)?.[1];
    if (big)
      issues.push(
        `${field}: "${big}" pede espaço grande; a brincadeira tem de caber em uma mesa ou roda pequena`,
      );
  }
}

/** Brincadeira: uma por categoria (duas para crianças: 3 a 8 e 9 a 11 anos), todas de espaço pequeno e seguras. */
function checkGames(
  audience: ContentAudience,
  p: (typeof AUDIENCE_PROFILES)[ContentAudience],
  content: Record<string, unknown>,
  issues: string[],
): void {
  const extra = Array.isArray(content.extraGames)
    ? (content.extraGames as Array<Record<string, unknown>>)
    : [];
  const expected = audience === ContentAudience.CHILD ? 1 : 0;
  if (extra.length !== expected)
    issues.push(
      expected
        ? "extraGames deve ter exatamente uma brincadeira (a de 9 a 11 anos)"
        : "extraGames deve ser uma lista vazia para esta categoria",
    );
  const games = [content, ...extra];
  games.forEach((game, index) => {
    const found: string[] = [];
    const list = (key: string): unknown[] =>
      Array.isArray(game[key]) ? (game[key] as unknown[]) : [];
    checkFunDocument(p, game, list, found);
    checkFunSafety(audience, game, found);
    checkGameSpace(game, found);
    issues.push(
      ...found.map((issue) =>
        index === 0 ? issue : `extraGames[${index - 1}].${issue}`,
      ),
    );
  });
  if (
    games.length > 1 &&
    new Set(games.map((game) => plain(asText(game.name)))).size < games.length
  )
    issues.push(
      "as brincadeiras de cada faixa etária devem ser diferentes (nome e mecânica)",
    );
}

/** Fixação: o versículo aprovado precisa aparecer escrito nos passos (é o que se fixa e se aprende). */
function checkVerseInSteps(
  content: Record<string, unknown>,
  issues: string[],
): void {
  const verse = content.verse as { text?: unknown } | undefined;
  const words = normalizeVerse(asText(verse?.text)).split(" ").filter(Boolean);
  if (words.length < 3) return;
  const steps = normalizeVerse(
    (Array.isArray(content.steps) ? content.steps : []).map(asText).join(" "),
  );
  const opening = words.slice(0, 3).join(" ");
  if (!steps.includes(opening))
    issues.push(
      "steps: o versículo aprovado precisa aparecer escrito, exatamente como em verse, em pelo menos um passo",
    );
}

function audienceRules(
  stage: ContentStageType,
  audience: ContentAudience,
  content: Record<string, unknown>,
  upstream: UpstreamVerse | null | undefined,
  issues: string[],
  theme?: string,
  visualConfig?: VisualConfig | null,
): void {
  const p = AUDIENCE_PROFILES[audience];
  const list = (key: string): unknown[] =>
    Array.isArray(content[key]) ? (content[key] as unknown[]) : [];

  if (stage === ContentStageType.LESSON) {
    if (theme) normalizeLessonTitle(content, theme, issues);
    // Versículo em partes ("Hebreus 9.22b"): o dado guarda só o trecho; as reticências são de exibição.
    const memory = content.memoryVerse as { text?: unknown } | undefined;
    if (memory && typeof memory.text === "string")
      memory.text = memory.text
        .replace(/^\s*(…|\.{3})\s*/, "")
        .replace(/\s*(…|\.{3})\s*$/, "")
        .trim();
    // Bebê: a aplicação é carinho no ritmo da cantiga, não uma lista de ensinos ("O primeiro… o segundo…").
    if (
      audience === ContentAudience.BABY &&
      /(?<!\p{L})(primeiro|segundo|terceiro)(?!\p{L})/iu.test(
        asText(content.application),
      )
    )
      issues.push(
        'application do bebê não lista ensinos ("O primeiro… o segundo…"): use duas ou três frases doces e a oração',
      );
    const words = list("story").reduce<number>(
      (sum, block) =>
        sum + wordCount(asText((block as { body?: unknown }).body)),
      0,
    );
    const story = list("story")
      .map((block) => asText((block as { body?: unknown }).body))
      .join(" ");
    // tolerância de 20% abaixo / 25% acima do orçamento do público
    inRange(
      "story (palavras)",
      words,
      Math.floor(p.lessonWords.min * 0.8),
      Math.ceil(p.lessonWords.max * 1.25),
      issues,
    );
    // Falas em discurso direto: aspas curvas (abre/fecha) ou retas (duas por fala).
    const lines =
      (story.match(/“/g) ?? []).length +
      Math.floor((story.match(/"/g) ?? []).length / 2);
    if (lines < p.minQuotes)
      issues.push(
        `story: poucas falas em discurso direto (${lines} de pelo menos ${p.minQuotes})`,
      );
    inRange(
      "reviewQuestions",
      list("reviewQuestions").length,
      p.reviewQuestions.min,
      p.reviewQuestions.max,
      issues,
    );
    // Versículo curto: o do bebê é de poucas palavras; o do adulto pode ser maior.
    const verse = content.memoryVerse as { text?: unknown } | undefined;
    const verseWords = wordCount(asText(verse?.text));
    if (verseWords > Math.ceil(p.verseMaxWords * 1.2))
      issues.push(
        `memoryVerse: ${verseWords} palavras, acima do máximo ${p.verseMaxWords} para este público`,
      );
    list("verseOptions").forEach((option, index) => {
      const quoted = /“([^”]*)”/.exec(asText(option))?.[1] ?? "";
      if (wordCount(quoted) > Math.ceil(p.verseMaxWords * 1.2))
        issues.push(
          `verseOptions[${index}]: versículo longo demais para este público (máximo ${p.verseMaxWords} palavras)`,
        );
    });
    inRange(
      "supportMaterials",
      list("supportMaterials").length,
      p.supportMaterials.min,
      p.supportMaterials.max,
      issues,
    );
    if (list("characters").length === 0) issues.push("characters vazio");
    if (list("verseOptions").length !== 2)
      issues.push("verseOptions deve ter exatamente duas opções");
    if (!verseTextOf(content.memoryVerse).trim())
      issues.push("memoryVerse.text vazio");
    const marker = new RegExp(`\\(${p.facilitatorAction}:`, "gi");
    const actions =
      (asText(content.icebreaker).match(marker)?.length ?? 0) +
      list("story").reduce<number>(
        (sum, block) =>
          sum +
          (asText((block as { body?: unknown }).body).match(marker)?.length ??
            0),
        0,
      );
    inRange(
      `marcações (${p.facilitatorAction}:)`,
      actions,
      p.teacherActions.min,
      p.teacherActions.max + 2,
      issues,
    );
  }
  if (stage === ContentStageType.LESSON_VISUALS) {
    const items = list("items") as Array<{
      id?: unknown;
      category?: unknown;
      imagePrompt?: unknown;
      elements?: unknown;
    }>;
    if (!asText(content.styleDirection).trim())
      issues.push("styleDirection vazio");
    // Com as escolhas do admin, a quantidade e o tipo são exatamente os pedidos; sem elas, os do público.
    const scenes = visualConfig
      ? visualConfig.format === LessonVisualFormat.STORY_SCENES
      : AUDIENCE_VISUAL_ART[audience].format ===
        LessonVisualFormat.STORY_SCENES;
    if (visualConfig) {
      if (items.length !== visualConfig.quantity)
        issues.push(
          `items: ${items.length} imagens, mas o administrador pediu exatamente ${visualConfig.quantity}`,
        );
    } else {
      inRange(
        "items",
        items.length,
        p.visualItems.min,
        p.visualItems.max,
        issues,
      );
    }
    items.forEach((item, i) => {
      if (item.id !== `visual-${String(i + 1).padStart(2, "0")}`)
        issues.push(
          `items[${i}].id deve ser visual-${String(i + 1).padStart(2, "0")}`,
        );
      if (!asText(item.imagePrompt).trim())
        issues.push(`items[${i}].imagePrompt vazio`);
      if ((item.category === CutoutCategory.SCENE) !== scenes)
        issues.push(
          scenes
            ? `items[${i}].category deve ser SCENE (cenas completas)`
            : `items[${i}].category não pode ser SCENE (kit de recortes)`,
        );
      const elements = Array.isArray(item.elements) ? item.elements : [];
      if (!scenes && elements.length === 0)
        issues.push(`items[${i}].elements vazio (kit de recortes)`);
      if (!scenes && elements.length > p.maxKitElements)
        issues.push(
          `items[${i}].elements: ${elements.length} peças, máximo ${p.maxKitElements} por prancha para este público`,
        );
    });
  }
  if (stage === ContentStageType.VERSE_VISUALS) {
    checkVerseMatches(content.verse, upstream, issues);
    const cards = list("cards") as Array<{
      id?: unknown;
      text?: unknown;
      imagePrompt?: unknown;
    }>;
    const cardRange = AUDIENCE_VISUAL_ART[audience].verseCardCount;
    inRange("cards", cards.length, cardRange.min, cardRange.max, issues);
    // Palavras por cartão: poucas o bastante para letras gigantes, mas sem fragmentar o sentido do versículo.
    const words = AUDIENCE_VISUAL_ART[audience].verseCardWords;
    const totalWords = cards.reduce(
      (sum, card) => sum + wordCount(asText(card.text)),
      0,
    );
    cards.forEach((card, i) => {
      const n = wordCount(asText(card.text));
      if (n > words.max)
        issues.push(
          `cards[${i}]: ${n} palavras, acima de ${words.max}; divida em mais cartões (cada um uma unidade de sentido completa)`,
        );
      if (n < words.min && totalWords >= words.min * 2)
        issues.push(
          `cards[${i}]: só ${n} palavra(s), abaixo de ${words.min}; junte com o trecho vizinho para não perder o sentido`,
        );
    });
    const palette = list("palette");
    inRange("palette", palette.length, 1, 3, issues);
    cards.forEach((card, i) => {
      if (card.id !== `verso-${String(i + 1).padStart(2, "0")}`)
        issues.push(
          `cards[${i}].id deve ser verso-${String(i + 1).padStart(2, "0")}`,
        );
    });
    cards.forEach((card, i) => {
      if (!asText(card.imagePrompt).trim())
        issues.push(`cards[${i}].imagePrompt vazio`);
    });
    const joined = cards.map((card) => asText(card.text)).join(" ");
    if (normalizeVerse(joined) !== normalizeVerse(verseTextOf(content.verse)))
      issues.push("os cartões, em ordem, não reconstroem o versículo");
    const reference = asText(
      (content.referenceCard as { text?: unknown } | undefined)?.text,
    ).trim();
    const verse = content.verse as { reference?: unknown } | undefined;
    if (
      !asText(
        (content.referenceCard as { imagePrompt?: unknown } | undefined)
          ?.imagePrompt,
      ).trim()
    )
      issues.push("referenceCard.imagePrompt vazio");
    if (reference !== asText(verse?.reference).trim())
      issues.push("referenceCard.text deve ser somente a referência completa");
  }
  if (stage === ContentStageType.VERSE_FIXATION) {
    checkVerseMatches(content.verse, upstream, issues);
    checkFunDocument(p, content, list, issues);
    checkFunSafety(audience, content, issues);
    checkVerseInSteps(content, issues);
    if (!asText(content.evaluation).trim()) issues.push("evaluation vazio");
  }
  if (stage === ContentStageType.STANDARD_GAME)
    checkGames(audience, p, content, issues);
}

/** Textos que o público LÊ ou VÊ em cada etapa (o material do voluntário fica de fora). */
function presentedFields(
  stage: ContentStageType,
  content: Record<string, unknown>,
): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const add = (field: string, value: unknown) => {
    if (typeof value === "string" && value.trim()) out.push([field, value]);
  };
  const each = (key: string, fields: readonly string[]) => {
    const items = Array.isArray(content[key]) ? content[key] : [];
    items.forEach((item, index) => {
      const record = (item ?? {}) as Record<string, unknown>;
      for (const field of fields)
        add(`${key}[${index}].${field}`, record[field]);
    });
  };
  const strings = (key: string) => {
    const items = Array.isArray(content[key]) ? content[key] : [];
    items.forEach((item, index) => add(`${key}[${index}]`, item));
  };
  const verse = (key: string) => {
    const value = (content[key] ?? {}) as Record<string, unknown>;
    add(`${key}.text`, value.text);
  };
  switch (stage) {
    case ContentStageType.LESSON:
      add("title", content.title);
      add("icebreaker", content.icebreaker);
      each("story", ["heading", "body"]);
      add("application", content.application);
      each("reviewQuestions", ["question", "answer"]);
      verse("memoryVerse");
      strings("verseOptions");
      break;
    case ContentStageType.VERSE_VISUALS:
      verse("verse");
      each("cards", ["text"]);
      break;
    case ContentStageType.VERSE_FIXATION:
    case ContentStageType.STANDARD_GAME:
      add("name", content.name);
      add("objective", content.objective);
      strings("funMechanics");
      strings("steps");
      strings("safetyRules");
      add("biblicalConnection", content.biblicalConnection);
      add("evaluation", content.evaluation);
      if (stage === ContentStageType.VERSE_FIXATION) verse("verse");
      // Brincadeiras extras (crianças de 9 a 11 anos): também são lidas pelo público.
      (Array.isArray(content.extraGames) ? content.extraGames : []).forEach(
        (game, index) => {
          const record = (game ?? {}) as Record<string, unknown>;
          for (const key of ["name", "objective", "biblicalConnection"])
            add(`extraGames[${index}].${key}`, record[key]);
          for (const key of ["funMechanics", "steps", "safetyRules"])
            (Array.isArray(record[key]) ? record[key] : []).forEach(
              (item: unknown, at: number) =>
                add(`extraGames[${index}].${key}[${at}]`, item),
            );
        },
      );
      break;
    default:
      break;
  }
  return out;
}

/** Palavras sensíveis no texto apresentado: a geração é recusada e refeita sem elas. */
function checkSensitiveWords(
  stage: ContentStageType,
  content: Record<string, unknown>,
  issues: string[],
): void {
  const found = new Map<string, string[]>();
  for (const [field, value] of presentedFields(stage, content))
    for (const word of findSensitiveWords(value)) {
      const where = found.get(word) ?? [];
      if (where.length < 3) where.push(field);
      found.set(word, where);
    }
  for (const [word, where] of found)
    issues.push(
      `palavra sensível (${word}) em ${where.join(", ")}: reescreva sem ela`,
    );
}

/**
 * Título da lição: se o admin informou só o tema ("SANSÃO"), o título é "SANSÃO: Subtítulo" (o subtítulo vem da IA);
 * se o tema já tem subtítulo ("SANSÃO: Deus cuida e salva"), o título é exatamente o tema, sem gerar outro.
 */
export function normalizeLessonTitle(
  content: Record<string, unknown>,
  theme: string,
  issues: string[],
): void {
  const base = theme.trim();
  if (base.includes(":")) {
    content.title = base;
    return;
  }
  const title = asText(content.title).trim();
  const match = /^([^:]+):\s*(\S.*)$/.exec(title);
  if (!match || match[1].trim().toLowerCase() !== base.toLowerCase()) {
    issues.push(`title deve ser "${base}: subtítulo"`);
    return;
  }
  const subtitle = match[2].trim().replace(/[.!]+$/, "");
  if (wordCount(subtitle) > 8) {
    issues.push("title: subtítulo longo demais (máximo 8 palavras)");
    return;
  }
  content.title = `${base}: ${subtitle}`;
}

/**
 * Valida a saída do provedor contra o esquema da etapa E as regras do público
 * (tamanho, quantidades), higieniza Markdown e separa os campos internos.
 */
export function validateStageOutput(
  stage: ContentStageType,
  audience: ContentAudience,
  output: Record<string, unknown>,
  upstreamVerse?: UpstreamVerse | null,
  theme?: string,
  visualConfig?: VisualConfig | null,
): ValidatedStageOutput {
  const cleaned = sanitize(output) as Record<string, unknown>;
  const issues: string[] = [];
  checkAgainstSchema(
    cleaned,
    STAGE_OUTPUT_SCHEMAS[stage] as Schema,
    "$",
    issues,
  );
  if (issues.length === 0)
    audienceRules(
      stage,
      audience,
      cleaned,
      upstreamVerse,
      issues,
      theme,
      visualConfig,
    );
  if (issues.length === 0) checkSensitiveWords(stage, cleaned, issues);
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
