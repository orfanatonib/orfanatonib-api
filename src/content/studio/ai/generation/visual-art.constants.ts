import { ContentAudience } from "../../enums/content-audience.enum";

/**
 * Direção de arte das imagens do Orfanato, derivada do Estúdio Clubinho
 * (`lesson-visual-style`, `story-visual-quality`, `lesson-image-brief`) para os quatro públicos.
 * O Clubinho desenha sempre "cartoon fofo para crianças"; aqui o traço, o formato dos visuais da
 * lição e a tipografia dos cartões do versículo mudam conforme a idade.
 */

/** Formato dos visuais da lição: kit de recortes (Clubinho) ou cenas completas (sequência da história). */
export enum LessonVisualFormat {
  CUTOUT_KIT = "CUTOUT_KIT",
  STORY_SCENES = "STORY_SCENES",
}

/** Categorias de elementos do kit de recortes (as mesmas do Clubinho). */
export enum CutoutCategory {
  CHARACTERS = "CHARACTERS",
  ANIMALS = "ANIMALS",
  BUILDINGS = "BUILDINGS",
  SCENERY = "SCENERY",
  SKY_AND_NATURE = "SKY_AND_NATURE",
  OBJECTS = "OBJECTS",
  /** Cena completa (formato STORY_SCENES: adolescentes e adultos). */
  SCENE = "SCENE",
}

export const CUTOUT_CATEGORY_LABELS: Readonly<Record<CutoutCategory, string>> =
  {
    [CutoutCategory.CHARACTERS]: "Personagens",
    [CutoutCategory.ANIMALS]: "Animais",
    [CutoutCategory.BUILDINGS]: "Construções",
    [CutoutCategory.SCENERY]: "Cenário",
    [CutoutCategory.SKY_AND_NATURE]: "Céu e natureza",
    [CutoutCategory.OBJECTS]: "Objetos",
    [CutoutCategory.SCENE]: "Cena",
  };

export enum VisualItemSize {
  LARGE = "LARGE",
  MEDIUM = "MEDIUM",
  SMALL = "SMALL",
}

/** Nunca realista, qualquer que seja o público (regra do Clubinho, ampliada). */
const NOT_PHOTOREAL =
  "Nunca fotorrealista nem pintura realista; sem textura detalhada de pele, pelo, madeira ou tecido. Animais e objetos seguem o mesmo traço, sem marcas, logotipos ou objetos modernos reconhecíveis.";

/** Cada peça do kit leva linha de corte, seja qual for o estilo (regra do Clubinho). */
export const CUTOUT_CUT_LINE_RULE =
  "LINHA DE CORTE: cada elemento tem contorno externo preto, grosso e contínuo (bem mais grosso que os traços internos) acompanhando toda a silhueta, para recortar com tesoura. Silhueta simples e fechada, sem partes finas soltas; elementos separados por espaço branco, sem se tocar nem se sobrepor; fundo branco puro.";

/** Folha A4 de visuais de cena: margem para a impressora (regra do Clubinho). */
export const A4_COMPOSITION_RULE =
  "FOLHA A4: a imagem é impressa sozinha numa folha A4. Componha para a proporção do A4 e mantenha todos os elementos na área central, com margem de pelo menos 8% em todas as bordas; nada encostado ou cortado nas bordas.";

/** Cartões do versículo vão de ponta a ponta na folha A4 paisagem (regra do Clubinho). */
export const VERSE_CARD_A4_RULE =
  "FOLHA A4 SEM BORDA: o cartão é impresso numa folha A4 paisagem, de ponta a ponta. O fundo vai até todas as bordas, sem moldura, margem ou faixa branca, e é contínuo nas bordas de cima e de baixo. Mantenha o texto a pelo menos 7% de todas as bordas.";

