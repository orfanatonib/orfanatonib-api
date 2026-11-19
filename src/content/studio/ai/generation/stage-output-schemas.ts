import { ContentStageType } from "../../enums/content-stage-type.enum";

type Schema = Record<string, unknown>;

const str = (description: string): Schema => ({ type: "string", description });
const strList = (description: string): Schema => ({
  type: "array",
  description,
  items: { type: "string" },
});
const obj = (properties: Record<string, Schema>): Schema => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

/**
 * Campos internos: ficam ANTES das seções que orientam (o modelo escreve o JSON na ordem do
 * esquema) e são removidos antes de gravar o conteúdo — nunca chegam ao editor nem ao PDF.
 */
export const INTERNAL_OUTPUT_FIELDS = [
  "centralMessage",
  "reviewerNotes",
] as const;

const centralMessage = str(
  "Uso interno. Em uma frase, o ensino principal da passagem sobre Deus, Jesus e a salvação. Todas as seções servem a esta mensagem.",
);
const reviewerNotes = str(
  "Uso interno. Pontos que precisam de conferência humana (redação NVI incerta, harmonização de relatos, referência complementar). Vazio quando não houver. Nada disso aparece nos demais campos.",
);

const memoryVerse = obj({
  text: str(
    "Texto do versículo, na NVI, com redação exata. Se não houver certeza, deixe a redação para revisão e explique em reviewerNotes.",
  ),
  reference: str("Referência completa, por exemplo João 3.16."),
});

const imageIdea = obj({
  id: str("Identificador sequencial: visual-01, visual-02…"),
  title: str("Título curto do apoio visual."),
  description: str(
    "Descrição objetiva do que mostrar, usada depois para criar a imagem (sem texto dentro da imagem).",
  ),
  altText: str("Texto alternativo para acessibilidade."),
  sourceExcerpt: str(
    "Trecho da lição aprovada que este visual ilustra; vazio só em apoios genéricos.",
  ),
});

export const STAGE_OUTPUT_SCHEMAS: Readonly<Record<ContentStageType, Schema>> =
  {
    [ContentStageType.CANONICAL_BASE]: obj({
      centralMessage,
      title: str("Título do tema em linguagem simples."),
      biblicalReference: str("Passagem(ns) base, exatamente como informadas."),
      memoryVerse,
      keyEvents: strList(
        "Acontecimentos essenciais da passagem, em ordem, em uma frase cada.",
      ),
      theologicalFocus: str(
        "O que a passagem ensina sobre Deus, Jesus e a salvação, em até três frases.",
      ),
      audienceNotes: strList(
        "Cuidados de linguagem e sensibilidade que valem para os quatro públicos (bebê, criança, adolescente, adulto).",
      ),
      reviewerNotes,
    }),

    [ContentStageType.LESSON]: obj({
      centralMessage,
      title: str("Título da lição."),
      biblicalReference: str("Passagem(ns) base."),
      purpose: str(
        "Propósito: o que este público deve compreender e viver. Curto e específico.",
      ),
      memoryVerse,
      songs: strList(
        "Sugestões de músicas simples adequadas ao público (vazio se não fizer sentido).",
      ),
      opening: str("Abertura participativa ligada ao cotidiano do público."),
      principle: str("Explicação do princípio bíblico, com exemplo concreto."),
      story: {
        type: "array",
        description:
          "Narrativa ou estudo, em blocos na ordem. Cada bloco tem um subtítulo curto e o texto.",
        items: obj({
          heading: str("Subtítulo curto."),
          body: str("Texto do bloco, desenvolvido, sem Markdown."),
        }),
      },
      application: str(
        "Aplicação prática e, quando couber, convite voluntário a seguir Jesus.",
      ),
      reviewQuestions: {
        type: "array",
        description: "Perguntas de revisão com gabarito; vazio para bebês.",
        items: obj({
          question: str("Pergunta."),
          answer: str("Resposta esperada."),
        }),
      },
      closingPrayer: str("Oração final curta; vazio quando não solicitada."),
      reviewerNotes,
    }),

    [ContentStageType.DISCUSSION]: obj({
      centralMessage,
      title: str("Título da discussão."),
      introduction: str("Como abrir a conversa em um ou dois parágrafos."),
      questions: {
        type: "array",
        description: "Perguntas em ordem crescente de profundidade.",
        items: obj({
          question: str("Pergunta aberta."),
          purpose: str("O que a pergunta busca despertar."),
          followUps: strList("Duas perguntas de aprofundamento, no máximo."),
        }),
      },
      reflection: str("Fechamento reflexivo: o que levar para a semana."),
      groupAgreements: strList(
        "Combinados de respeito para a conversa (ex.: compartilhar é voluntário).",
      ),
      reviewerNotes,
    }),

    [ContentStageType.ACTIVITY]: obj({
      centralMessage,
      name: str("Nome curto e acolhedor da atividade."),
      objective: str("Objetivo em uma frase."),
      materials: strList("Materiais baratos e seguros, com quantidade."),
      preparation: str("Preparação em poucas frases."),
      steps: strList("Passo a passo, cada item um comando curto."),
      safetyRules: strList("Regras de segurança e cuidado."),
      durationMinutes: {
        type: "integer",
        description: "Duração prevista em minutos.",
      },
      ageAdaptations: strList(
        "Adaptações para facilitar ou aprofundar conforme a idade dentro do público.",
      ),
      biblicalConnection: str(
        "Como a atividade se liga ao princípio da lição, em até duas frases.",
      ),
      reviewerNotes,
    }),

    [ContentStageType.VISUAL]: obj({
      centralMessage,
      title: str("Título do conjunto de apoios visuais."),
      styleDirection: str(
        "Direção de arte: estilo, paleta e tom adequados ao público.",
      ),
      items: {
        type: "array",
        description: "Apoios visuais em ordem.",
        items: imageIdea,
      },
      reviewerNotes,
    }),

    [ContentStageType.FACILITATOR_GUIDANCE]: obj({
      centralMessage,
      overview: str("Visão geral da visita para quem vai conduzir."),
      preparationChecklist: strList("Lista de preparação antes da visita."),
      timeline: {
        type: "array",
        description: "Roteiro da visita com tempo estimado por momento.",
        items: obj({
          minutes: { type: "integer", description: "Minutos." },
          moment: str("O que acontece neste momento."),
        }),
      },
      tips: strList("Dicas práticas de condução."),
      sensitivityNotes: strList(
        "Cuidados de acolhimento para este público (sem expor histórias pessoais).",
      ),
      followUp: str("Como acompanhar depois da visita."),
      reviewerNotes,
    }),
  };
