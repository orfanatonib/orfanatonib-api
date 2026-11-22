import { ContentStageType } from "../../enums/content-stage-type.enum";
import { CutoutCategory, VisualItemSize } from "./visual-art.constants";

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
  title: str("Título curto do visual."),
  description: str(
    "Descrição objetiva do que mostrar, usada depois para criar a imagem (sem texto dentro da imagem).",
  ),
  altText: str("Texto alternativo para acessibilidade."),
  sourceExcerpt: str(
    "Trecho da lição aprovada que este visual ilustra; vazio só em elementos neutros de céu e natureza.",
  ),
  category: {
    type: "string",
    enum: Object.values(CutoutCategory),
    description:
      "Categoria do elemento no kit de recortes; SCENE quando o formato do público é de cenas completas.",
  },
  size: {
    type: "string",
    enum: Object.values(VisualItemSize),
    description: "Tamanho relativo do elemento (LARGE nas cenas completas).",
  },
  variantOf: str(
    "id do item de que este é variante de pose ou estado; vazio quando não for variante.",
  ),
  layoutPlan: str(
    "Kit: tamanho relativo e posição de cada elemento na prancha. Cena: o enquadramento da imagem.",
  ),
  elements: {
    type: "array",
    description:
      "Kit de recortes: um elemento por peça da prancha. Cenas completas: lista vazia.",
    items: obj({
      label: str("Legenda curta da peça."),
      description: str("O que a peça mostra."),
      category: {
        type: "string",
        enum: Object.values(CutoutCategory).filter(
          (value) => value !== CutoutCategory.SCENE,
        ),
        description: "Categoria da peça.",
      },
      size: {
        type: "string",
        enum: Object.values(VisualItemSize),
        description: "Tamanho relativo.",
      },
      storyEvidence: str(
        "Trecho literal da lição que justifica a peça; vazio só em céu e natureza neutros.",
      ),
      variantOf: str(
        "Rótulo da peça de que esta é variante; vazio se não for.",
      ),
    }),
  },
  imagePrompt: str(
    "Prompt autossuficiente para o gerador de imagens: só o que entra nesta imagem, com a aparência fixa de quem aparece e a direção de arte; sem citar outras imagens.",
  ),
});

const verseCard = obj({
  id: str("Identificador sequencial: verso-01, verso-02…"),
  text: str(
    "Trecho exato do versículo neste cartão, sem alterar nenhuma palavra.",
  ),
  concept: str(
    "De seis a dez ilustrações minúsculas e variadas, do vocabulário da categoria, ligadas ao sentido do trecho (os 10% restantes da imagem); nunca pessoas ou cenas.",
  ),
  imagePrompt: str(
    "Prompt autossuficiente do cartão: cita o texto exatamente como está em text e descreve tipografia, paleta, fundo e detalhes do estilo do público.",
  ),
  altText: str("Texto alternativo para acessibilidade."),
});

/** Brincadeira e fixação do versículo compartilham a forma do documento de uma página. */
const funCore = {
  name: str("Nome curto, de até 5 palavras, com cara de jogo."),
  objective: str("Objetivo em uma frase."),
  funMechanics: strList(
    "Duas ou três mecânicas divertidas, de até 6 palavras cada.",
  ),
  materials: strList("Até 6 materiais baratos e seguros, com quantidade."),
  preparation: str("Preparação em no máximo duas frases."),
  steps: strList("Passo a passo: cada item é um comando curto."),
  safetyRules: strList(
    "Até 4 regras curtas de segurança, incluindo como se vence ou se encerra.",
  ),
  durationMinutes: {
    type: "integer",
    description: "Duração prevista em minutos.",
  },
  ageAdaptations: strList(
    "Exatamente duas frases: a simplificação para o grupo mais novo e o desafio extra para o mais velho, nesta ordem.",
  ),
  biblicalConnection: str(
    "Princípio bíblico em até duas frases, para dizer depois de brincar.",
  ),
  stepTitles: strList(
    "Título curto de cada passo, na mesma ordem e quantidade de steps (no máximo 5 palavras cada): vai escrito na imagem compilada, ao lado do número do passo.",
  ),
  closingPhrase: str(
    "Frase curta de encerramento (no máximo 12 palavras) para o quadro final da imagem compilada.",
  ),
  imagePrompt: str(
    "Prompt autossuficiente da imagem-resumo (compilado-01) para o gerador, no estilo do público, com os textos que vão escritos na arte.",
  ),
  visualSummary: str(
    "Descrição da UMA imagem-resumo (compilado-01): materiais, preparação, passo a passo em painéis na ordem de leitura e encerramento, com pessoas genéricas do público; sem cenas bíblicas.",
  ),
};

const funProperties = { centralMessage, ...funCore };

/** Brincadeira: além do plano comum, o espaço que ocupa e (só para crianças) a segunda brincadeira, de 9 a 11 anos. */
const gameCore = {
  ...funCore,
  spaceNeeded: str(
    "Espaço que a brincadeira ocupa, curto (ex.: 'uma mesa', 'roda de 3 m × 3 m', 'um tapete de 2 m × 2 m'). Pequeno: nunca quadra, pátio ou percurso.",
  ),
};
const gameProperties = {
  centralMessage,
  ...gameCore,
  extraGames: {
    type: "array",
    description:
      "Brincadeiras extras, cada uma com os mesmos campos da principal e DIFERENTE dela. Para crianças: exatamente uma, a de 9 a 11 anos (a principal é a de 3 a 8 anos). Para as demais categorias: lista vazia.",
    items: obj(gameCore),
  },
};

