import {
  VERSE_CARD_LOOK_AUDIENCE_RULES,
  findVerseCardLook,
} from "./verse-card-looks.constants";
import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import type { VisualConfig } from "../../dto/visual-config.dto";
import { ContentVisualOrientation } from "../../enums/content-visual.enums";
import {
  A4_COMPOSITION_RULE,
  AUDIENCE_FUN_IMAGE_RULES,
  AUDIENCE_IMAGE_RULES,
  compiledSlot,
  AUDIENCE_VERSE_CARD_LOOK,
  AUDIENCE_VERSE_CARD_RULES,
  AUDIENCE_VISUAL_ART,
  VERSE_CARD_A4_RULE,
  VERSE_CARD_CONTRAST_RULE,
  VERSE_CARD_LAYOUT_RULE,
  VERSE_CARD_MARGIN_RULE,
  VERSE_CARD_WEIGHT_RULE,
  VERSE_REFERENCE_LAYOUT_RULE,
  VERSE_REFERENCE_SLOT,
  CUTOUT_CUT_LINE_RULE,
  LessonVisualFormat,
  commonArtRules,
} from "./visual-art.constants";
import { VISUAL_STYLES } from "./visual-styles.constants";
import {
  CHILD_GAME_AGE_GROUPS,
  type GameAgeGroup,
} from "./audience-profiles.constants";
import {
  FIXATION_INSTRUCTIONS_SLOT,
  FIXATION_PIECE_PRINT_RULE,
  FIXATION_PIECE_REFERENCE_RULE,
  FIXATION_PIECE_TEXT_RULE,
  FIXATION_PROFILES,
  FIXATION_REFERENCE_SLOT,
  fixationPieceSlot,
} from "./verse-fixation.constants";

import {
  GAME_KIT_PROFILES,
  GAME_PIECE_CONTENT_RULE,
  GAME_PIECE_REFERENCE_RULE,
  gamePieceSlot,
} from "./game-kit.constants";

type Json = Record<string, unknown>;
const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";
const list = (value: unknown): Json[] =>
  Array.isArray(value)
    ? value.filter((item): item is Json => !!item && typeof item === "object")
    : [];

/** Um desenho a gerar: o `slot` é o id do item (visual-01…). */
export interface ImageSpec {
  readonly slot: string;
  readonly title: string;
  readonly instructions: readonly string[];
  readonly size: "1024x1536" | "1536x1024";
  /** Slot de outra imagem da mesma versão que serve de referência de forma (peças da fixação e da brincadeira). */
  readonly referenceSlot?: string;
  /** Instrução acrescentada ao prompt só quando a imagem de referência foi de fato anexada. */
  readonly referenceRule?: string;
}

/** O gerador desenha na proporção da orientação escolhida; depois é recortado para a folha A4. */
export function imageSizeFor(
  orientation: ContentVisualOrientation,
): ImageSpec["size"] {
  return orientation === ContentVisualOrientation.PORTRAIT
    ? "1024x1536"
    : "1536x1024";
}

/**
 * Pedidos de imagem dos visuais da lição: a direção de arte única, as fichas dos personagens e o prompt de cada
 * prancha/cena (cada imagem vai SOZINHA ao gerador, que não conhece as outras).
 */
