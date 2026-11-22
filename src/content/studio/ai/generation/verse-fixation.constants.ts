import { ContentAudience } from "../../enums/content-audience.enum";

/**
 * Fixação divertida do versículo (modelo "Sugestão de Fixação do versículo"): um documento, UM infográfico de
 * instruções e as PEÇAS imprimíveis do jogo, uma imagem por trecho do versículo mais a peça da referência.
 */

/** Slot do infográfico de instruções (o mesmo da imagem compilada, para o histórico continuar valendo). */
export const FIXATION_INSTRUCTIONS_SLOT = "compilado-01";
/** Slot da peça da referência bíblica. */
export const FIXATION_REFERENCE_SLOT = "peca-referencia";

/** Slot da peça de cada trecho: peca-01, peca-02… */
export const fixationPieceSlot = (index: number): string =>
  `peca-${String(index + 1).padStart(2, "0")}`;

export const isFixationPieceSlot = (slot: string): boolean =>
  slot === FIXATION_REFERENCE_SLOT || /^peca-\d{2}$/.test(slot);

export interface FixationProfile {
  /** Quantas peças de trecho (a peça da referência vem sempre a mais). */
  readonly pieces: { readonly min: number; readonly max: number };
  /** Máximo de palavras por peça: poucas, para a letra ficar enorme. */
  readonly pieceWords: number;
  /** O que é a dinâmica neste público e que tipo de jogo cabe. */
  readonly dynamic: string;
  /** Como é a peça imprimível deste público. */
  readonly pieceStyle: string;
  /** Como é o infográfico de instruções deste público. */
  readonly infographicStyle: string;
  /** Circuito, corrida leve e venda com guia são permitidos (crianças e adolescentes). */
  readonly allowsMovement: boolean;
  /** Toda peça traz uma figura grande ligada ao trecho (bebês: a cuidadora mostra a figura). */
  readonly figureOnPieces: boolean;
}

export const FIXATION_PROFILES: Readonly<
  Record<ContentAudience, FixationProfile>