export const STAGE_OUTPUT_SCHEMAS: Readonly<Record<ContentStageType, Schema>> =
  {
    [ContentStageType.LESSON]: obj({
      centralMessage,
      title: str("Título da lição."),
      biblicalReference: str("Passagem(ns) base, exatamente como informadas."),
      characters: strList(
        'PERSONAGENS: um item por personagem da história, no formato "Nome — contexto em uma frase".',
      ),
      locations: strList(
        "LOCAIS: os lugares onde a história acontece, em nomes curtos (ex.: Israel, Ramá). Vazio só se a passagem não citar lugares.",
      ),
      supportMaterials: strList(
        'MATERIAIS DE APOIO: objetos simples e baratos no formato "Objeto — o que ele representa na história". Cada um é usado em uma marcação de ação.',
      ),
      icebreaker: str(
        "QUEBRA-GELO: abertura participativa, com ao menos uma marcação de ação do condutor, ligada ao tema.",
      ),
      story: {
        type: "array",
        description:
          "HISTÓRIA BÍBLICA em blocos na ordem, cada um com subtítulo curto e o texto falado, com as marcações de ação nos momentos em que um material de apoio entra.",
        items: obj({
          heading: str("Subtítulo curto."),
          body: str("Texto do bloco, desenvolvido, sem Markdown."),
        }),
      },
      application: str(
        "APLICAÇÃO E APELO, com convite voluntário, terminando com a oração entre aspas.",
      ),
      reviewQuestions: {
        type: "array",
        description:
          "LIÇÃO: perguntas com resposta, cobrindo fatos, ensino e objeto de apoio. Lista vazia para bebês.",
        items: obj({
          question: str("Pergunta."),
          answer: str("Resposta esperada."),
        }),
      },
      memoryVerse,
      verseOptions: strList(
        'VERSÍCULOS: duas opções no formato "Opção N (foco em …): “texto” (Referência)"; a opção 1 é igual a memoryVerse.',
      ),
      visitObjectives: str(
        'OBJETIVOS DA VISITA: duas ou três frases curtas, no estilo "Mostrar que com Deus podemos…. Mostrar que em Jesus podemos…. Deus tem propósito!", resumindo o que esta lição quer despertar nas pessoas.',
      ),
      reviewerNotes,
    }),

    [ContentStageType.LESSON_VISUALS]: obj({
      centralMessage,
      title: str("Título do conjunto de visuais da lição."),
      styleDirection: str(
        "Direção de arte: estilo, paleta e tom adequados ao público, iguais em todos os itens.",
      ),
      characterSheets: strList(
        'Uma ficha por personagem ou animal que aparece: "Nome — idade aparente, pele, cabelo, roupas com cores, acessórios, altura relativa". Valem para todos os itens.',
      ),
      items: {
        type: "array",
        description:
          "Visuais da lição em ordem (cenas ou elementos para recorte).",
        items: imageIdea,
      },
      reviewerNotes,
    }),

    [ContentStageType.VERSE_VISUALS]: obj({
      centralMessage,
      title: str("Título dos cartões do versículo."),
      verse: memoryVerse,
      splitRationale: str(
        "Por que o versículo foi dividido assim, em uma ou duas frases.",
      ),
      lookId: str(
        'Identificador da direção visual atribuída a esta geração (copie exatamente o id indicado no prompt; "padrao" quando o prompt não atribuir nenhuma).',
      ),
      styleDirection: str(
        "Fundo e paleta únicos (até três cores) escolhidos a partir do sentido do versículo.",
      ),
      palette: strList(
        "Paleta única da sequência: de uma a três cores nomeadas.",
      ),
      cards: {
        type: "array",
        description:
          "Um cartão por trecho, na ordem; juntos reconstroem exatamente o texto do versículo.",
        items: verseCard,
      },
      referenceCard: obj({
        text: str("Somente a referência completa, igual a verse.reference."),
        imagePrompt: str(
          "Prompt autossuficiente do cartão da referência, citando o texto exatamente.",
        ),
        altText: str("Texto alternativo para acessibilidade."),
      }),
      reviewerNotes,
    }),

    [ContentStageType.VERSE_FIXATION]: obj({
      ...funProperties,
      verse: memoryVerse,
      pieceTheme: str(
        "O OBJETO que dá forma a todas as peças do jogo, tirado do tema da lição ou do versículo (ex.: placas de madeira de caminho, nuvens, presentes, túmulos de pedra com a pedra que abre, ovelhas, peças de quebra-cabeça): descreva em duas ou três frases a forma, as cores, o material e os detalhes, de modo que um ilustrador desenhe todas as peças iguais.",
      ),
      pieces: {
        type: "array",
        description:
          "As peças imprimíveis do jogo, uma por trecho do versículo, na ordem; os textos, lidos em ordem, reconstroem exatamente verse.text.",
        items: obj({
          id: str("Identificador sequencial: peca-01, peca-02…"),
          text: str(
            "Trecho exato do versículo nesta peça, sem alterar nenhuma palavra nem a pontuação.",
          ),
          figure: str(
            "Figura simples ligada ao sentido deste trecho (um objeto, animal ou elemento da natureza; nunca uma pessoa real). Obrigatória para bebês; nas demais categorias, um detalhe pequeno ou vazio.",
          ),
        }),
      },
      referencePiece: obj({
        text: str("Somente a referência completa, igual a verse.reference."),
      }),
      leaderTip: str(
        "DICA PARA O LÍDER: uma ou duas frases curtas que ajudam quem conduz a reforçar o versículo durante o jogo.",
      ),
      evaluation: str("Como avaliar em uma frase, sem constrangimento."),
      reviewerNotes,
    }),

    [ContentStageType.STANDARD_GAME]: obj({
      ...gameProperties,
      reviewerNotes,
    }),
  };
