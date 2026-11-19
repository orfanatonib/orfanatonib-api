import { ContentStageType } from "../enums/content-stage-type.enum";
import {
  bullets,
  document,
  heading,
  labeled,
  numbered,
  paragraph,
  quote,
} from "./tiptap-nodes.util";
import type { TiptapDocument, TiptapNode } from "./tiptap.types";

type Json = Record<string, unknown>;

const asObject = (value: unknown): Json =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : {};
const asString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";
const asList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean)
    : [];
const asObjects = (value: unknown): Json[] =>
  Array.isArray(value) ? value.map(asObject) : [];

/** Rótulos (em português) das etapas no documento exportado. */
export const STAGE_DOCUMENT_TITLES: Readonly<Record<ContentStageType, string>> =
  {
    [ContentStageType.CANONICAL_BASE]: "BASE CANÔNICA",
    [ContentStageType.LESSON]: "LIÇÃO",
    [ContentStageType.DISCUSSION]: "DISCUSSÃO",
    [ContentStageType.ACTIVITY]: "ATIVIDADE",
    [ContentStageType.VISUAL]: "APOIOS VISUAIS",
    [ContentStageType.FACILITATOR_GUIDANCE]: "ORIENTAÇÃO AO FACILITADOR",
  };

function section(title: string, body: TiptapNode[]): TiptapNode[] {
  return body.length ? [heading(2, title), ...body] : [];
}

const textSection = (title: string, value: unknown): TiptapNode[] =>
  asString(value) ? section(title, [paragraph(asString(value))]) : [];

const listSection = (title: string, value: unknown): TiptapNode[] => {
  const items = asList(value);
  return items.length ? section(title, [bullets(items)]) : [];
};

function memoryVerse(value: unknown): TiptapNode[] {
  const verse = asObject(value);
  const body = asString(verse.text);
  if (!body) return [];
  const reference = asString(verse.reference);
  return section("VERSÍCULO PARA MEMORIZAR", [
    quote(reference ? `${body} (${reference})` : body),
  ]);
}

const BUILDERS: Readonly<
  Record<ContentStageType, (content: Json) => TiptapNode[]>
