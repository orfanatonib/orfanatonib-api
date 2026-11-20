import { ContentAudience } from "../../enums/content-audience.enum";

/**
 * Direções visuais dos cartões do versículo para Adolescentes e Adultos. Antes cada categoria tinha UMA receita fixa
 * (sempre o mesmo fundo escuro, a mesma tipografia, a mesma composição), então toda geração saía igual.
 *
 * Cada geração recebe UMA direção (sorteada pelo tema e trocada a cada regeneração); o modelo a registra em `lookId` e
 * as imagens usam exatamente ela. Todas respeitam as regras comuns: letras grossas, contraste forte atrás do texto,
 * A4 em paisagem, margem de impressão, paleta contida e nada de estética infantil. Variam: fundo claro ou escuro,
 * tipografia, textura, vocabulário dos ícones e COMPOSIÇÃO da folha.
 */
export interface VerseCardLookVariant {
  readonly id: string;
  readonly name: string;
  /** Resumo do estilo do cartão (entra no começo do prompt da imagem). */
  readonly style: string;
  readonly lettering: string;
  readonly background: string;
  readonly illustrations: string;
  readonly colors: string;
  /** Como o texto se organiza na folha (alinhamento, hierarquia, ritmo das linhas). */
  readonly composition: string;
}

/** Quem é o público (regra que acompanha qualquer direção da categoria). */
export const VERSE_CARD_LOOK_AUDIENCE_RULES: Readonly<
  Partial<Record<ContentAudience, string>>
> = {
  [ContentAudience.TEEN]:
    "PÚBLICO: adolescentes. Estética moderna e com atitude, no estilo descrito em LETRAS, FUNDO e COMPOSIÇÃO; nada de letras infantis ou arredondadas demais.",
  [ContentAudience.ADULT]:
    "PÚBLICO: adultos. Estética sóbria e elegante, com bastante respiro, no estilo descrito em LETRAS, FUNDO e COMPOSIÇÃO; nada de aparência infantil.",
};

export const VERSE_CARD_LOOK_VARIANTS: Readonly<
  Partial<Record<ContentAudience, readonly VerseCardLookVariant[]>>
