import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { AUDIENCE_PROFILES } from "./audience-profiles.constants";

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
): Record<string, unknown> {
  const p = AUDIENCE_PROFILES[audience];
  const notes = "";
  const verse = {
    text: "Porque Deus tanto amou o mundo.",
    reference: "João 3.16",
  };
  const central = `Mensagem central simulada (${p.label}).`;

  switch (stage) {
    case ContentStageType.CANONICAL_BASE:
      return {
        centralMessage: central,
        title: `Base: ${theme}`,
        biblicalReference: "João 3.16",
        memoryVerse: verse,
        keyEvents: ["Acontecimento um.", "Acontecimento dois."],
        theologicalFocus: "Deus ama e salva.",
        audienceNotes: ["Linguagem simples.", "Acolhimento para todos."],
        reviewerNotes: notes,
      };
    case ContentStageType.LESSON: {
      const words = Math.round((p.lessonWords.min + p.lessonWords.max) / 2);
      return {
        centralMessage: central,
        title: `${p.label}: ${theme}`,
        biblicalReference: "João 3.16",
        purpose: `Propósito para ${p.label.toLowerCase()}.`,
        memoryVerse: verse,
        songs: [],
        opening: `Abertura para ${p.label.toLowerCase()}.`,
        principle: "Princípio simulado.",
        story: Array.from({ length: Math.ceil(words / 350) }, (_, i) => ({
          heading: `Parte ${i + 1}`,
          body: filler(Math.min(350, words - i * 350), p.label.toLowerCase()),
        })),
        application: "Aplicação simulada.",
        reviewQuestions: Array.from(
          { length: p.reviewQuestions.min },
          (_, i) => ({
            question: `Pergunta ${i + 1}?`,
            answer: `Resposta ${i + 1}.`,
          }),
        ),
        closingPrayer: "",
        reviewerNotes: notes,
      };
    }
    case ContentStageType.DISCUSSION:
      return {
        centralMessage: central,
        title: `Discussão ${p.label}`,
        introduction: "Introdução simulada.",
        questions: Array.from(
          { length: p.discussionQuestions.min },
          (_, i) => ({
            question: `Pergunta aberta ${i + 1}?`,
            purpose: "Despertar reflexão.",
            followUps: ["E se fosse com você?"],
          }),
        ),
        reflection: "Reflexão simulada.",
        groupAgreements: ["Compartilhar é voluntário."],
        reviewerNotes: notes,
      };
    case ContentStageType.ACTIVITY:
      return {
        centralMessage: central,
        name: `Atividade ${p.label}`,
        objective: "Objetivo simulado.",
        materials: ["1 manta", "2 bolas macias"],
        preparation: "Preparação simulada.",
        steps: Array.from(
          { length: p.activitySteps.min },
          (_, i) => `Passo ${i + 1}.`,
        ),
        safetyRules: ["Supervisão constante."],
        durationMinutes: Math.min(
          10,
          Math.max(5, Math.round(p.sessionMinutes / 5)),
        ),
        ageAdaptations: ["Simplifique para os menores."],
        biblicalConnection: "Liga-se ao princípio.",
        reviewerNotes: notes,
      };
    case ContentStageType.VISUAL:
      return {
        centralMessage: central,
        title: `Visuais ${p.label}`,
        styleDirection: "Cores vivas e formas simples.",
        items: Array.from({ length: p.visualItems.min }, (_, i) => ({
          id: `visual-${String(i + 1).padStart(2, "0")}`,
          title: `Imagem ${i + 1}`,
          description: "Cena simples da passagem.",
          altText: "Ilustração.",
          sourceExcerpt: "",
        })),
        reviewerNotes: notes,
      };
    case ContentStageType.FACILITATOR_GUIDANCE:
      return {
        centralMessage: central,
        overview: `Visão geral para ${p.deliveredBy}.`,
        preparationChecklist: ["Separar materiais."],
        timeline: [{ minutes: p.sessionMinutes, moment: "Visita completa." }],
        tips: ["Acolha cada pessoa."],
        sensitivityNotes: ["Não peça que ninguém conte a própria história."],
        followUp: "Acompanhe na semana.",
        reviewerNotes: notes,
      };
  }
}