export function lessonVisualImageSpecs(
  content: Json,
  config: VisualConfig,
  audience: ContentAudience,
  onlySlots?: readonly string[] | null,
): ImageSpec[] {
  const kit = config.format === LessonVisualFormat.CUTOUT_KIT;
  const style = VISUAL_STYLES[config.style].prompt;
  const direction = text(content.styleDirection);
  const sheets = Array.isArray(content.characterSheets)
    ? (content.characterSheets as unknown[]).map(text).filter(Boolean)
    : [];
  return list(content.items)
    .filter((item) => !onlySlots || onlySlots.includes(text(item.id)))
    .map((item) => {
      const elements = list(item.elements)
        .map(
          (element) => `${text(element.label)}: ${text(element.description)}`,
        )
        .filter((line) => line !== ": ");
      const instructions = [
        `DESENHO (igual em todas as imagens do material): ${style}`,
        ...(direction ? [`DIREÇÃO DE ARTE DESTA LIÇÃO: ${direction}`] : []),
        ...(sheets.length
          ? [
              `PERSONAGENS — APARÊNCIA FIXA (não altere rosto, cabelo, roupas nem cores):\n${sheets.map((sheet) => `- ${sheet}`).join("\n")}`,
            ]
          : []),
        `O QUE DESENHAR NESTA IMAGEM: ${text(item.imagePrompt)}`,
        ...(kit && elements.length
          ? [
              `ELEMENTOS DA PRANCHA, cada um isolado:\n${elements.map((line) => `- ${line}`).join("\n")}`,
            ]
          : []),
        ...(text(item.layoutPlan)
          ? [`COMPOSIÇÃO: ${text(item.layoutPlan)}`]
          : []),
        ...AUDIENCE_IMAGE_RULES[audience],
        kit ? CUTOUT_CUT_LINE_RULE : A4_COMPOSITION_RULE,
        ...commonArtRules(),
        ...(config.instructions
          ? [`ORIENTAÇÃO EXTRA DO ADMINISTRADOR: ${config.instructions}`]
          : []),
      ];
      return {
        slot: text(item.id),
        title: text(item.title),
        instructions,
        size: imageSizeFor(config.orientation),
      };
    });
}

/**
 * Cartões do versículo: um por trecho e um da referência. O TEXTO é o protagonista e vai escrito dentro da imagem,
 * exatamente como aprovado; a paleta é única para a sequência inteira. Sempre paisagem, de ponta a ponta no A4.
 */
export function verseCardImageSpecs(
  content: Json,
  audience: ContentAudience,
  onlySlots?: readonly string[] | null,
): ImageSpec[] {
  const palette = Array.isArray(content.palette)
    ? (content.palette as unknown[]).map(text).filter(Boolean)
    : [];
  const direction = text(content.styleDirection);
  // A direção registrada na geração (Adolescentes e Adultos); conteúdo antigo, sem `lookId`, mantém o visual único.
  const assigned = findVerseCardLook(audience, content.lookId);
  const look = assigned ?? AUDIENCE_VERSE_CARD_LOOK[audience];
  const cards = list(content.cards).map((card) => ({
    slot: text(card.id),
    title: text(card.text),
    written: text(card.text),
    brief: text(card.imagePrompt),
    detail: text(card.concept),
    isReference: false,
  }));
  const reference = (content.referenceCard ?? {}) as Json;
  const refText = text(reference.text);
  const items = [
    ...cards,
    ...(refText
      ? [
          {
            slot: VERSE_REFERENCE_SLOT,
            title: refText,
            written: refText,
            brief: text(reference.imagePrompt),
            detail: "",
            isReference: true,
          },
        ]
      : []),
  ];
  return items
    .filter((item) => !onlySlots || onlySlots.includes(item.slot))
    .map((item) => ({
      slot: item.slot,
      title: item.title,
      size: "1536x1024" as const,
      instructions: [
        `CARTÃO TIPOGRÁFICO DO VERSÍCULO. ${assigned ? assigned.style : AUDIENCE_VISUAL_ART[audience].verseCardStyle}`,
        ...(assigned
          ? [
              VERSE_CARD_LOOK_AUDIENCE_RULES[audience] ?? "",
              `COMPOSIÇÃO DA FOLHA: ${assigned.composition}`,
            ].filter(Boolean)
          : AUDIENCE_VERSE_CARD_RULES[audience]),
        `LETRAS: ${look.lettering}`,
        VERSE_CARD_WEIGHT_RULE,
        VERSE_CARD_CONTRAST_RULE,
        VERSE_CARD_MARGIN_RULE,
        ...(item.isReference ? [VERSE_REFERENCE_LAYOUT_RULE] : []),
        `FUNDO: ${look.background}`,
        `PEQUENAS ILUSTRAÇÕES (estilo desta categoria): ${look.illustrations}`,
        VERSE_CARD_LAYOUT_RULE,
        ...(palette.length
          ? [
              `PALETA ÚNICA (a mesma em todos os cartões da sequência, no máximo três cores; só variações de luminosidade e saturação): ${palette.join(", ")}.`,
            ]
          : []),
        `CORES: ${look.colors}`,
        ...(direction ? [`DIREÇÃO DE ARTE: ${direction}`] : []),
        `TEXTO A ESCREVER NA IMAGEM — copie caractere por caractere, em português correto, com todos os acentos e a pontuação exatamente assim, sem acrescentar, trocar nem repetir nenhuma palavra: "${item.written}"`,
        ...(item.brief ? [`O QUE DESENHAR: ${item.brief}`] : []),
        ...(item.detail
          ? [
              `ILUSTRAÇÕES MINÚSCULAS DESTE CARTÃO (ligadas ao sentido do trecho; só nos 10% das sobras, sem tocar nas letras): ${item.detail}`,
            ]
          : []),
        item.isReference
          ? "Este cartão traz SOMENTE a referência bíblica; nenhuma palavra do versículo."
          : "Este cartão traz SOMENTE este trecho do versículo; nem a referência nem outras palavras.",
        "Dentro da imagem vai somente o texto pedido: nenhuma outra letra, palavra, número, moldura, marca ou logotipo. As ilustrações são só pequenos ícones decorativos; não inclua pessoas, personagens, cenas nem paisagens completas.",
        VERSE_CARD_A4_RULE,
      ],
    }));
}