> = {
  [ContentAudience.BABY]: {
    pieces: { min: 1, max: 3 },
    pieceWords: 5,
    dynamic:
      "Momento de colo e musicalidade com CARTÕES DE FIGURA: a cuidadora mostra um cartão de cada vez (uma figura grande e fofa ligada ao trecho), diz ou canta o trecho, faz um gesto e deixa o bebê olhar, apontar e tocar no cartão. Os cartões podem ir para um varal baixo, uma caixa-surpresa de onde saem um a um, um avental ou o tapete. O bebê participa pelo corpo; quem memoriza pela repetição é a cuidadora. Sem competição, sem tempo, sem correria e sem objetos pequenos.",
    pieceStyle:
      "CARTÃO DE FIGURA PARA BEBÊS: uma única figura bem grande, fofa e simples (animal, objeto ou elemento da natureza, nunca uma pessoa real) ocupa a maior parte do cartão; embaixo, o trecho em letras grandes e arredondadas, para a cuidadora ler. Cores suaves, contorno grosso, cantos arredondados.",
    infographicStyle:
      "Infográfico horizontal (paisagem, A4) muito simples e acolhedor, no traço fofo e arredondado do público: poucos painéis grandes, cada um com UM gesto de carinho entre uma mulher cuidadora genérica e um bebê genérico usando os cartões de figura. Texto mínimo e grande. Cores suaves.",
    allowsMovement: false,
    figureOnPieces: true,
  },
  [ContentAudience.CHILD]: {
    pieces: { min: 2, max: 8 },
    pieceWords: 4,
    dynamic:
      "Gincana de verdade em que as PEÇAS do versículo são o material do jogo: as crianças buscam, acham, ganham ou resgatam uma peça de cada vez e montam o versículo na ordem em um quadro, varal, mesa ou painel. Exemplos do tipo de mecânica (são só exemplos, invente outra): circuito com paradas em que cada parada guarda uma peça; quebra-cabeça em revezamento; varal com pregadores; caça às peças escondidas (algumas vazias, de surpresa); pontaria que libera uma peça a cada acerto; encaixe de aros em um tubo na ordem certa; um colega vendado guiado pela voz do outro até a peça; peças dentro de balões ou de uma caixa de presente. Equipes ou duplas, rodadas rápidas e comemoração de todos no fim.",
    pieceStyle:
      "PEÇA DE JOGO PARA CRIANÇAS: recorte ilustrado, colorido e alegre, em traço cartoon de contorno grosso, com o trecho em letras gigantes, gordinhas e muito legíveis.",
    infographicStyle:
      "Infográfico horizontal (paisagem, A4), colorido e alegre, no traço cartoon fofo do público, como uma folha de instruções de gincana: crianças genéricas e animadas fazendo cada ação com as peças, painéis numerados na ordem de leitura, setas e números grandes.",
    allowsMovement: true,
    figureOnPieces: false,
  },
  [ContentAudience.TEEN]: {
    pieces: { min: 2, max: 9 },
    pieceWords: 5,
    dynamic:
      "Desafio de equipe em que as PEÇAS do versículo são o material do jogo: as equipes conquistam uma peça de cada vez e montam o versículo na ordem contra o tempo ou contra a outra equipe. Exemplos do tipo de mecânica (são só exemplos, invente outra): revezamento com missão em cada parada; caça às peças com pistas; pontaria ou arremesso que libera a peça; montagem às cegas guiada pela equipe; torre ou encaixe na ordem certa; peças embaralhadas com peças falsas no meio; desafio final de recitar sem olhar. Competição saudável, humor e nada de tom infantil.",
    pieceStyle:
      "PEÇA DE JOGO PARA ADOLESCENTES: recorte em estilo de pôster jovem e moderno, tipografia sem serifa em negrito, cores vibrantes e contraste forte, sem ar infantil; o trecho em letras gigantes.",
    infographicStyle:
      "Infográfico horizontal (paisagem, A4) moderno, no traço de ilustração jovem do público, como o cartaz de um desafio: adolescentes genéricos em equipe usando as peças em cada passo, painéis numerados, tipografia sem serifa em negrito, paleta de até quatro cores vibrantes. Sem ar infantil.",
    allowsMovement: true,
    figureOnPieces: false,
  },
  [ContentAudience.ADULT]: {
    pieces: { min: 2, max: 10 },
    pieceWords: 6,
    dynamic:
      "Dinâmica leve de mesa ou de roda em que as PEÇAS do versículo são o material do jogo: duplas ou pequenos grupos recebem, sorteiam ou trocam peças e montam o versículo na ordem sobre a mesa, em um varal ou em um painel. Exemplos do tipo de mecânica (são só exemplos, invente outra): peças sorteadas de um cesto; montagem em duplas com uma peça faltando que está com outra dupla; varal coletivo; peças viradas que se revelam uma a uma (memória); completar de cabeça quando uma peça é retirada. Ritmo tranquilo, risada e cooperação; ninguém recita sozinho nem se desloca correndo; sempre possível sentado.",
    pieceStyle:
      "PEÇA DE JOGO PARA ADULTOS: cartão editorial limpo e sóbrio, tipografia elegante e bem legível, paleta contida de até três cores, um único detalhe ilustrado discreto; o trecho em letras bem grandes. Sem ar infantil.",
    infographicStyle:
      "Infográfico horizontal (paisagem, A4) limpo e sóbrio, no traço editorial do público, como uma ficha de dinâmica de grupo: adultos genéricos usando as peças em cada passo, painéis numerados em grade simples, tipografia legível e discreta, paleta contida. Sem ar infantil.",
    allowsMovement: false,
    figureOnPieces: false,
  },
};