> = {
  [ContentAudience.TEEN]: [
    {
      id: "poster-escuro",
      name: "Pôster escuro",
      style:
        "Pôster moderno e dinâmico, como capa de série ou de álbum, em fundo escuro.",
      lettering:
        "Tipografia de pôster: sem serifa extra-negrito (black ou heavy, condensada ou larga), em caixa alta, tamanho gigante, com contorno deslocado (offset) ou sombra dura e uma faixa de marca-texto na cor de acento sobre a palavra-chave.",
      background:
        "Fundo escuro e uniforme atrás das letras: degradê suave entre tons escuros da mesma família, textura granulada ou halftone sutil, linhas diagonais discretas nas bordas.",
      illustrations:
        "ícones de traço fino e doodles minúsculos em uma só cor de acento: faíscas, setas, estrelas de quatro pontas, raios, círculos e símbolos simples (chave, bússola, chama, onda).",
      colors:
        "Tons escuros ou neutros dessaturados (grafite, azul-marinho, preto, off-white) e UMA única cor de acento.",
      composition:
        "Linhas curtas empilhadas e alinhadas ao centro, com escala e peso variando entre as linhas (hierarquia): a palavra-chave bem maior.",
    },
    {
      id: "rua-claro",
      name: "Cartaz de rua, fundo claro",
      style:
        "Cartaz de rua em papel, estética de lambe-lambe e colagem, em fundo CLARO.",
      lettering:
        "Letras pretas ou em grafite escuro, sem serifa extra-negrito e condensadas, em caixa alta, com leve efeito de carimbo ou impressão em serigrafia (bordas levemente irregulares, sem perder a leitura) e uma faixa de marca-texto na cor de acento atrás da palavra-chave.",
      background:
        "Fundo claro e uniforme atrás das letras: papel kraft claro, off-white ou cinza-gelo, com textura sutil de papel e fitas adesivas ou rasgos de papel só nas bordas.",
      illustrations:
        "recortes de papel, fitas, setas desenhadas à mão, estrelas, rabiscos e carimbos minúsculos nas bordas, em preto e na cor de acento.",
      colors:
        "Fundo claro neutro, letras em preto ou grafite e UMA cor de acento forte (laranja-queimado, azul-cobalto ou vermelho-tijolo).",
      composition:
        "Blocos de texto de tamanhos diferentes, levemente inclinados (poucos graus), como colagem de cartaz, sempre com a leitura em ordem de cima para baixo.",
    },
    {
      id: "duotone-editorial",
      name: "Duotone editorial",
      style:
        "Capa editorial de revista jovem em duas cores (duotone), gráfica e limpa.",
      lettering:
        "Sem serifa geométrica extra-negrita, em caixa alta, em tamanho gigante e justificada em bloco, na cor clara do par, sem efeitos de brilho.",
      background:
        "Fundo chapado na cor escura do par duotone, com formas geométricas grandes (círculo, faixa, diagonal) em um tom um pouco mais claro apenas nas bordas e cantos, nunca atrás das letras.",
      illustrations:
        "formas geométricas minúsculas e ícones de linha na cor clara do par: círculos, triângulos, grades de pontos e asteriscos.",
      colors:
        "Duas cores apenas (par duotone, ex.: azul-profundo com creme, ou vinho com rosa-claro); sem terceira cor.",
      composition:
        "Texto em bloco justificado e compacto, preenchendo a folha de borda a borda (respeitando a margem), com a palavra-chave em linha própria e maior.",
    },
    {
      id: "noturno-luz",
      name: "Noturno com luz",
      style:
        "Cartaz noturno de show ou de série, fundo quase preto e uma luz de acento.",
      lettering:
        "Sem serifa extra-negrito, em caixa alta, letras claras (branco quente) com um brilho (glow) contido na cor de acento, só em volta das letras, sem borrar a leitura.",
      background:
        "Fundo quase preto e uniforme atrás das letras, com um feixe de luz ou névoa na cor de acento nas bordas e no canto, bem apagado atrás do texto.",
      illustrations:
        "pontos de luz, linhas de luz, estrelas, ondas e círculos finos em volta, minúsculos, na cor de acento.",
      colors:
        "Quase preto, branco quente e UMA cor de acento (ciano, âmbar ou magenta), sem outras cores.",
      composition:
        "Texto centralizado em poucas linhas largas, com a palavra-chave isolada na linha do meio, maior e com o brilho.",
    },
    {
      id: "cor-solida-impacto",
      name: "Cor sólida de impacto",
      style:
        "Cartaz de impacto em uma cor sólida forte, com letras escuras, estilo de campanha jovem.",
      lettering:
        "Sem serifa extra-negrito e larga, em caixa alta, letras em preto ou grafite muito escuro sobre a cor sólida, com sombra dura deslocada em tom mais escuro da própria cor.",
      background:
        "Fundo de UMA cor sólida e uniforme (amarelo-ouro, laranja, verde-lima ou azul-claro vivo, desde que claro o bastante para o texto escuro ter contraste altíssimo), sem degradê atrás das letras.",
      illustrations:
        "ícones grossos de traço único em preto ou grafite, minúsculos, nos cantos: setas, raios, estrelas, asteriscos e balões de fala vazios.",
      colors:
        "Uma cor sólida clara e vibrante (só essa) e preto ou grafite; nada de terceira cor.",
      composition:
        "Texto alinhado à esquerda, linhas de comprimentos diferentes (bandeira), com a palavra-chave em tamanho maior e sublinhada por uma faixa grossa.",
    },
    {
      id: "concreto-estencil",
      name: "Concreto e estêncil",
      style:
        "Parede urbana de concreto escuro com letras de estêncil, estética de rua sóbria.",
      lettering:
        "Estêncil extra-negrito (letras com pequenas pontes), em caixa alta, em branco-sujo, como tinta spray bem aplicada, bordas nítidas e legíveis.",
      background:
        "Fundo de concreto ou reboco escuro e uniforme atrás das letras, com textura discreta de parede, manchas e rachaduras só nas bordas e nos cantos.",
      illustrations:
        "marcas de spray minúsculas, setas, estrelas, cruzes de marcação e riscos nas bordas, em branco-sujo e na cor de acento.",
      colors:
        "Cinzas e grafite escuro, branco-sujo e UMA cor de acento (laranja-segurança ou vermelho).",
      composition:
        "Linhas empilhadas alinhadas à esquerda, em colunas de largura parecida, como placa de rua, com a palavra-chave na cor de acento.",
    },
  ],
  [ContentAudience.ADULT]: [
    {
      id: "livro-escuro",
      name: "Livro de estudo, fundo escuro",
      style:
        "Cartão de reflexão refinado, como página de livro de estudo, em fundo escuro nobre.",
      lettering:
        "Serifa de display de traço GROSSO (bold ou black), em marfim ou com efeito discreto de folha de ouro, com leve brilho e sombra suave; a palavra-chave em itálico bold ou na cor de acento.",
      background:
        "Fundo escuro e uniforme atrás das letras (azul-noite, grafite, verde-musgo ou vinho profundo), com textura sutil de linho ou papel e vinheta nas bordas.",
      illustrations:
        "ornamentos finos em uma só cor de acento (dourado suave ou marfim): ramo de oliveira, louro, flourishes, linhas ornamentais e pequenos astros.",
      colors:
        "Fundo escuro, marfim para o texto e UM acento suave (dourado ou cobre).",
      composition:
        "Texto centralizado, em linhas de tamanho harmônico, com um pequeno ornamento entre o corpo do texto e as bordas.",
    },
    {
      id: "pergaminho-claro",
      name: "Pergaminho claro",
      style:
        "Página de manuscrito antigo, fundo claro de papel envelhecido, sóbrio e caloroso.",
      lettering:
        "Serifa clássica de traço GROSSO (bold), em marrom muito escuro ou grafite, em caixa mista, com a inicial da primeira linha maior, como letra capitular, e a palavra-chave em itálico bold.",
      background:
        "Fundo claro e uniforme atrás das letras: papel marfim ou creme envelhecido, com vinheta suave e manchas de papel só nas bordas.",
      illustrations:
        "filetes, vinhetas florais, ramos de oliveira e arabescos finos em marrom-sépia, minúsculos, nas bordas e nos cantos.",
      colors:
        "Creme ou marfim de fundo, marrom muito escuro para o texto e UM acento (vinho ou cobre).",
      composition:
        "Texto alinhado à esquerda, com a letra capitular na primeira linha e a referência recuada, como página de livro.",
    },
    {
      id: "galeria-minimalista",
      name: "Galeria minimalista",
      style:
        "Pôster de galeria, minimalista e contemporâneo, com muito respiro e fundo muito claro.",
      lettering:
        "Serifa moderna de traço GROSSO (bold), em preto ou grafite, em caixa mista, em escala forte: poucas linhas enormes, com a palavra-chave em outra cor de acento.",
      background:
        "Fundo muito claro e uniforme (branco-gelo ou cinza-claro), sem textura atrás das letras e com uma moldura fina de linha única nas bordas.",
      illustrations:
        "um único elemento gráfico fino e discreto (um círculo, uma linha ou um pequeno ramo) em um canto, na cor de acento.",
      colors:
        "Branco-gelo, preto ou grafite e UMA cor de acento suave (azul-petróleo, terracota ou verde-oliva).",
      composition:
        "Texto alinhado à direita, em bloco compacto, com a palavra-chave isolada e maior em uma linha própria e muito espaço livre à esquerda.",
    },
    {
      id: "noite-vitral",
      name: "Noite com luz de vitral",
      style:
        "Cartão contemplativo em azul-noite, com luz suave de vitral nas bordas.",
      lettering:
        "Serifa de display de traço GROSSO (bold), em marfim, com sombra suave e um leve brilho dourado só em volta da palavra-chave.",
      background:
        "Fundo azul-noite profundo e uniforme atrás das letras, com feixes de luz colorida muito suaves (dourado e azul) nas bordas e nos cantos, nunca atrás do texto.",
      illustrations:
        "formas de vitral em linha fina, pequenas estrelas e raios de luz, minúsculos, nos cantos, em dourado suave.",
      colors: "Azul-noite, marfim e UM acento dourado suave; sem outras cores.",
      composition:
        "Texto centralizado em linhas de largura parecida, formando um bloco quase retangular, com a referência embaixo em linha menor.",
    },
    {
      id: "aquarela-terrosa",
      name: "Aquarela terrosa",
      style:
        "Cartão de reflexão com lavagem de aquarela em tons terrosos suaves, fundo claro.",
      lettering:
        "Serifa de traço GROSSO (bold), em grafite ou marrom muito escuro, em caixa mista, com a palavra-chave na cor de acento terrosa.",
      background:
        "Fundo claro e uniforme atrás das letras, com manchas de aquarela terrosas (ocre, verde-sálvia, terracota) apenas nas bordas e nos cantos, bem apagadas atrás do texto.",
      illustrations:
        "folhas, ramos e pequenos pássaros em traço de aquarela e nanquim, minúsculos, nas bordas e nos vãos.",
      colors:
        "Creme claro, grafite e tons terrosos suaves (no máximo dois, harmônicos); nada vivo.",
      composition:
        "Texto em linhas de comprimentos diferentes, alinhado ao centro com leve movimento, e as manchas de aquarela emoldurando por baixo.",
    },
    {
      id: "musgo-linho",
      name: "Verde-musgo e linho",
      style:
        "Cartão sóbrio em verde-musgo profundo com textura de linho, ar de biblioteca.",
      lettering:
        "Serifa clássica de traço GROSSO (bold), em creme claro, com o título da palavra-chave em caixa alta espaçada e o restante em caixa mista.",
      background:
        "Fundo verde-musgo profundo e uniforme atrás das letras, com textura sutil de linho e uma vinheta suave nas bordas.",
      illustrations:
        "louro, oliveira, trigo e filetes finos, minúsculos, em creme ou dourado suave, nas bordas e nos cantos.",
      colors: "Verde-musgo profundo, creme e UM acento cobre ou dourado suave.",
      composition:
        "Texto alinhado à esquerda, em duas colunas visuais de peso diferente (corpo e palavra-chave), com a referência embaixo, alinhada à direita.",
    },
  ],
};