/**
 * Imagem compilada da fixação do versículo e da brincadeira (modelo do Clubinho): UM infográfico vertical A4 por
 * brincadeira, com o título, a faixa do versículo (só na fixação), MATERIAIS, PREPARAÇÃO, o caminho com os passos
 * numerados e o quadro final. Os textos vêm do plano e vão escritos na arte, no estilo e com as pessoas de cada
 * categoria. As crianças têm duas brincadeiras (3 a 8 e 9 a 11 anos) e, portanto, duas imagens.
 */
export function funSummaryImageSpecs(
  stageType: ContentStageType,
  content: Json,
  audience: ContentAudience,
  onlySlots?: readonly string[] | null,
): ImageSpec[] {
  const fixation = stageType === ContentStageType.VERSE_FIXATION;
  // Fixação no modelo novo: o infográfico de instruções e uma imagem por peça do jogo.
  if (fixation && list(content.pieces).length > 0)
    return fixationImageSpecs(content, audience, onlySlots);
  const extra = Array.isArray(content.extraGames)
    ? (content.extraGames as Json[])
    : [];
  const games: Json[] = fixation ? [content] : [content, ...extra];
  // Brincadeira no modelo novo: a folha de instruções e o kit imprimível de cada brincadeira.
  if (!fixation && games.some((game) => list(game.pieces).length > 0))
    return gameImageSpecs(games, audience, onlySlots);
  const groups =
    !fixation && audience === ContentAudience.CHILD && games.length > 1
      ? CHILD_GAME_AGE_GROUPS
      : null;
  return games.flatMap((game, index) => {
    const slot = compiledSlot(index);
    if (onlySlots && !onlySlots.includes(slot)) return [];
    return [
      funSummaryImageSpec(
        fixation,
        game,
        content,
        audience,
        slot,
        groups?.[index],
      ),
    ];
  });
}