/** Segurança da fixação com movimento (crianças e adolescentes): o que foi liberado e em que condições. */
export const FIXATION_MOVEMENT_SAFETY =
  "Circuito, corrida leve e revezamento são permitidos, sempre em espaço livre de obstáculos e piso seguro (nunca escorregadio), com saída e chegada marcadas. Venda nos olhos só com UM colega guiando de perto pela voz, em trajeto curto, livre e sem degraus, com um adulto ao lado. Balão só é estourado sentando ou apertando com as mãos, longe do rosto. Nada cortante, pontudo, quente nem pesado; sem fogo, escada ou altura; sem alimento ou coisa para pôr na boca; sem empurrões, puxões nem contato brusco.";

/** Segurança da fixação sem movimento (bebês e adultos). */
export const FIXATION_CALM_SAFETY =
  "Espaço pequeno e seguro, todos sentados ou em pé no lugar; nada cortante, pontudo, quente nem pesado; sem fogo, escada ou altura; sem venda nos olhos; sem alimento ou coisa para pôr na boca; sem empurrões, puxões nem contato brusco; ninguém corre.";

/**
 * Palavras que não podem fechar uma peça (artigo, preposição, conjunção, possessivo): o trecho ficaria
 * cortado no meio da ideia ("Pois Deus enviou o seu" / "Filho ao mundo, não para").
 */
export const FIXATION_DANGLING_ENDINGS: ReadonlySet<string> = new Set(
  "o a os as um uma uns umas de do da dos das em no na nos nas para por pelo pela pelos pelas com sem sob sobre entre até ao aos à às e ou mas que pois porque nem se seu sua seus suas meu minha meus minhas teu tua teus tuas nosso nossa nossos nossas vosso vossa vossos vossas".split(
    " ",
  ),
);

/** Jogos com movimento (crianças e adolescentes): a peça é conquistada com o corpo, não só na mesa. */
export const FIXATION_MOVEMENT_REQUIRED =
  "O jogo tem MOVIMENTO ou DESAFIO FÍSICO LEVE de verdade para conquistar cada peça (ir buscar, acertar um alvo, equilibrar, passar de mão em mão, revezar, procurar pelo espaço). Uma atividade feita só sentado em volta da mesa, apenas virando e ordenando peças, NÃO serve para este público: troque a ideia.";

/** A peça é para imprimir e recortar: inteira na folha, sobre fundo branco. */
export const FIXATION_PIECE_PRINT_RULE =
  "PARA IMPRIMIR E RECORTAR: a peça aparece UMA única vez, inteira, centralizada e bem grande (ocupa cerca de 85% da folha A4 na horizontal), sobre FUNDO BRANCO PURO e liso, sem cenário, sem sombra projetada e sem mesa ou mãos segurando. Vista de FRENTE, plana, sem perspectiva nem inclinação: a silhueta, as proporções e a posição de cada detalhe são idênticas em todas as peças do jogo. Contorno externo bem definido, para recortar com tesoura. Nenhuma parte da peça encosta nas bordas da folha (margem de pelo menos 6%).";

/** Entra no prompt da peça só quando a imagem de referência foi de fato anexada. */
export const FIXATION_PIECE_REFERENCE_RULE =
  "IMAGEM DE REFERÊNCIA ANEXADA: é OUTRA peça deste mesmo jogo. Reproduza a peça EXATAMENTE igual: a mesma silhueta, o mesmo tamanho e posição na folha, as mesmas cores, bordas e detalhes nos mesmos lugares, a mesma fonte, cor e contorno das letras. Mude SOMENTE o texto escrito: apague o texto da referência e escreva no lugar apenas o texto pedido acima. Nenhuma palavra da referência pode continuar na peça.";

/** O texto da peça é só o trecho. */
export const FIXATION_PIECE_TEXT_RULE =
  "Dentro da peça vai SOMENTE o texto pedido, em letras GIGANTES, grossas, de altíssimo contraste com o fundo da peça e inteiras dentro dela (se precisar, quebre em duas ou três linhas; nunca diminua a letra nem corte palavra). Nenhuma outra letra, palavra, número, legenda, marca ou logotipo. Português do Brasil com todos os acentos e a pontuação exatamente como pedido.";