/** Ids válidos da categoria (vazio quando a categoria usa o visual único tradicional). */
export const verseCardLookIds = (audience: ContentAudience): string[] =>
  (VERSE_CARD_LOOK_VARIANTS[audience] ?? []).map((variant) => variant.id);

/** Hash simples e estável (FNV-1a) para sortear sem depender de aleatoriedade. */
function stableHash(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Direção atribuída a ESTA geração: depende do tema e da referência (materiais diferentes saem diferentes) e anda uma
 * posição a cada regeneração (`regeneration`), então refazer nunca repete o visual anterior.
 */
export function assignVerseCardLook(
  audience: ContentAudience,
  seed: string,
  regeneration: number,
): VerseCardLookVariant | null {
  const variants = VERSE_CARD_LOOK_VARIANTS[audience];
  if (!variants?.length) return null;
  return variants[(stableHash(seed) + regeneration) % variants.length];
}

/** A direção registrada no conteúdo gerado (`lookId`); `null` em conteúdo antigo ou de categoria sem direções. */
export function findVerseCardLook(
  audience: ContentAudience,
  lookId: unknown,
): VerseCardLookVariant | null {
  if (typeof lookId !== "string") return null;
  return (
    VERSE_CARD_LOOK_VARIANTS[audience]?.find(
      (variant) => variant.id === lookId,
    ) ?? null
  );
}
