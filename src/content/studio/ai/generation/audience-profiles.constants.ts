import { ContentAudience } from "../../enums/content-audience.enum";

/**
 * O Orfanato atende bebês, crianças, adolescentes e adultos (ao contrário do Clubinho, só infantil).
 * Cada público muda quem fala, o tom, o tamanho e o tipo de atividade — e os cuidados de segurança.
 */
export interface AudienceProfile {
  readonly audience: ContentAudience;
  readonly label: string;
  readonly ageRange: string;
  /** Quem conduz o material com este público. */
  readonly deliveredBy: string;
  readonly voice: string;
  readonly language: string;
  readonly attention: string;
  readonly activityStyle: string;
  readonly safety: readonly string[];
  /** Orçamento de palavras da narrativa/estudo (campo principal da etapa LESSON). */
  readonly lessonWords: { readonly min: number; readonly max: number };
  readonly reviewQuestions: { readonly min: number; readonly max: number };
  readonly activitySteps: { readonly min: number; readonly max: number };
  readonly discussionQuestions: { readonly min: number; readonly max: number };
  readonly visualItems: { readonly min: number; readonly max: number };
  readonly sessionMinutes: number;
}

export const AUDIENCE_PROFILES: Readonly<
  Record<ContentAudience, AudienceProfile>
> = {
  [ContentAudience.BABY]: {
    audience: ContentAudience.BABY,
    label: "Bebê",
    ageRange: "0 a 2 anos",
    deliveredBy:
      "o cuidador ou o voluntário do berçário, no colo ou ao lado do bebê",
    voice:
      "voz suave, rítmica e repetitiva, como cantiga e conversa de colo; frases de 3 a 7 palavras",
    language:
      "palavras muito simples, sons, rimas e repetição; nenhuma abstração",
    attention: "momentos de 3 a 5 minutos, com pausas, olhares e toques",
    activityStyle:
      "sensorial: tocar, balançar, cantar, esconder e achar, texturas seguras, movimentos no colo",
    safety: [
      "nenhum objeto pequeno que caiba na boca; nada cortante, quente ou tóxico",
      "materiais laváveis e sem pontas; supervisão constante e contato visual",
      "sem sustos, escuridão, barulhos fortes ou imagens assustadoras",
      "não depende de leitura nem de compreensão da história: o vínculo e o carinho são o conteúdo",
    ],
    lessonWords: { min: 60, max: 220 },
    reviewQuestions: { min: 0, max: 0 },
    activitySteps: { min: 2, max: 4 },
    discussionQuestions: { min: 0, max: 0 },
    visualItems: { min: 2, max: 4 },
    sessionMinutes: 5,
  },
  [ContentAudience.CHILD]: {
    audience: ContentAudience.CHILD,
    label: "Criança",
    ageRange: "3 a 11 anos",
    deliveredBy: "o líder ou professor, falando diretamente às crianças",
    voice:
      "narração viva e calorosa, conversando com as crianças, com perguntas curtas e gestos",
    language:
      "frases claras e concretas; explique qualquer palavra difícil na hora; exemplos do cotidiano infantil",
    attention:
      "blocos de 10 a 15 minutos, com participação a cada poucos minutos",
    activityStyle:
      "movimento e brincadeira com regras simples, equipes pequenas, materiais baratos e seguros",
    safety: [
      "espaço livre de obstáculos, nada cortante, sem alimento sem alerta de alergia",
      "sem violência gráfica, sem cenas assustadoras, sem sexualização ou romance",
      "adaptações para 3 a 5 anos (mais simples) e 6 a 11 anos (mais desafiador)",
      "ninguém é exposto, comparado ou constrangido diante do grupo",
    ],
    lessonWords: { min: 700, max: 1500 },
    reviewQuestions: { min: 6, max: 10 },
    activitySteps: { min: 3, max: 6 },
    discussionQuestions: { min: 0, max: 0 },
    visualItems: { min: 4, max: 10 },
    sessionMinutes: 40,
  },
  [ContentAudience.TEEN]: {
    audience: ContentAudience.TEEN,
    label: "Adolescente",
    ageRange: "12 a 15 anos",
    deliveredBy:
      "o facilitador, conversando de igual para igual, sem infantilizar",
    voice:
      "direta, respeitosa e autêntica; ouve mais do que prega; humor leve e sem sarcasmo",
    language:
      "linguagem atual e clara, sem gírias forçadas; conecta o texto a dilemas reais (identidade, pertencimento, medo, escolhas)",
    attention:
      "blocos de 15 a 20 minutos alternando fala curta, pergunta e dinâmica",
    activityStyle:
      "dinâmicas em grupo, desafios de cooperação, debate guiado, expressão criativa; ninguém é obrigado a expor a própria história",
    safety: [
      "temas sensíveis (abandono, perda, família, autoimagem) com acolhimento e sem pressão para compartilhar",
      "sem romance, sexualização, humilhação ou comparação entre colegas",
      "indicar quando buscar um adulto de confiança; nunca prometer sigilo absoluto sobre risco",
      "sem violência gráfica; trate dor e sofrimento com respeito",
    ],
    lessonWords: { min: 800, max: 1700 },
    reviewQuestions: { min: 5, max: 8 },
    activitySteps: { min: 3, max: 6 },
    discussionQuestions: { min: 5, max: 8 },
    visualItems: { min: 3, max: 8 },
    sessionMinutes: 50,
  },
  [ContentAudience.ADULT]: {
    audience: ContentAudience.ADULT,
    label: "Adulto",
    ageRange: "16 anos ou mais",
    deliveredBy: "o facilitador ou pastor, em estudo e conversa de grupo",
    voice:
      "pastoral, serena e reflexiva; fundamenta no texto; aplica sem moralismo",
    language:
      "linguagem madura e acessível; contexto histórico quando ajudar; aplicação prática à vida, ao cuidado e ao serviço",
    attention: "blocos de 20 a 30 minutos de estudo mais tempo de conversa",
    activityStyle:
      "reflexão guiada, estudo em duplas ou pequenos grupos, compromisso prático de cuidado e serviço",
    safety: [
      "acolher quem carrega perdas, culpa ou cansaço sem julgamento",
      "não expor histórias pessoais de ninguém; compartilhar é sempre voluntário",
      "sem proselitismo agressivo, sem política partidária, sem promessas de prosperidade",
      "doutrina fiel ao texto; dúvidas de interpretação vão para as notas de revisão",
    ],
    lessonWords: { min: 900, max: 1900 },
    reviewQuestions: { min: 5, max: 8 },
    activitySteps: { min: 3, max: 6 },
    discussionQuestions: { min: 5, max: 8 },
    visualItems: { min: 3, max: 8 },
    sessionMinutes: 60,
  },
};