function funSummaryImageSpec(
  fixation: boolean,
  game: Json,
  root: Json,
  audience: ContentAudience,
  slot: string,
  group?: GameAgeGroup,
): ImageSpec {
  const strings = (value: unknown): string[] =>
    Array.isArray(value) ? (value as unknown[]).map(text).filter(Boolean) : [];
  const name = text(game.name);
  const steps = strings(game.steps);
  const titles = strings(game.stepTitles);
  const materials = strings(game.materials);
  const verse = (root.verse ?? {}) as Json;
  const verseText = text(verse.text);
  const reference = text(verse.reference);
  const closing = text(game.closingPhrase);
  const space = text(game.spaceNeeded);
  const instructions = [
    `INFOGRÁFICO VERTICAL (RETRATO, FOLHA A4 PARA IMPRIMIR) QUE COMPILA UMA ÚNICA ${fixation ? "BRINCADEIRA DE FIXAÇÃO DO VERSÍCULO" : "BRINCADEIRA"}.`,
    AUDIENCE_VISUAL_ART[audience].funInfographicStyle,
    ...AUDIENCE_FUN_IMAGE_RULES[audience],
    ...(group
      ? [
          `PÚBLICO DESTA IMAGEM: ${group.look}. Todas as pessoas desenhadas têm essa idade, e só ela.`,
        ]
      : audience === ContentAudience.CHILD
        ? ["PÚBLICO: crianças de 5 a 11 anos, em traço infantil simples."]
        : []),
    ...(fixation && verseText
      ? [
          `FAIXA DO VERSÍCULO: logo abaixo do título, uma faixa de destaque com o versículo escrito EXATAMENTE ASSIM, sem alterar, omitir ou acrescentar nenhum caractere e SEM aspas (as aspas aqui só delimitam este texto): "${verseText}" — e, em seguida, a referência "${reference}". Fora dessa faixa, não escreva o versículo de novo.`,
        ]
      : []),
    `ESTRUTURA OBRIGATÓRIA, DE CIMA PARA BAIXO: (1) o nome da brincadeira como título grande no topo; ${fixation ? "(2) a faixa do versículo; " : ""}(${fixation ? "3" : "2"}) uma faixa "MATERIAIS" com ícones simples de cada material; (${fixation ? "4" : "3"}) uma faixa "PREPARAÇÃO" mostrando como montar o espaço; (${fixation ? "5" : "4"}) um caminho "COMO BRINCAR" com EXATAMENTE ${steps.length} paradas numeradas em ordem (círculos ou bandeirinhas com os números 1 a ${steps.length}), cada parada com um título curto do passo e um desenho simples da ação, ligadas por setas; (${fixation ? "6" : "5"}) um quadro final de destaque com a frase de encerramento.`,
    `TEXTO NA IMAGEM (OBRIGATÓRIO, nenhuma faixa ou placa em branco): título "${name}"; faixas "MATERIAIS", "PREPARAÇÃO" e "COMO BRINCAR"; paradas ${steps
      .map((_, i) => `${i + 1} "${titles[i] ?? ""}"`)
      .join(
        "; ",
      )}; no quadro final: "${closing}". Escreva em português do Brasil com ortografia e acentuação corretas; não invente palavras, não escreva parágrafos nem outros textos; não escreva aspas, ponto e vírgula nem pontuação sobrando (as aspas e os ponto e vírgula deste prompt só delimitam os textos). Cada material tem seu rótulo sem pontuação ao final.`,
    ...(materials.length
      ? [`MATERIAIS (um ícone simples para cada): ${materials.join("; ")}.`]
      : []),
    ...(text(game.preparation)
      ? [`PREPARAÇÃO DO ESPAÇO (para desenhar): ${text(game.preparation)}`]
      : []),
    ...(!fixation && space
      ? [
          `ESPAÇO PEQUENO: a brincadeira acontece em ${space}. Desenhe um ambiente pequeno e aconchegante (mesa, roda, tapete ou canto de sala), nunca um campo, quadra, pátio ou percurso grande.`,
        ]
      : []),
    ...(text(game.imagePrompt)
      ? [`COMPOSIÇÃO PROPOSTA: ${text(game.imagePrompt)}`]
      : []),
    "É uma única brincadeira: não mostre várias brincadeiras, horários nem programação do dia. Sem personagens bíblicos e sem cenas da história. Nada violento, assustador ou perigoso: tudo mostra a brincadeira com segurança.",
    "Em cada parada, o número fica só no círculo (o título da parada não repete o número) e a ilustração cabe inteira dentro do painel, com as cabeças e as mãos das pessoas sem encostar nas bordas. Cartões e faixas organizados, com bastante respiro e leitura fácil. O título no topo e o quadro final embaixo ficam INTEIROS, dentro da imagem, com margem de pelo menos 8% da altura acima do título e abaixo do quadro final; nenhuma letra encosta nas bordas.",
  ];
  return { slot, title: name, instructions, size: "1024x1536" };
}

