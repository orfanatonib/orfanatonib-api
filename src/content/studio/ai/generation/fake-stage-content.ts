import { verseCardLookIds } from "./verse-card-looks.constants";
import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { AUDIENCE_PROFILES } from "./audience-profiles.constants";
import {
  AUDIENCE_VISUAL_ART,
  CutoutCategory,
  LessonVisualFormat,
  VisualItemSize,
} from "./visual-art.constants";

const filler = (words: number, seed: string): string =>
  Array.from({ length: words }, (_, i) =>
    i % 9 === 8 ? `${seed}.` : seed,
  ).join(" ");

/**
 * Conteúdo determinístico por etapa e público para o provedor simulado (E2E): cumpre o esquema e
 * as regras do público, diferenciando bebê / criança / adolescente / adulto como o provedor real.
 */
export function fakeStageContent(
  stage: ContentStageType,
  audience: ContentAudience,
  theme: string,
  visualConfig?: { quantity?: number; format?: string } | null,
): Record<string, unknown> {
  const p = AUDIENCE_PROFILES[audience];
  const verse = {
    text: "Porque Deus tanto amou o mundo.",
    reference: "João 3.16",
  };
  const central = `Mensagem central simulada (${p.label}).`;
  const action = (n: number): string =>
    `(${p.facilitatorAction}: mostre o material ${n}.)`;

  switch (stage) {
    case ContentStageType.LESSON: {
      const words = Math.round((p.lessonWords.min + p.lessonWords.max) / 2);
      const blocks = Math.ceil(words / 350);
      return {
        centralMessage: central,
        title: theme.includes(":") ? theme : `${theme}: Deus cuida e salva`,
        biblicalReference: "João 3.16",
        characters: [
          "Jesus — O Filho de Deus.",
          "Nicodemos — Um líder curioso.",
        ],
        locations: ["Israel", "Jerusalém"],
        supportMaterials: Array.from(
          { length: p.supportMaterials.min },
          (_, i) =>
            `Objeto ${i + 1} — representa a ideia ${i + 1} da história.`,
        ),
        icebreaker: `Abertura para ${p.label.toLowerCase()}. ${action(1)}`,
        story: Array.from({ length: blocks }, (_, i) => ({
          heading: `Parte ${i + 1}`,
          body: `${filler(Math.min(350, words - i * 350), p.label.toLowerCase())}${
            i === 0
              ? ` ${Array.from({ length: Math.max(0, p.teacherActions.min - 1) }, (_, n) => action(n + 2)).join(" ")} ${Array.from({ length: p.minQuotes }, () => "“Fala.”").join(" ")}`
              : ""
          }`,
        })),
        application: `Aplicação simulada. "Deus, obrigado pelo teu amor. Amém."`,
        reviewQuestions: Array.from(
          { length: p.reviewQuestions.min },
          (_, i) => ({
            question: `Pergunta ${i + 1}?`,
            answer: `Resposta ${i + 1}.`,
          }),
        ),
        visitObjectives:
          "Mostrar que com Deus podemos vencer o mal. Mostrar que em Jesus podemos ser salvos.",
        memoryVerse: verse,
        verseOptions: [
          `Opção 1 (foco no amor): “${verse.text}” (${verse.reference})`,
          "Opção 2 (foco na salvação): “Quem crê tem a vida.” (João 3.36)",
        ],
        reviewerNotes: "",
      };
    }
    case ContentStageType.LESSON_VISUALS: {
      const scenes = visualConfig?.format
        ? String(visualConfig.format) ===
          String(LessonVisualFormat.STORY_SCENES)
        : AUDIENCE_VISUAL_ART[audience].format ===
          LessonVisualFormat.STORY_SCENES;
      const quantity =
        typeof visualConfig?.quantity === "number"
          ? visualConfig.quantity
          : p.visualItems.min;
      return {
        centralMessage: central,
        title: `Visuais da lição — ${p.label}`,
        styleDirection: "Cores vivas e formas simples.",
        characterSheets: ["Personagem — adulto, pele morena, túnica azul."],
        items: Array.from({ length: quantity }, (_, i) => ({
          id: `visual-${String(i + 1).padStart(2, "0")}`,
          title: `Imagem ${i + 1}`,
          description: "Cena simples da passagem.",
          altText: "Ilustração.",
          sourceExcerpt: "Trecho da lição.",
          category: scenes ? CutoutCategory.SCENE : CutoutCategory.CHARACTERS,
          size: scenes ? VisualItemSize.LARGE : VisualItemSize.MEDIUM,
          variantOf: "",
          layoutPlan: "Elementos grandes e separados.",
          elements: scenes
            ? []
            : [
                {
                  label: "Personagem",
                  description: "Personagem da passagem.",
                  category: CutoutCategory.CHARACTERS,
                  size: VisualItemSize.MEDIUM,
                  storyEvidence: "Trecho da lição.",
                  variantOf: "",
                },
              ],
          imagePrompt: `Imagem simulada ${i + 1} no estilo do público ${p.label}.`,
        })),
        reviewerNotes: "",
      };
    }
    case ContentStageType.VERSE_VISUALS:
      return {
        centralMessage: central,
        title: `Versículo — ${p.label}`,
        verse,
        splitRationale: "Dividido em unidades de sentido.",
        lookId: verseCardLookIds(audience)[0] ?? "padrao",
        styleDirection: "Fundo quente, até três cores.",
        palette: ["laranja-sol", "marrom-café", "creme"],
        cards: [
          {
            id: "verso-01",
            text: "Porque Deus tanto",
            concept: "Pequenos corações.",
            imagePrompt: 'Cartão com o texto exato "Porque Deus tanto".',
            altText: "Cartão um.",
          },
          {
            id: "verso-02",
            text: "amou o mundo.",
            concept: "Pequeno globo.",
            imagePrompt: 'Cartão com o texto exato "amou o mundo.".',
            altText: "Cartão dois.",
          },
        ],
        referenceCard: {
          text: verse.reference,
          imagePrompt: `Cartão com o texto exato "${verse.reference}".`,
          altText: "Referência.",
        },
        reviewerNotes: "",
      };
    case ContentStageType.VERSE_FIXATION:
    case ContentStageType.STANDARD_GAME: {
      const fixation = stage === ContentStageType.VERSE_FIXATION;
      const plan = (name: string) => ({
        name,
        objective: "Objetivo simulado.",
        funMechanics:
          audience === ContentAudience.BABY
            ? ["Cantiga com gestos", "Balanço suave no colo"]
            : fixation
              ? ["Revezamento em equipes", "Desafio dos trechos"]
              : ["Pontaria em equipes", "Torre de copos"],
        materials: ["1 manta", "2 bolas macias"],
        preparation: "Preparação simulada.",
        steps: Array.from({ length: p.activitySteps.min }, (_, i) =>
          i === 0 && fixation
            ? `Todos dizem juntos: ${verse.text} (${verse.reference}).`
            : `Passo ${i + 1}.`,
        ),
        safetyRules: ["Supervisão constante."],
        durationMinutes: p.gameMinutes.min,
        ageAdaptations: [
          `${p.adaptations.younger}: simplifique.`,
          `${p.adaptations.older}: desafie.`,
        ],
        biblicalConnection: "Liga-se ao princípio.",
        stepTitles: Array.from(
          { length: p.activitySteps.min },
          (_, i) => `Passo ${i + 1}`,
        ),
        closingPhrase: "Todos juntos repetem o versículo!",
        visualSummary: "Imagem-resumo (compilado-01) da dinâmica.",
        imagePrompt: `Infográfico simulado da dinâmica no estilo do público ${p.label}.`,
      });
      if (fixation)
        return {
          centralMessage: central,
          ...plan(`Varal do versículo ${p.label}`),
          verse,
          pieceTheme:
            "Cartões retangulares de cantos arredondados, com borda azul e fundo de céu claro.",
          pieces: verse.text
            .split(/\s+/)
            .filter(Boolean)
            .reduce<string[][]>((groups, word) => {
              const last = groups[groups.length - 1];
              if (last && last.length < 3) last.push(word);
              else groups.push([word]);
              return groups;
            }, [])
            .map((words, index) => ({
              id: `peca-${String(index + 1).padStart(2, "0")}`,
              text: words.join(" "),
              figure: "Coração grande e fofo",
            })),
          referencePiece: { text: verse.reference },
          leaderTip: "Repita o versículo com o grupo a cada peça colocada.",
          evaluation: "Cada equipe recita sem ajuda.",
          reviewerNotes: "",
        };
      return {
        centralMessage: central,
        ...plan(`Gincana ${p.label}`),
        spaceNeeded: "Uma mesa ou uma roda pequena",
        // Crianças: uma segunda brincadeira, para 9 a 11 anos.
        extraGames:
          audience === ContentAudience.CHILD
            ? [
                {
                  ...plan(`Gincana ${p.label} (9 a 11 anos)`),
                  spaceNeeded: "Uma mesa",
                },
              ]
            : [],
        reviewerNotes: "",
      };
    }
  }
}