/** O que nunca entra na arte de uma cena ou de uma peça (o texto é aplicado depois pelo sistema). */
export const NO_TEXT_IN_ART_RULE =
  "Nunca coloque palavras, versículos, legendas, balões, números, marcas, molduras ou logotipos dentro da imagem.";

/** Regras de conteúdo comuns a todos os visuais bíblicos. */
export const BIBLICAL_ART_RULES: readonly string[] = [
  "Preserve época e ambiente bíblicos; evite objetos modernos, arquitetura incompatível, estereótipos e símbolos religiosos anacrônicos.",
  "Não represente Deus Pai fisicamente; trate morte, cruz e sofrimento com reverência, sem violência gráfica nem elementos assustadores.",
  "Pessoas representadas são sempre personagens da passagem, nunca retratos de pessoas reais ou de pessoas acolhidas.",
];

export interface AudienceVisualArt {
  readonly format: LessonVisualFormat;
  /** Traço e paleta das imagens da lição (a "direção de arte" repetida em todas as imagens). */
  readonly lessonStyle: string;
  /** Como o formato é montado para este público. */
  readonly lessonFormat: string;
  /** Tipografia, paleta e adereços dos cartões do versículo. */
  readonly verseCardStyle: string;
  /** Imagem-resumo (compilado-01) da brincadeira e da fixação: infográfico com texto, no estilo do público. */
  readonly funInfographicStyle: string;
  /** Quantidade de cartões de trecho (a referência vem sempre em um cartão a mais). */
  readonly verseCardCount: { readonly min: number; readonly max: number };
  /** Palavras por cartão de trecho: poucas o bastante para as letras serem gigantes, e o bastante para ter sentido. */
  readonly verseCardWords: { readonly min: number; readonly max: number };
}

export const AUDIENCE_VISUAL_ART: Readonly<
  Record<ContentAudience, AudienceVisualArt>