/**
 * Fixação do versículo (modelo "Sugestão de Fixação do versículo"): a folha de instruções do jogo e as PEÇAS
 * imprimíveis, uma imagem por trecho do versículo e uma para a referência, todas com a mesma arte.
 */
export function fixationImageSpecs(
  content: Json,
  audience: ContentAudience,
  onlySlots?: readonly string[] | null,
): ImageSpec[] {
  const f = FIXATION_PROFILES[audience];
  const strings = (value: unknown): string[] =>
    Array.isArray(value) ? (value as unknown[]).map(text).filter(Boolean) : [];
  const name = text(content.name);
  const theme = text(content.pieceTheme);
  const verse = (content.verse ?? {}) as Json;
  const verseText = text(verse.text);
  const reference = text(verse.reference);
  const pieces = list(content.pieces);
  const steps = strings(content.steps);
  const titles = strings(content.stepTitles);
  const materials = strings(content.materials);
  const chunks = pieces.map((piece) => text(piece.text));
  const referenceText =
    text(((content.referencePiece ?? {}) as Json).text) || reference;

  const total = pieces.length + 1;
  const instructions: ImageSpec = {
    slot: FIXATION_INSTRUCTIONS_SLOT,
    title: name,
    size: "1536x1024",
    instructions: [
      "FOLHA DE INSTRUÇÕES DE UM JOGO DE FIXAÇÃO DO VERSÍCULO: infográfico HORIZONTAL (PAISAGEM, FOLHA A4 PARA IMPRIMIR), rico, organizado e alegre, no nível de um material impresso de escola bíblica.",
      f.infographicStyle,
      ...AUDIENCE_FUN_IMAGE_RULES[audience],
      `AS PEÇAS DO JOGO (aparecem nas mãos das pessoas e no modelo montado, sempre com esta mesma aparência): ${theme}`,
      `BLOCOS OBRIGATÓRIOS: (1) no topo, à esquerda, o nome do jogo em letreiro grande e decorado com o tema; (2) ao lado do título, uma faixa de destaque com o versículo e a referência; (3) um bloco "COMO BRINCAR" com EXATAMENTE ${steps.length} painéis numerados de 1 a ${steps.length}, na ordem de leitura, cada um com o título curto do passo e uma cena simples das pessoas fazendo aquela ação com as peças; (4) um quadro "MATERIAIS" com um ícone para cada material; (5) uma faixa "MODELO" mostrando as peças em miniatura já montadas na ordem certa; (6) um quadro "DICA PARA O LÍDER" com a dica; (7) uma faixa final de destaque com a frase de encerramento.`,
      `FAIXA DO VERSÍCULO — escreva EXATAMENTE assim, sem alterar, omitir ou acrescentar nenhum caractere e SEM aspas (as aspas aqui só delimitam o texto): "${verseText}" e, em seguida, a referência "${reference}".`,
      `TEXTO NA IMAGEM (OBRIGATÓRIO, nenhuma placa em branco): título "${name}"; rótulos "COMO BRINCAR", "MATERIAIS", "MODELO" e "DICA PARA O LÍDER"; painéis ${steps
        .map((_, i) => `${i + 1} "${titles[i] ?? ""}"`)
        .join(
          "; ",
        )}; no quadro da dica: "${text(content.leaderTip)}"; na faixa final: "${text(content.closingPhrase)}". Escreva em português do Brasil com ortografia e acentuação corretas; não invente palavras nem escreva parágrafos; não escreva aspas nem ponto e vírgula (os deste prompt só delimitam os textos).`,
      `MODELO DAS PEÇAS (miniaturas na ordem, cada uma com o seu texto exato): ${[
        ...chunks,
        referenceText,
      ]
        .map((chunk, i) => `${i + 1}) "${chunk}"`)
        .join(" ")}.`,
      ...(materials.length
        ? [`MATERIAIS (um ícone simples para cada): ${materials.join("; ")}.`]
        : []),
      ...(text(content.preparation)
        ? [`PREPARAÇÃO DO ESPAÇO (para desenhar): ${text(content.preparation)}`]
        : []),
      ...(text(content.imagePrompt)
        ? [
            `COMPOSIÇÃO PROPOSTA (vale só para as cenas e a disposição; se ela citar textos diferentes dos listados em TEXTO NA IMAGEM, valem os de TEXTO NA IMAGEM): ${text(content.imagePrompt)}`,
          ]
        : []),
      "É um único jogo. Sem personagens bíblicos e sem cenas da história. Nada violento, assustador ou perigoso: tudo mostra o jogo com segurança.",
      `Em cada painel, o número aparece UMA única vez, dentro do círculo: o título do passo é escrito sem número na frente. O quadro da dica traz SOMENTE o texto da dica informado acima, sem outra frase. O jogo tem exatamente ${total} peças: nenhuma cena nem o modelo mostra mais do que ${total}.`,
      "Em cada painel a cena cabe inteira, sem cabeças nem mãos cortadas. Blocos organizados, com respiro e leitura fácil; nenhum texto encosta nas bordas (margem de pelo menos 5% em toda a volta).",
    ],
  };

  const anchor = fixationPieceSlot(0);
  const referenceFor = (slot: string): string | undefined =>
    slot !== anchor
      ? anchor
      : pieces.length > 1
        ? fixationPieceSlot(1)
        : referenceText
          ? FIXATION_REFERENCE_SLOT
          : undefined;
  const pieceSpec = (
    slot: string,
    written: string,
    figure: string,
    isReference: boolean,
  ): ImageSpec => ({
    slot,
    title: written,
    size: "1536x1024",
    // Todas copiam a forma da primeira peça; a primeira, quando refeita sozinha, copia a segunda.
    ...(referenceFor(slot)
      ? {
          referenceSlot: referenceFor(slot),
          referenceRule: FIXATION_PIECE_REFERENCE_RULE,
        }
      : {}),
    instructions: [
      `PEÇA IMPRIMÍVEL DE UM JOGO DE FIXAÇÃO DO VERSÍCULO (uma de ${total} peças iguais na arte; só o texto muda). ${f.pieceStyle}`,
      `FORMA DA PEÇA (o mesmo objeto, as mesmas cores e os mesmos detalhes em todas as peças do jogo): ${theme}`,
      FIXATION_PIECE_PRINT_RULE,
      `TEXTO A ESCREVER NA PEÇA — copie caractere por caractere, com todos os acentos e a pontuação exatamente assim, sem acrescentar, trocar nem repetir nenhuma palavra e SEM aspas (as aspas só delimitam o texto): "${written}"`,
      FIXATION_PIECE_TEXT_RULE,
      "LETRAS IGUAIS EM TODAS AS PEÇAS: use exatamente a cor, o contorno e o estilo de letra descritos na forma da peça; não troque a cor nem a fonte de uma peça para outra.",
      ...(isReference
        ? [
            "Esta peça traz SOMENTE a referência bíblica; nenhuma palavra do versículo. Se for longa, escreva o livro em cima e o capítulo e versículo embaixo.",
          ]
        : [
            "Esta peça traz SOMENTE este trecho do versículo, sem a referência.",
          ]),
      ...(f.figureOnPieces && figure
        ? [
            `FIGURA DA PEÇA (grande, fofa e simples, ocupa a maior parte do cartão, acima do texto): ${figure}. Nunca uma pessoa real nem Deus Pai.`,
          ]
        : []),
      "Sem pessoas, sem personagens bíblicos, sem cenário ao redor da peça.",
    ],
  });

  const specs: ImageSpec[] = [
    instructions,
    ...pieces.map((piece) =>
      pieceSpec(text(piece.id), text(piece.text), text(piece.figure), false),
    ),
    ...(referenceText
      ? [pieceSpec(FIXATION_REFERENCE_SLOT, referenceText, "", true)]
      : []),
  ];
  return specs.filter(
    (spec) => spec.slot && (!onlySlots || onlySlots.includes(spec.slot)),
  );
}

