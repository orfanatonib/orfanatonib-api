import { ContentStageType } from "../enums/content-stage-type.enum";
import { CHILD_GAME_AGE_GROUPS } from "../ai/generation/audience-profiles.constants";
import {
  bullets,
  document,
  heading,
  labeled,
  numbered,
  paragraph,
  paragraphs,
  quote,
  richParagraph,
  table,
  INFO_LABEL_WIDTH_PX,
  INFO_VALUE_WIDTH_PX,
  boldParagraph,
  BRAND_IMAGE_SETE_PASSOS,
  BRAND_LOGO_FOI_POR_VOCE,
  brandLogo,
  centeredBold,
  centeredHeading,
  checklistBox,
  colorBars,
  highlightBox,
  pageBreak,
} from "./tiptap-nodes.util";
import {
  AFTER_READING_PRAYER,
  HANDS_TO_SERVICE,
  CHECKBOX,
  CHECKLIST_TITLE,
  LESSON_SECTOR,
  MEDITATING,
  MEDITATION_SECTION_TITLE,
  MUSIC_SECTOR,
  THINKING_THE_STEPS,
  otherSectors,
} from "./meditation-section.constants";
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
    [ContentStageType.LESSON]: "LIÇÃO",
    [ContentStageType.LESSON_VISUALS]: "VISUAIS DA LIÇÃO",
    [ContentStageType.VERSE_VISUALS]: "VISUAL DO VERSÍCULO",
    [ContentStageType.VERSE_FIXATION]: "FIXAÇÃO DIVERTIDA DO VERSÍCULO",
    [ContentStageType.STANDARD_GAME]: "BRINCADEIRA DIVERTIDA",
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

/**
 * Versículo em partes: "Hebreus 9.22b" é a segunda parte do versículo, então o trecho começa com reticências;
 * "…a" é a primeira parte, então termina com elas. O dado guarda só o trecho; as reticências são de exibição.
 */
export function verseWithEllipsis(text: string, reference: string): string {
  const part = /\d([a-z])$/i.exec(reference.trim())?.[1]?.toLowerCase();
  if (!part) return text;
  return part === "a" ? `${text}…` : `…${text}`;
}

function memoryVerse(value: unknown): TiptapNode[] {
  const verse = asObject(value);
  const body = asString(verse.text);
  if (!body) return [];
  const reference = asString(verse.reference);
  return section("VERSÍCULO PARA MEMORIZAR", [
    quote(
      reference ? `${verseWithEllipsis(body, reference)} (${reference})` : body,
    ),
  ]);
}

/** Fixação e brincadeira. Brincadeira das crianças: um só documento com as duas brincadeiras (3 a 8 e 9 a 11 anos), cada uma em sua página. */
const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

function funDocument(c: Json, fixation: boolean): TiptapNode[] {
  const extras = fixation
    ? []
    : Array.isArray(c.extraGames)
      ? (c.extraGames as Json[])
      : [];
  if (extras.length === 0) return funBlocks(c, fixation);
  return [
    ...funBlocks(c, fixation, CHILD_GAME_AGE_GROUPS[0]?.label),
    ...extras.flatMap((game, index) => [
      pageBreak(),
      ...funBlocks(game, fixation, CHILD_GAME_AGE_GROUPS[index + 1]?.label),
    ]),
  ];
}

function funBlocks(
  c: Json,
  fixation: boolean,
  ageLabel?: string,
): TiptapNode[] {
  const verse = asObject(c.verse);
  const verseText = asString(verse.text);
  const verseRef = asString(verse.reference);
  const duration =
    typeof c.durationMinutes === "number" && c.durationMinutes > 0
      ? `${c.durationMinutes} minutos`
      : "";
  const info: string[][] = [
    ...(fixation && verseText
      ? [
          [
            "Versículo",
            `${verseWithEllipsis(verseText, verseRef)}${verseRef ? ` (${verseRef})` : ""}`,
          ],
        ]
      : []),
    ...(ageLabel ? [["Faixa etária", ageLabel]] : []),
    ...(asString(c.objective) ? [["Objetivo", asString(c.objective)]] : []),
    ...(duration ? [["Duração", duration]] : []),
    ...(asString(c.spaceNeeded) ? [["Espaço", asString(c.spaceNeeded)]] : []),
    ...(asList(c.funMechanics).length
      ? [["O que torna divertido", asList(c.funMechanics).join(" · ")]]
      : []),
  ];
  const steps = asList(c.steps);
  const titles = asList(c.stepTitles);
  const adaptations = asList(c.ageAdaptations).map((item) => {
    // "Faixa: frase" ou "Para 3 a 5 anos, frase": a faixa vai na primeira coluna.
    const at = item.indexOf(":");
    if (at > 0 && at < 40)
      return [item.slice(0, at).trim(), item.slice(at + 1).trim()];
    const lead = /^(?:Para\s+)?([^,.:;]{2,40}?),\s+(.+)$/i.exec(item);
    return lead
      ? [lead[1].trim(), capitalize(lead[2].trim())]
      : ["Adaptação", item];
  });
  return [
    ...(asString(c.name) ? [heading(1, asString(c.name))] : []),
    ...(info.length
      ? [
          table(info, {
            headerColumn: true,
            widthsPx: [INFO_LABEL_WIDTH_PX, INFO_VALUE_WIDTH_PX],
          }),
        ]
      : []),
    ...listSection("Materiais", c.materials),
    ...textSection("Preparação", c.preparation),
    ...section(
      "Como brincar",
      steps.length
        ? [
            numbered(
              steps.map((step, index) =>
                titles[index] ? `${titles[index]}. ${step}` : step,
              ),
            ),
          ]
        : [],
    ),
    ...(asList(c.safetyRules).length
      ? [
          heading(2, "Regras e segurança"),
          checklistBox(asList(c.safetyRules), { checkbox: CHECKBOX }),
        ]
      : []),
    ...(adaptations.length
      ? [
          heading(2, "Adaptações por idade"),
          table([["Grupo", "Como adaptar"], ...adaptations], {
            headerRow: true,
            widthsPx: [200, 450],
          }),
        ]
      : []),
    ...(fixation ? textSection("Como avaliar", c.evaluation) : []),
    ...textSection("Princípio bíblico", c.biblicalConnection),
  ];
}