> = {
  [ContentAudience.BABY]: {
    format: LessonVisualFormat.CUTOUT_KIT,
    lessonStyle: `Desenho infantil fofo e MUITO simples, para ser reconhecido a um metro de distância: personagens com cabeça grande (cerca de um terço da altura), olhos grandes e redondos, expressões doces, corpo pequeno e arredondado; formas grandes e arredondadas; cores suaves porém saturadas, com sombreado em no máximo dois tons; contorno escuro grosso e uniforme; um único foco por imagem. ${NOT_PHOTOREAL}`,
    lessonFormat:
      "KIT DE RECORTES ENXUTO: peças grandes e isoladas (de feltro, cartão ou flanelógrafo) que o voluntário mostra, balança e coloca no colo ou no chão enquanto fala baixinho. Poucas peças, cada uma bem grande; nada de cenário detalhado.",
    verseCardStyle:
      "Cartão de versículo para bebês: balões de letra fofos, cores de doce e muito carinho, pensado para o cuidador mostrar e repetir cantando.",
    funInfographicStyle:
      "Infográfico vertical (retrato, A4) muito simples e acolhedor, no traço fofo e arredondado do público: poucos painéis grandes (no máximo quatro), cada um com UM gesto de carinho entre uma mulher cuidadora genérica e um bebê genérico (colo, cantiga, balanço, um objeto macio e grande). Texto mínimo e grande: título e passos de uma ou duas palavras. Cores suaves, sem competição, placar ou correria na arte.",
    verseCardCount: { min: 1, max: 2 },
    verseCardWords: { min: 1, max: 5 },
  },
  [ContentAudience.CHILD]: {
    format: LessonVisualFormat.CUTOUT_KIT,
    lessonStyle: `Desenho infantil fofo, estilo cartoon de material bíblico para crianças: personagens com cabeça grande (cerca de um terço da altura), olhos grandes, redondos e brilhantes, bochechas rosadas, expressões alegres e simples; formas simples e arredondadas; cores vivas e saturadas com sombreamento suave em poucos tons (cel shading); contorno escuro grosso e uniforme em todas as formas. ${NOT_PHOTOREAL}`,
    lessonFormat:
      "KIT DE RECORTES (modelo do Clubinho): pranchas de elementos isolados em fundo branco, sem cena completa, que o voluntário recorta e monta enquanto conta a história. Faça o inventário da lição (personagens, animais, construções, cenário, céu e natureza, objetos), distribua os itens nas pranchas por categoria, com variantes de pose ou estado quando a história muda, e elementos grandes e nítidos para mostrar à distância; nunca encolha um elemento para caber.",
    verseCardStyle:
      "Cartão de versículo infantil vibrante: estilo adesivo (sticker), alegre, colorido e cheio de vida, feito para as crianças lerem juntas em voz alta.",
    funInfographicStyle:
      "Infográfico vertical (retrato, A4), colorido e alegre, no traço cartoon fofo do público: crianças genéricas e animadas fazendo cada ação em clima de festa e gincana, nunca um infográfico só de objetos. Painéis na ordem de leitura, com números grandes.",
    verseCardCount: { min: 2, max: 9 },
    verseCardWords: { min: 2, max: 9 },
  },
  [ContentAudience.TEEN]: {
    format: LessonVisualFormat.STORY_SCENES,
    lessonStyle: `Ilustração digital moderna, de graphic novel: personagens com proporções realistas estilizadas (nada de cabeça grande nem carinha de bebê), expressões naturais e expressivas, traço limpo com contorno fino a médio, cores de paleta curada e contrastada, luz dramática porém acolhedora, cenários com profundidade. Estética de série animada ou capa de livro jovem, nunca infantil. ${NOT_PHOTOREAL}`,
    lessonFormat:
      "CENAS COMPLETAS: uma ilustração por momento da história, com ambiente, personagens e a ação principal, em enquadramento de cinema (plano aberto, médio ou close) para o líder mostrar na tela ou impressa. Cada imagem mostra um acontecimento diferente; os cortes ficam onde muda o lugar, o personagem ou a ação.",
    verseCardStyle:
      "Cartão de versículo para adolescentes: pôster moderno, dinâmico e com atitude, como capa de série ou de álbum; nada de aparência infantil.",
    funInfographicStyle:
      "Infográfico vertical (retrato, A4) moderno, no traço de ilustração jovem do público: adolescentes genéricos em ação (sem rostos de pessoas reais), painéis numerados em estilo de pôster ou story, tipografia sem serifa em negrito, paleta de até quatro cores vibrantes. Energia de desafio e de equipe, sem ar infantil.",
    verseCardCount: { min: 2, max: 6 },
    verseCardWords: { min: 4, max: 9 },
  },
  [ContentAudience.ADULT]: {
    format: LessonVisualFormat.STORY_SCENES,
    lessonStyle: `Ilustração editorial sóbria, de livro de estudo bíblico: pintura digital com traço suave, proporções naturais, expressões contidas e dignas, paleta terrosa e luminosa com cores harmônicas, luz natural, cenários e vestes fiéis à época. Nada de estilo infantil, de caricatura ou de elementos chamativos. ${NOT_PHOTOREAL}`,
    lessonFormat:
      "CENAS COMPLETAS: poucas ilustrações, uma por momento-chave da passagem, com ambiente, personagens e a ação principal, em composição calma e legível para apoiar a leitura em grupo, impressa ou projetada. Cada imagem mostra um momento diferente.",
    verseCardStyle:
      "Cartão de versículo para adultos: cartão de reflexão refinado, rico e sóbrio, como página de livro de estudo ou pôster de galeria; nada de aparência infantil.",
    funInfographicStyle:
      "Infográfico vertical (retrato, A4) limpo e sóbrio, no traço editorial do público: adultos genéricos (sem rostos de pessoas reais) interagindo em cada passo, painéis numerados em grade simples, tipografia legível e discreta, paleta contida de até três cores. Clima de convivência e leveza, sem ar infantil.",
    verseCardCount: { min: 2, max: 6 },
    verseCardWords: { min: 4, max: 10 },
  },
};