> = {
  [ContentStageType.CANONICAL_BASE]: (c) => [
    ...(asString(c.title) ? [heading(1, asString(c.title))] : []),
    ...(asString(c.biblicalReference)
      ? [labeled("Texto bíblico", asString(c.biblicalReference))]
      : []),
    ...memoryVerse(c.memoryVerse),
    ...listSection("ACONTECIMENTOS PRINCIPAIS", c.keyEvents),
    ...textSection("FOCO TEOLÓGICO", c.theologicalFocus),
    ...listSection("CUIDADOS PARA TODOS OS PÚBLICOS", c.audienceNotes),
  ],

  [ContentStageType.LESSON]: (c) => {
    const story = asObjects(c.story).flatMap((block) => [
      ...(asString(block.heading) ? [heading(3, asString(block.heading))] : []),
      ...(asString(block.body) ? [paragraph(asString(block.body))] : []),
    ]);
    const questions = asObjects(c.reviewQuestions).filter((item) =>
      asString(item.question),
    );
    return [
      ...(asString(c.title) ? [heading(1, asString(c.title))] : []),
      ...(asString(c.biblicalReference)
        ? [labeled("Texto bíblico", asString(c.biblicalReference))]
        : []),
      ...(asString(c.purpose)
        ? [labeled("Propósito", asString(c.purpose))]
        : []),
      ...memoryVerse(c.memoryVerse),
      ...listSection("MÚSICAS", c.songs),
      ...textSection("ABERTURA", c.opening),
      ...textSection("PRINCÍPIO BÍBLICO", c.principle),
      ...section("LIÇÃO", story),
      ...textSection("APLICAÇÃO", c.application),
      ...section(
        "PERGUNTAS DE REVISÃO",
        questions.length
          ? [
              numbered(questions.map((item) => asString(item.question))),
              ...questions.flatMap((item, index) =>
                asString(item.answer)
                  ? [labeled(`Resposta ${index + 1}`, asString(item.answer))]
                  : [],
              ),
            ]
          : [],
      ),
      ...textSection("ORAÇÃO FINAL", c.closingPrayer),
    ];
  },

  [ContentStageType.DISCUSSION]: (c) => {
    const questions = asObjects(c.questions).filter((item) =>
      asString(item.question),
    );
    return [
      ...(asString(c.title) ? [heading(1, asString(c.title))] : []),
      ...textSection("COMO ABRIR A CONVERSA", c.introduction),
      ...section(
        "PERGUNTAS",
        questions.flatMap((item, index) => [
          paragraph(`${index + 1}. ${asString(item.question)}`),
          ...(asString(item.purpose)
            ? [labeled("Para despertar", asString(item.purpose))]
            : []),
          ...(asList(item.followUps).length
            ? [labeled("Aprofundar", asList(item.followUps).join(" • "))]
            : []),
        ]),
      ),
      ...textSection("REFLEXÃO FINAL", c.reflection),
      ...listSection("COMBINADOS DO GRUPO", c.groupAgreements),
    ];
  },

  [ContentStageType.ACTIVITY]: (c) => [
    ...(asString(c.name) ? [heading(1, asString(c.name))] : []),
    ...(asString(c.objective)
      ? [labeled("Objetivo", asString(c.objective))]
      : []),
    ...(c.durationMinutes
      ? [labeled("Duração", `${String(c.durationMinutes)} minutos`)]
      : []),
    ...listSection("MATERIAIS", c.materials),
    ...textSection("PREPARAÇÃO", c.preparation),
    ...section(
      "PASSO A PASSO",
      asList(c.steps).length ? [numbered(asList(c.steps))] : [],
    ),
    ...listSection("SEGURANÇA E CUIDADO", c.safetyRules),
    ...listSection("ADAPTAÇÕES POR IDADE", c.ageAdaptations),
    ...textSection("CONEXÃO BÍBLICA", c.biblicalConnection),
  ],

  [ContentStageType.VISUAL]: (c) => {
    const items = asObjects(c.items).filter(
      (item) => asString(item.title) || asString(item.description),
    );
    return [
      ...(asString(c.title) ? [heading(1, asString(c.title))] : []),
      ...textSection("DIREÇÃO DE ARTE", c.styleDirection),
      ...items.flatMap((item, index) => [
        heading(3, `${index + 1}. ${asString(item.title) || "Apoio visual"}`),
        ...(asString(item.description)
          ? [paragraph(asString(item.description))]
          : []),
        ...(asString(item.altText)
          ? [labeled("Texto alternativo", asString(item.altText))]
          : []),
        ...(asString(item.sourceExcerpt)
          ? [labeled("Trecho ilustrado", asString(item.sourceExcerpt))]
          : []),
      ]),
    ];
  },

  [ContentStageType.FACILITATOR_GUIDANCE]: (c) => {
    const timeline = asObjects(c.timeline).filter((item) =>
      asString(item.moment),
    );
    return [
      ...textSection("VISÃO GERAL DA VISITA", c.overview),
      ...listSection("PREPARAÇÃO DA VISITA", c.preparationChecklist),
      ...section(
        "ROTEIRO DA VISITA",
        timeline.length
          ? [
              bullets(
                timeline.map(
                  (item) =>
                    `${String(item.minutes ?? "?")} min — ${asString(item.moment)}`,
                ),
              ),
            ]
          : [],
      ),
      ...listSection("DICAS DE CONDUÇÃO", c.tips),
      ...listSection("CUIDADOS DE ACOLHIMENTO", c.sensitivityNotes),
      ...textSection("ACOMPANHAMENTO DEPOIS DA VISITA", c.followUp),
    ];
  },
};

/** Documento de uma etapa a partir do conteúdo estruturado (vazio se a etapa ainda não tem conteúdo). */
export function buildStageDocument(
  stageType: ContentStageType,
  structuredContent: unknown,
): TiptapDocument {
  return document(BUILDERS[stageType](asObject(structuredContent)));
}
