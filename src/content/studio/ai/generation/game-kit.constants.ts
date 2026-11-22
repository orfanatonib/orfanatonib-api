import { ContentAudience } from "../../enums/content-audience.enum";

/**
 * Brincadeira divertida no modelo da fixação: um documento, UMA folha de instruções e o KIT imprimível do jogo
 * (cartas de desafio, alvos, fichas, placas, faces de dado…), uma imagem por peça. Aqui não há versículo: a
 * brincadeira vale pela diversão. As crianças têm duas brincadeiras (3 a 8 e 9 a 11 anos), cada uma com o seu kit.
 */

/** Slot da peça `index` da brincadeira `gameIndex`: peca-01… na principal; jogo2-peca-01… na segunda. */
export const gamePieceSlot = (gameIndex: number, index: number): string =>
  `${gameIndex > 0 ? `jogo${gameIndex + 1}-` : ""}peca-${String(index + 1).padStart(2, "0")}`;

/** Id da peça dentro da sua brincadeira (sempre peca-01, peca-02…). */
export const gamePieceId = (index: number): string => gamePieceSlot(0, index);

export const isGamePieceSlot = (slot: string): boolean =>
  /^(jogo\d-)?peca-\d{2}$/.test(slot);

export interface GameKitProfile {
  /** Quantas peças tem o kit de cada brincadeira. */
  readonly pieces: { readonly min: number; readonly max: number };
  /** Máximo de palavras escritas em uma peça (a figura é a protagonista). */
  readonly pieceWords: number;
  /** O que é a brincadeira neste público: diversão em primeiro lugar. */
  readonly dynamic: string;
  /** O que as peças do kit costumam ser neste público. */
  readonly kit: string;
  /** Circuito, corrida leve, revezamento e venda com guia são permitidos (crianças e adolescentes). */
  readonly allowsMovement: boolean;
}

export const GAME_KIT_PROFILES: Readonly<
  Record<ContentAudience, GameKitProfile>
> = {
  [ContentAudience.BABY]: {
    pieces: { min: 3, max: 4 },
    pieceWords: 2,
    dynamic:
      "Brincadeira sensorial e de vínculo, no colo ou no tapete, que arranca sorriso e gargalhada do bebê: esconde-achou com os cartões, cartão que aparece de dentro de uma caixa-surpresa ou de trás de um pano, bichos que fazem som e cócegas, cantiga com gestos, balanço no colo, cartão que vira e mostra outra figura. A cuidadora conduz e o bebê reage: olha, aponta, bate palma, ri. Sem competição, sem tempo, sem correria e sem objetos pequenos. Dura poucos minutos e pede bis.",
    kit: "CARTÕES DE FIGURA GRANDES: cada cartão traz uma figura fofa e bem diferente das outras (um bicho, um brinquedo, um elemento da natureza), que a cuidadora mostra, esconde e faz aparecer; a palavra escrita é só o nome da figura ou o som que ela faz.",
    allowsMovement: false,
  },
  [ContentAudience.CHILD]: {
    pieces: { min: 3, max: 6 },
    pieceWords: 3,
    dynamic:
      "Recreação de verdade, estilo gincana e festa: a criança corre, pula, mira, equilibra, procura, imita e ri. Equipes ou duplas, rodadas rápidas, torcida, uma surpresa no meio (carta coringa, peça premiada, troca de equipe, rodada maluca) e comemoração de todos no fim. Exemplos do tipo de mecânica (são só exemplos, invente outra): circuito com paradas de desafio; caça ao tesouro com cartas escondidas; pontaria em alvos de pontos; revezamento com missão maluca sorteada; estátua e mímica com cartas; dado gigante de desafios; um colega vendado guiado pela voz do outro; boliche de garrafas com cartas-prêmio.",
    kit: "KIT DE GINCANA: cartas de desafio ou missão maluca, alvos com pontos, placas das paradas do circuito, fichas ou medalhas de papel, faces de um dado gigante, cartas de mímica, peças de caça ao tesouro.",
    allowsMovement: true,
  },
  [ContentAudience.TEEN]: {
    pieces: { min: 3, max: 6 },
    pieceWords: 3,
    dynamic:
      "Desafio de equipe com clima de gincana de acampamento: adrenalina, competição saudável, estratégia, zoeira e risada, sem nenhum tom infantil. O grupo se mexe de verdade: revezamento, pontaria, equilíbrio, prova contra o tempo, desafio em dupla, blefe, missão secreta. Tem placar, reviravolta (carta que inverte o placar, rodada relâmpago, desafio surpresa) e final apertado. Exemplos do tipo de mecânica (são só exemplos, invente outra): revezamento com carta de missão em cada parada; duelo de pontaria por pontos; torre ou ponte construída contra o tempo; caça às cartas com pistas; montagem às cegas guiada pela equipe; cartas de desafio sorteadas com pontuações diferentes.",
    kit: "KIT DE DESAFIO: cartas de missão ou desafio com pontuação, alvos com pontos, cartas de poder ou reviravolta, placas das estações, fichas de pontos, placar de equipes.",
    allowsMovement: true,
  },
  [ContentAudience.ADULT]: {
    pieces: { min: 3, max: 6 },
    pieceWords: 3,
    dynamic:
      "Dinâmica de descontração que faz o grupo gargalhar e se soltar, de mesa ou de roda: mímica, adivinhação, desafio em duplas, sorteio de cartas com missões engraçadas, jogo de memória em grupo, blefe leve, passa-carta com música, desafio de equilíbrio sentado. Ritmo animado, humor e cooperação; ninguém é exposto nem obrigado a se apresentar sozinho; sempre possível sentado e sem correr.",
    kit: "KIT DE DINÂMICA: cartas de mímica, de desafio ou de pergunta engraçada, cartas de sorteio, fichas de pontos, placas de equipe, cartas de dupla que se completam.",
    allowsMovement: false,
  },
};