/** Bloco com as regras de arte comuns, repetidas em cada prompt de imagem. */
export function commonArtRules(): string[] {
  return [NO_TEXT_IN_ART_RULE, ...BIBLICAL_ART_RULES];
}

/**
 * Regras que valem SÓ para as imagens de cada categoria (o gerador de imagens não conhece o público): quantidade de
 * elementos, proporções dos personagens, nível de detalhe e o que nunca aparece. Entram no prompt de cada imagem.
 */
export const AUDIENCE_IMAGE_RULES: Readonly<
  Record<ContentAudience, readonly string[]>
> = {
  [ContentAudience.BABY]: [
    "PÚBLICO DESTA IMAGEM: bebês de 0 a 2 anos e seus cuidadores. Poucos elementos (no máximo três), todos GRANDES, de formas arredondadas e contraste alto, reconhecíveis a um metro de distância.",
    "Personagens com cabeça grande e rosto muito simples (olhos redondos, sorriso doce). Fundo liso ou quase liso, sem detalhes pequenos, sem cenário carregado.",
    "Nada assustador: sem armas, sangue, escuridão, fogo, monstros nem expressões de medo ou raiva; momentos difíceis da história aparecem de forma suave e silenciosa.",
  ],
  [ContentAudience.CHILD]: [
    "PÚBLICO DESTA IMAGEM: crianças de 3 a 11 anos. Cartoon alegre e legível a distância, ação principal clara em primeiro plano, detalhes moderados, expressões simples (alegria, surpresa, coragem, tristeza leve).",
    "Sem violência gráfica, sangue nem cenas assustadoras: conflitos aparecem por gesto, sombra ou silhueta, nunca em detalhe.",
  ],
  [ContentAudience.TEEN]: [
    "PÚBLICO DESTA IMAGEM: adolescentes de 12 a 15 anos. Proporções realistas estilizadas (nunca cabeça enorme nem aparência infantil), emoções genuínas e naturais, enquadramento de cinema (plano aberto, médio ou close).",
    "Pode mostrar tensão e dilema com seriedade, sem violência gráfica, sangue nem sensualização. Vestes dignas e fiéis à época. Estética de série ou capa de livro jovem.",
  ],
  [ContentAudience.ADULT]: [
    "PÚBLICO DESTA IMAGEM: adultos a partir de 16 anos. Composição calma e sóbria, expressões contidas e dignas, fidelidade histórica de vestes, arquitetura e objetos, luz natural.",
    "Peso emocional sem imagens chocantes: sem sangue, mutilação nem crueldade explícita. Nunca estilo infantil, caricatura ou elementos chamativos.",
  ],
};

/** Slot do cartão que traz só a referência bíblica (depois dos cartões de trecho). */
export const VERSE_REFERENCE_SLOT = "verso-ref";

/**
 * Regras do TEXTO dentro dos cartões do versículo, por categoria: o gerador precisa escrever o trecho exato, em
 * português correto, na tipografia certa para quem vai ler.
 */
export const AUDIENCE_VERSE_CARD_RULES: Readonly<
  Record<ContentAudience, readonly string[]>
> = {
  [ContentAudience.BABY]: [
    "PÚBLICO: bebês e seus cuidadores. Letras ENORMES, poucas palavras por cartão, ocupando a maior parte da imagem; ilustrações bem pequenas, redondas e simples.",
  ],
  [ContentAudience.CHILD]: [
    "PÚBLICO: crianças. Letras extragrandes e arredondadas, legíveis a distância, o texto ocupando cerca de 90% da imagem; desenhos minúsculos só nas sobras.",
  ],
  [ContentAudience.TEEN]: [
    "PÚBLICO: adolescentes. Tipografia sem serifa em negrito, moderna, com contraste forte, em estética de pôster ou post; nada de letras infantis ou arredondadas demais.",
  ],
  [ContentAudience.ADULT]: [
    "PÚBLICO: adultos. Tipografia elegante e sóbria (serifa clássica ou sem serifa leve), com bastante respiro e alto contraste de leitura; nada de estética infantil.",
  ],
};