/** "Meditando e organizando": fim de toda lição, sem as partes de versículo e brincadeiras (etapas próprias). */
function meditationSection(visitObjectives: string): TiptapNode[] {
  const box = (items: readonly string[], title?: string, boldLast = false) =>
    checklistBox(items, { title, checkbox: CHECKBOX, boldLast });
  return [
    // O fecho começa SEMPRE em página nova: logo "Foi por você", a chamada à oração e o título da meditação.
    pageBreak(),
    brandLogo(BRAND_LOGO_FOI_POR_VOCE),
    centeredBold(AFTER_READING_PRAYER),
    centeredBold(HANDS_TO_SERVICE),
    colorBars(),
    centeredHeading(2, MEDITATION_SECTION_TITLE.toUpperCase()),
    colorBars(),
    heading(3, THINKING_THE_STEPS.title),
    ...THINKING_THE_STEPS.paragraphs.map(richParagraph),
    brandLogo(BRAND_IMAGE_SETE_PASSOS),
    heading(3, LESSON_SECTOR.title),
    ...LESSON_SECTOR.paragraphs.map(richParagraph),
    boldParagraph(LESSON_SECTOR.othersTitle),
    ...otherSectors(LESSON_SECTOR.sectorName).map(richParagraph),
    box(LESSON_SECTOR.checklist, CHECKLIST_TITLE),
    richParagraph(LESSON_SECTOR.closing),
    heading(3, MUSIC_SECTOR.title),
    ...MUSIC_SECTOR.paragraphs.map(richParagraph),
    boldParagraph(MUSIC_SECTOR.emphasis),
    richParagraph(MUSIC_SECTOR.afterEmphasis),
    boldParagraph(MUSIC_SECTOR.rememberTitle),
    bullets(MUSIC_SECTOR.remember),
    boldParagraph(MUSIC_SECTOR.othersTitle),
    ...otherSectors(MUSIC_SECTOR.sectorName).map(richParagraph),
    box(MUSIC_SECTOR.checklist, CHECKLIST_TITLE),
    heading(3, MEDITATING.title),
    heading(3, MEDITATING.objectivesTitle),
    ...(visitObjectives ? [highlightBox(visitObjectives)] : []),
    richParagraph(MEDITATING.purpose),
    richParagraph(MEDITATING.intro),
    box([...MEDITATING.checklist, MEDITATING.prayerItem], undefined, true),
  ];
}

const BUILDERS: Readonly<
  Record<ContentStageType, (content: Json) => TiptapNode[]>