/** A brincadeira é diversão: o que o gerador de texto precisa priorizar acima de tudo. */
export const GAME_FUN_FIRST =
  "DIVERSÃO EM PRIMEIRO LUGAR: esta etapa existe para o grupo rir, se mexer, torcer e pedir para brincar de novo. Na dúvida entre a ideia mais comportada e a mais divertida que cumpre a segurança, escolha SEMPRE a mais divertida. Nada de atividade com cara de aula, dinâmica de reflexão, roda de conversa nem exercício de memorização.";

/** Segurança da brincadeira com movimento (crianças e adolescentes). */
export const GAME_MOVEMENT_SAFETY =
  "Circuito, corrida leve, revezamento e pontaria são permitidos, sempre em espaço livre de obstáculos e piso seguro (nunca escorregadio), com saída e chegada marcadas. Venda nos olhos só com UM colega guiando de perto pela voz, em trajeto curto, livre e sem degraus, com um adulto ao lado. Balão só é estourado sentando ou apertando com as mãos, longe do rosto. Nada cortante, pontudo, quente nem pesado; sem fogo, escada ou altura; sem alimento ou coisa para pôr na boca; sem empurrões, puxões nem contato brusco.";

/** Segurança da brincadeira sem movimento (bebês e adultos). */
export const GAME_CALM_SAFETY =
  "Espaço pequeno e seguro, todos sentados ou em pé no lugar; nada cortante, pontudo, quente nem pesado; sem fogo, escada ou altura; sem venda nos olhos; sem alimento ou coisa para pôr na boca; sem empurrões, puxões nem contato brusco; ninguém corre.";

/** O que vai escrito e desenhado em uma peça do kit. */
export const GAME_PIECE_CONTENT_RULE =
  "A FIGURA é a protagonista: grande, simples, divertida e centralizada dentro da peça. O texto pedido (quando houver) vai em letras GIGANTES, grossas e de altíssimo contraste, inteiro dentro da peça, sem cobrir a figura. Nenhuma outra letra, palavra, número, legenda, marca ou logotipo além do texto pedido. Português do Brasil com todos os acentos, exatamente como pedido.";

/** Entra no prompt da peça só quando a imagem de referência foi de fato anexada. */
export const GAME_PIECE_REFERENCE_RULE =
  "IMAGEM DE REFERÊNCIA ANEXADA: é OUTRA peça deste mesmo kit. Reproduza a peça EXATAMENTE igual na forma: a mesma silhueta, o mesmo tamanho e posição na folha, as mesmas cores de fundo e de borda, os mesmos enfeites nos mesmos lugares, a mesma fonte, cor e contorno das letras. Mude SOMENTE o miolo: apague a figura e o texto da referência e coloque no lugar a figura e o texto pedidos acima. Nada da figura nem do texto da referência pode continuar na peça.";