/**
 * Regra de folha dos cartões do versículo (vale para todas as categorias): A4 PAISAGEM, texto com ~90% da área,
 * pequenas ilustrações nos ~10% restantes e destaque máximo do texto.
 */
export const VERSE_CARD_LAYOUT_RULE =
  "FOLHA PARA IMPRIMIR: A4 em PAISAGEM (horizontal), de ponta a ponta. O TEXTO é o protagonista e ocupa cerca de 90% de TODA a área da imagem: letras o maior possível, linhas curtas empilhadas, quase de borda a borda, MAS com margem de segurança de 7% em todos os lados (a impressora corta as pontas), sem espaço vazio desperdiçado no centro. Os 10% restantes são PEQUENAS ILUSTRAÇÕES (de seis a dez, minúsculas e variadas) nas sobras: cantos, bordas e vãos entre as linhas, ligadas ao sentido do trecho; elas nunca tocam nem cobrem as letras. O texto tem destaque máximo: contraste forte com o fundo e contorno e sombra que o deixam legível a três metros de distância.";

export interface VerseCardLook {
  /** Como são as letras (forma, contorno, sombra, destaque da palavra-chave). */
  readonly lettering: string;
  /** O fundo: degradê, textura, padrão, luz — com vida, sem atrapalhar a leitura. */
  readonly background: string;
  /** Vocabulário das pequenas ilustrações da categoria. */
  readonly illustrations: string;
  /** Quanta cor: vivas e alegres (bebê, crianças) ou contidas e sóbrias (adolescentes, adultos). */
  readonly colors: string;
}

/** O visual dos cartões, diferente em cada categoria. */
export const AUDIENCE_VERSE_CARD_LOOK: Readonly<
  Record<ContentAudience, VerseCardLook>