/**
 * Brincadeira divertida no modelo da fixação: para cada brincadeira (as crianças têm duas), a folha de instruções
 * em paisagem e o KIT imprimível, uma imagem por peça, todas com a mesma forma (a primeira serve de referência).
 */
export function gameImageSpecs(
  games: readonly Json[],
  audience: ContentAudience,
  onlySlots?: readonly string[] | null,
): ImageSpec[] {
  const kit = GAME_KIT_PROFILES[audience];
  const f = FIXATION_PROFILES[audience];
  const strings = (value: unknown): string[] =>
    Array.isArray(value) ? (value as unknown[]).map(text).filter(Boolean) : [];
  const groups =
    audience === ContentAudience.CHILD && games.length > 1
      ? CHILD_GAME_AGE_GROUPS
      : null;

  const specs = games.flatMap((game, gameIndex): ImageSpec[] => {
    const name = text(game.name);
    const theme = text(game.pieceTheme);
    const pieces = list(game.pieces);
    const steps = strings(game.steps);
    const titles = strings(game.stepTitles);
    const materials = strings(game.materials);
    const space = text(game.spaceNeeded);
    const group = groups?.[gameIndex];
    const total = pieces.length;
    const label = (piece: Json): string =>
      text(piece.text)
        ? `"${text(piece.text)}" com ${text(piece.figure)}`
        : text(piece.figure);

    const sheet: ImageSpec = {
      slot: compiledSlot(gameIndex),
      title: name,
      size: "1536x1024",
      instructions: [
        "FOLHA DE INSTRUÇÕES DE UMA BRINCADEIRA: infográfico HORIZONTAL (PAISAGEM, FOLHA A4 PARA IMPRIMIR), rico, organizado e MUITO alegre, com cara de cartaz de gincana e festa: é diversão pura, dá vontade de brincar só de olhar.",
        f.infographicStyle,
        ...AUDIENCE_FUN_IMAGE_RULES[audience],
        ...(group
          ? [
              `PÚBLICO DESTA IMAGEM: ${group.look}. Todas as pessoas desenhadas têm essa idade, e só ela.`,
            ]
          : []),
        `AS PEÇAS DO JOGO (aparecem nas mãos das pessoas e no quadro das peças, sempre com esta mesma forma): ${theme}`,
        `BLOCOS OBRIGATÓRIOS: (1) no topo, o nome do jogo em letreiro grande, divertido e decorado com o tema; (2) um bloco "COMO BRINCAR" com EXATAMENTE ${steps.length} painéis numerados de 1 a ${steps.length}, na ordem de leitura, cada um com o título curto do passo e uma cena cheia de ação e risada das pessoas usando as peças; (3) um quadro "MATERIAIS" com um ícone para cada material; (4) uma faixa "PEÇAS DO JOGO" mostrando as ${total} peças em miniatura, lado a lado; (5) um quadro "DICA PARA O LÍDER" com a dica; (6) uma faixa final de destaque com a frase de encerramento.`,
        `TEXTO NA IMAGEM (OBRIGATÓRIO, nenhuma placa em branco): título "${name}"; rótulos "COMO BRINCAR", "MATERIAIS", "PEÇAS DO JOGO" e "DICA PARA O LÍDER"; painéis ${steps
          .map((_, i) => `${i + 1} "${titles[i] ?? ""}"`)
          .join(
            "; ",
          )}; no quadro da dica: "${text(game.leaderTip)}"; na faixa final: "${text(game.closingPhrase)}". Escreva em português do Brasil com ortografia e acentuação corretas; não invente palavras nem escreva parágrafos; não escreva aspas nem ponto e vírgula (os deste prompt só delimitam os textos).`,
        `PEÇAS DO JOGO (miniaturas, cada uma com a sua figura e o seu texto exato): ${pieces
          .map((piece, i) => `${i + 1}) ${label(piece)}`)
          .join("; ")}.`,
        ...(materials.length
          ? [`MATERIAIS (um ícone simples para cada): ${materials.join("; ")}.`]
          : []),
        ...(text(game.preparation)
          ? [`PREPARAÇÃO DO ESPAÇO (para desenhar): ${text(game.preparation)}`]
          : []),
        ...(space
          ? [
              kit.allowsMovement
                ? `ESPAÇO: a brincadeira acontece em ${space}, com chão livre e seguro.`
                : `ESPAÇO PEQUENO: a brincadeira acontece em ${space}. Desenhe um ambiente pequeno e aconchegante (mesa, roda, tapete ou canto de sala), nunca um campo, quadra ou pátio.`,
            ]
          : []),
        ...(text(game.imagePrompt)
          ? [
              `COMPOSIÇÃO PROPOSTA (vale só para as cenas e a disposição; se ela citar textos diferentes dos listados em TEXTO NA IMAGEM, valem os de TEXTO NA IMAGEM): ${text(game.imagePrompt)}`,
            ]
          : []),
        "É uma única brincadeira. Sem versículo, sem personagens bíblicos e sem cenas da história. Nada violento, assustador ou perigoso: tudo mostra a brincadeira com segurança.",
        `Em cada painel, o número aparece UMA única vez, dentro do círculo: o título do passo é escrito sem número na frente. O quadro da dica traz SOMENTE o texto da dica informado acima, sem outra frase. O jogo tem exatamente ${total} peças: nenhuma cena nem o quadro das peças mostra mais do que ${total}.`,
        "Em cada painel a cena cabe inteira, sem cabeças nem mãos cortadas. Blocos organizados, com respiro e leitura fácil; nenhum texto encosta nas bordas (margem de pelo menos 5% em toda a volta).",
      ],
    };

    const first = gamePieceSlot(gameIndex, 0);
    const referenceFor = (slot: string): string | undefined =>
      slot !== first
        ? first
        : total > 1
          ? gamePieceSlot(gameIndex, 1)
          : undefined;
    const pieceSpecs = pieces.map((piece, i): ImageSpec => {
      const slot = gamePieceSlot(gameIndex, i);
      const written = text(piece.text);
      const reference = referenceFor(slot);
      return {
        slot,
        title: written || text(piece.figure),
        size: "1536x1024",
        ...(reference
          ? {
              referenceSlot: reference,
              referenceRule: GAME_PIECE_REFERENCE_RULE,
            }
          : {}),
        instructions: [
          `PEÇA IMPRIMÍVEL DO KIT DE UMA BRINCADEIRA (uma de ${total} peças com a mesma forma; só a figura e o texto mudam). ${f.pieceStyle}`,
          ...(group ? [`PÚBLICO: ${group.look}.`] : []),
          `FORMA DA PEÇA (a mesma silhueta, as mesmas cores e os mesmos enfeites em todas as peças do kit): ${theme}`,
          FIXATION_PIECE_PRINT_RULE,
          `FIGURA DA PEÇA (grande, simples e divertida, no centro): ${text(piece.figure)}. Nunca uma pessoa real nem personagem bíblico.`,
          written
            ? `TEXTO A ESCREVER NA PEÇA — copie caractere por caractere, com todos os acentos, sem acrescentar, trocar nem repetir nenhuma palavra e SEM aspas (as aspas só delimitam o texto): "${written}"`
            : "ESTA PEÇA NÃO TEM TEXTO: não escreva nenhuma letra, palavra nem número.",
          GAME_PIECE_CONTENT_RULE,
          "LETRAS IGUAIS EM TODAS AS PEÇAS: use exatamente a cor, o contorno e o estilo de letra descritos na forma da peça.",
          "Sem cenário ao redor da peça.",
        ],
      };
    });
    return [sheet, ...pieceSpecs];
  });
  return specs.filter(
    (spec) => spec.slot && (!onlySlots || onlySlots.includes(spec.slot)),
  );
}