> = {
  [ContentStageType.LESSON]: (c) => {
    const split = (item: string): [string, string] => {
      const at = item.indexOf(" — ");
      return at < 0
        ? [item, ""]
        : [item.slice(0, at), item.slice(at + 3).trim()];
    };
    const characters = asList(c.characters).map(split);
    const materials = asList(c.supportMaterials).map(split);
    const locations = asList(c.locations);
    const info: string[][] = [
      ...(asString(c.biblicalReference)
        ? [["Referência", asString(c.biblicalReference)]]
        : []),
      ...(characters.length
        ? [["Personagens", characters.map(([name]) => name).join(", ")]]
        : []),
      ...(locations.length ? [["Locais", locations.join(", ")]] : []),
    ];
    const story = asObjects(c.story).flatMap((block) => [
      ...(asString(block.heading) ? [heading(3, asString(block.heading))] : []),
      ...paragraphs(asString(block.body)),
    ]);
    const questions = asObjects(c.reviewQuestions).filter((item) =>
      asString(item.question),
    );
    const verse = asObject(c.memoryVerse);
    const verseText = asString(verse.text);
    // Etapa ainda sem conteúdo: documento vazio (nem o fecho "Meditando e organizando" aparece).
    if (
      !asString(c.title) &&
      !story.length &&
      !characters.length &&
      !materials.length &&
      !asString(c.icebreaker) &&
      !asString(c.application)
    )
      return [];
    return [
      ...(asString(c.title) ? [heading(1, asString(c.title))] : []),
      ...(info.length
        ? [
            table(info, {
              headerColumn: true,
              widthsPx: [INFO_LABEL_WIDTH_PX, INFO_VALUE_WIDTH_PX],
            }),
          ]
        : []),
      ...section(
        "Personagens",
        characters.length
          ? [
              table([["Personagem", "Seu contexto"], ...characters], {
                headerRow: true,
                widthsPx: [190, 460],
              }),
            ]
          : [],
      ),
      ...section(
        "Materiais de apoio",
        materials.length
          ? [
              table([["Material", "O que representa"], ...materials], {
                headerRow: true,
                widthsPx: [260, 390],
              }),
            ]
          : [],
      ),
      ...section("Quebra-gelo", paragraphs(asString(c.icebreaker))),
      ...section("História", story),
      ...section("Aplicação e apelo", paragraphs(asString(c.application))),
      ...section(
        "Lição",
        questions.flatMap((item, index) => [
          richParagraph(`${index + 1}. ${asString(item.question)}`),
          ...(asString(item.answer)
            ? [labeled("R", asString(item.answer))]
            : []),
        ]),
      ),
      ...section("Versículos", [
        ...(verseText
          ? [
              quote(
                asString(verse.reference)
                  ? `${verseWithEllipsis(verseText, asString(verse.reference))} (${asString(verse.reference)})`
                  : verseText,
              ),
            ]
          : []),
        ...asList(c.verseOptions).map((option) => paragraph(option)),
      ]),
      ...meditationSection(asString(c.visitObjectives)),
    ];
  },

  [ContentStageType.LESSON_VISUALS]: (c) => {
    const items = asObjects(c.items).filter(
      (item) => asString(item.title) || asString(item.description),
    );
    return [
      ...(asString(c.title) ? [heading(1, asString(c.title))] : []),
      ...textSection("DIREÇÃO DE ARTE", c.styleDirection),
      ...listSection("FICHAS DOS PERSONAGENS", c.characterSheets),
      ...items.flatMap((item, index) => [
        heading(3, `${index + 1}. ${asString(item.title) || "Visual"}`),
        ...(asString(item.description)
          ? [paragraph(asString(item.description))]
          : []),
        ...(asString(item.altText)
          ? [labeled("Texto alternativo", asString(item.altText))]
          : []),
        ...(asString(item.sourceExcerpt)
          ? [labeled("Trecho ilustrado", asString(item.sourceExcerpt))]
          : []),
        ...(asString(item.imagePrompt)
          ? [labeled("Prompt da imagem", asString(item.imagePrompt))]
          : []),
      ]),
    ];
  },

  [ContentStageType.VERSE_VISUALS]: (c) => {
    const cards = asObjects(c.cards).filter((card) => asString(card.text));
    const reference = asString(asObject(c.referenceCard).text);
    return [
      ...(asString(c.title) ? [heading(1, asString(c.title))] : []),
      ...memoryVerse(c.verse),
      ...textSection("CRITÉRIO DA DIVISÃO", c.splitRationale),
      ...textSection("DIREÇÃO DE ARTE", c.styleDirection),
      ...listSection("PALETA", c.palette),
      ...cards.flatMap((card, index) => [
        heading(3, `Cartão ${index + 1}`),
        quote(asString(card.text)),
        ...(asString(card.concept)
          ? [labeled("Desenhos de apoio", asString(card.concept))]
          : []),
        ...(asString(card.imagePrompt)
          ? [labeled("Prompt da imagem", asString(card.imagePrompt))]
          : []),
      ]),
      ...(reference
        ? [
            heading(3, "Cartão da referência"),
            quote(reference),
            ...(asString(asObject(c.referenceCard).imagePrompt)
              ? [
                  labeled(
                    "Prompt da imagem",
                    asString(asObject(c.referenceCard).imagePrompt),
                  ),
                ]
              : []),
          ]
        : []),
    ];
  },

  [ContentStageType.VERSE_FIXATION]: (c) => funDocument(c, true),
  [ContentStageType.STANDARD_GAME]: (c) => funDocument(c, false),
};

/** Documento de uma etapa a partir do conteúdo estruturado (vazio se a etapa ainda não tem conteúdo). */
export function buildStageDocument(
  stageType: ContentStageType,
  structuredContent: unknown,
): TiptapDocument {
  return document(BUILDERS[stageType](asObject(structuredContent)));
}