> = {
  [ContentAudience.BABY]: {
    lettering:
      "Letras ENORMES de balão: gordas, arredondadas e fofas, com contorno grosso em tom escuro da paleta e sombra suave embaixo; cada letra bem separada, com brilho leve. Poucas palavras, o maior tamanho possível.",
    background:
      "Fundo alegre e suave, cheio de vida: degradê pastel, nuvenzinhas, bolinhas e bolhas translúcidas, raios de sol macios; nada poluído atrás do texto.",
    illustrations:
      "estrelinhas, corações, nuvenzinhas, solzinho sorridente, patinhos e coelhinhos bem pequenos, bolhas e flores simples — tudo redondinho e fofo, bem pequeno e sem detalhes finos.",
    colors:
      "Cores doces, claras e alegres (tons pastel vivos), em harmonia; pode ser bem colorido, sempre suave para os olhos.",
  },
  [ContentAudience.CHILD]: {
    lettering:
      "Letras extragrandes de adesivo (sticker): gordas e arredondadas, com contorno grosso e contínuo em tom escuro da paleta, sombra projetada marcada e leve brilho; a palavra-chave do trecho um pouco maior ou na cor de destaque da paleta.",
    background:
      "Fundo vibrante e cheio de vida, escolhido pelo sentido do versículo: raios de sol (sunburst), confete, bolinhas ou listras suaves, degradê saturado; sem poluir atrás do texto.",
    illustrations:
      "desenhos cartoon minúsculos que lembram o sentido do trecho: corações, cruz, pássaros, sol com carinha, arco-íris, estrelas, nuvens, folhas, mãozinhas, notas musicais — coloridos e alegres.",
    colors:
      "Cores vivas, saturadas e alegres; pode ser bem colorido, mas sempre dentro da paleta única de até três cores.",
  },
  [ContentAudience.TEEN]: {
    lettering:
      "Tipografia de pôster: sem serifa extra-negrito (peso black ou heavy, condensada ou larga, nunca fina), em caixa alta ou mista, tamanho gigante, com contorno deslocado (offset) ou sombra dura e uma faixa de marca-texto na cor de acento destacando a palavra-chave; escala e peso variando entre as linhas (hierarquia).",
    background:
      "Fundo contido e dinâmico, SEMPRE escuro e uniforme atrás das letras (o contraste com o texto claro é o que dá o destaque): degradê suave entre tons escuros da mesma família, textura granulada ou halftone sutil, formas geométricas e linhas diagonais discretas; estética de capa de série ou de álbum, sem ar infantil.",
    illustrations:
      "ícones de traço fino e doodles minúsculos, em uma só cor (a de acento ou um tom claro), ligados ao sentido do trecho: faíscas, setas, estrelas de quatro pontas, raios, círculos, rabiscos e símbolos simples (chave, bússola, chama, onda).",
    colors:
      "Paleta CONTIDA e sóbria: tons escuros ou neutros dessaturados (grafite, azul-marinho, preto, off-white) e UMA única cor de acento. Nada de arco-íris, nada de cores saturadas ou muitas cores; o impacto vem do contraste ALTÍSSIMO entre texto claro e fundo escuro e da tipografia, não da cor.",
  },
  [ContentAudience.ADULT]: {
    lettering:
      "Letras grandes em serifa de display de traço GROSSO (bold ou black, nunca fina nem light), em tom claro (marfim) ou com efeito de folha de ouro sobre fundo escuro, com leve brilho e sombra suave que garantem o destaque; a palavra-chave em itálico bold ou na cor de acento. Tamanho generoso, sem aparência infantil.",
    background:
      "Fundo sóbrio e profundo, SEMPRE escuro e uniforme atrás das letras (o contraste com o texto marfim é o que dá o destaque), com vida discreta nas bordas: degradê escuro nobre dentro de uma só família de cor, textura sutil de linho ou papel, raios de luz suaves e vinheta; ar de livro de estudo ou cartão de reflexão, nunca chapado nem chamativo.",
    illustrations:
      "ornamentos finos e delicados em uma só cor de acento (dourado suave ou marfim): ramo de oliveira, louro, flourishes, linhas ornamentais, pequenos astros, raios de luz e silhuetas botânicas discretas.",
    colors:
      "Paleta MUITO contida e sóbria: uma cor de fundo escura (azul-noite, grafite, verde-musgo ou vinho profundo), marfim para o texto e UM acento suave (dourado ou cobre). Nada de cores vivas, saturadas ou muitas cores; a diferença de luminosidade entre o fundo escuro e o texto marfim é sempre enorme.",
  },
};

/** Peso das letras dos cartões (todas as categorias): o texto é o destaque, então nunca fino. */
export const VERSE_CARD_WEIGHT_RULE =
  "PESO DAS LETRAS: sempre GROSSAS e fortes (bold, extra-bold ou black), de traço espesso e bem legível; nunca fontes finas, light, hairline, de traço delicado ou com serifas finas, em qualquer estilo. O texto é o destaque da imagem.";

/**
 * Contraste texto × fundo dos cartões do versículo (todas as categorias, e crítico em adolescentes e adultos, de
 * paleta contida): sem contraste forte o texto perde o destaque.
 */
export const VERSE_CARD_CONTRAST_RULE =
  "CONTRASTE: o texto tem contraste FORTE e imediato com o fundo em TODA a área atrás das letras: fundo escuro com letras claras (ou fundo claro com letras escuras), nunca letras de tom médio sobre fundo de tom médio. Nenhuma textura, luz, degradê claro ou ilustração pode ficar atrás das letras reduzindo a leitura; luzes, texturas e ilustrações ficam nas bordas e nas sobras, ou bem apagadas atrás do texto. A palavra-chave em cor de acento também contrasta forte com o fundo (use contorno ou faixa se preciso).";

/**
 * Margem de impressão: nenhuma letra encosta nas bordas da folha. Vale para todos os cartões; a referência, que
 * costuma ser a linha mais longa, quebra em duas linhas.
 */
export const VERSE_CARD_MARGIN_RULE =
  "MARGEM DE IMPRESSÃO: nenhuma letra, ilustração ou sombra encosta nas bordas da folha; deixe 7% livres em cima, embaixo e dos dois lados. Se uma linha for comprida, reduza um pouco o corpo da letra ou quebre a linha, mas nunca deixe a palavra encostar na borda.";
export const VERSE_REFERENCE_LAYOUT_RULE =
  'CARTÃO DA REFERÊNCIA: se a referência for longa (ex.: "Filipenses 4.13"), escreva em DUAS linhas — o nome do livro em cima e o capítulo e versículo embaixo, em tamanho um pouco maior — para a letra ficar grande e centralizada, com a margem de 7%.';

/** Slot da imagem compilada (infográfico) da fixação do versículo e da brincadeira. */
export const COMPILED_SLOT = "compilado-01";

/** Slot da imagem compilada de cada brincadeira (a 1ª é compilado-01; as crianças têm uma 2ª, compilado-02). */
export const compiledSlot = (index: number): string =>
  `compilado-${String(index + 1).padStart(2, "0")}`;

export const isCompiledSlot = (slot: string): boolean =>
  /^compilado-\d{2}$/.test(slot);

/**
 * Quem aparece no infográfico da brincadeira e o que ele mostra, por categoria (o gerador não conhece o público):
 * a imagem é um cartaz de recreação, nunca só objetos, e sempre segura.
 */
export const AUDIENCE_FUN_IMAGE_RULES: Readonly<
  Record<ContentAudience, readonly string[]>
> = {
  [ContentAudience.BABY]: [
    "QUEM APARECE: SOMENTE MULHERES adultas cuidadoras genéricas, de aparências e tons de pele variados (NUNCA homens, pais ou figuras masculinas adultas em nenhum painel ou ícone), com bebês e crianças bem pequenas no colo, no tapete ou no chão macio; gestos de carinho, olhares, cantiga e balanço suave. Sem correria, sem competição, sem placar, sem objetos pequenos que caibam na boca, sem bexigas.",
    "CLIMA: acolhedor, calmo e carinhoso, com cores suaves; poucas paradas bem grandes e legíveis.",
  ],
  [ContentAudience.CHILD]: [
    "QUEM APARECE: crianças genéricas e diversas, em cada parada e no quadro final, fazendo a ação com alegria, empolgação e torcida (jogando, passando, comemorando). Clima de festa e gincana, como cartaz de recreação: cores vivas, bandeirinhas ou confetes.",
    "SEGURANÇA VISÍVEL: espaço livre, ninguém empurrando, ninguém caindo, todos participando juntos.",
  ],
  [ContentAudience.TEEN]: [
    "QUEM APARECE: adolescentes genéricos de 12 a 15 anos, diversos, em ilustração jovem e moderna (nada infantil), em equipe, rindo e interagindo em cada parada. Energia de desafio em grupo, com movimento moderado.",
    "SEGURANÇA VISÍVEL: espaço livre, sem empurrões nem contato brusco, sem exposição de ninguém; todos participam.",
  ],
  [ContentAudience.ADULT]: [
    "QUEM APARECE: adultos genéricos, diversos, em ilustração limpa e sóbria (nada infantil), em pequenos grupos conversando, rindo e interagindo em cada parada, sentados ou em pé, com esforço físico mínimo.",
    "CLIMA: convivência leve e acolhedora, sem competição agressiva; ninguém exposto.",
  ],
};
