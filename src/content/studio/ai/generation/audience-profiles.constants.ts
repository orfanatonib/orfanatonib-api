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
  readonly visualItems: { readonly min: number; readonly max: number };
  /** Marcação das ações do condutor dentro do texto: (Ação do Professor: …). */
  readonly facilitatorAction: string;
  readonly supportMaterials: { readonly min: number; readonly max: number };
  readonly teacherActions: { readonly min: number; readonly max: number };
  /** Como a lição é entregue com objetos de apoio (a dinâmica do item 1). */
  readonly lessonDelivery: string;
  /** Quantos blocos (cenas) a história tem e quanto da passagem ela cobre. */
  readonly storyBlocks: string;
  readonly storyScope: string;
  /** Mínimo de falas em discurso direto (aspas) na história; 0 para bebês. */
  readonly minQuotes: number;
  /** Palavras no máximo do versículo para memorizar (e de cada opção). */
  readonly verseMaxWords: number;
  /** Peças por prancha do kit de recortes (o bebê vê poucas e grandes). */
  readonly maxKitElements: number;
  readonly icebreaker: string;
  readonly application: string;
  /** Direção de arte dos visuais da lição. */
  readonly storyVisuals: string;
  readonly verseCards: string;
  readonly verseCardArt: string;
  /** O que é a fixação divertida do versículo e a brincadeira divertida neste público. */
  readonly verseFixation: string;
  readonly game: string;
  readonly gameForbidden: string;
  readonly adaptations: { readonly younger: string; readonly older: string };
  readonly gameMinutes: { readonly min: number; readonly max: number };
  readonly gameSafety: string;
  /** Espaço máximo da brincadeira (sala pequena, roda ou mesa): nada de percurso, corrida ou quadra. */
  readonly gameSpace: string;
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
    lessonWords: { min: 250, max: 450 },
    reviewQuestions: { min: 0, max: 0 },
    activitySteps: { min: 2, max: 4 },
    visualItems: { min: 2, max: 4 },
    facilitatorAction: "Ação do Voluntário",
    supportMaterials: { min: 3, max: 5 },
    teacherActions: { min: 6, max: 10 },
    storyBlocks: "de 8 a 10",
    storyScope:
      "Não conte a passagem inteira: escolha de três a cinco cenas centrais e deixe de fora disputas, sorteios, sacrifícios e cenas que assustam. Uma frase-refrão curta aparece já no segundo bloco e volta a cada dois ou três blocos. Use sons (onomatopeias) e repetição, no ritmo de uma cantiga.",
    minQuotes: 0,
    verseMaxWords: 8,
    maxKitElements: 4,
    lessonDelivery:
      "A lição é uma história-canção contada com voz suave e ritmo, em blocos curtos de uma a três frases (de oito a doze blocos). Cada bloco traz um gesto, um toque suave, um som (onomatopeia, como o vento ou as ondas) ou um objeto macio (ação do voluntário). Uma frase-refrão curta volta a cada dois ou três blocos para o cuidador repetir baixinho. É rica em sentidos: ver, tocar, ouvir, balançar. Cabe em 5 a 7 minutos e o foco é o vínculo: olhar, colo, voz e carinho. Temas duros (morte, violência, traição) entram em uma frase suave e sem detalhes, e o centro é o amor de Deus e de Jesus por cada bebê.",
    icebreaker:
      "Uma cantiga ou rima curta de poucas linhas inventada para o tema (ou sobre uma melodia conhecida), com gestos, olhando e sorrindo para cada bebê enquanto o objeto macio é mostrado. Sem perguntas que exijam resposta.",
    application:
      "Duas ou três frases doces e curtas que ligam a história ao amor de Jesus por cada bebê e ao cuidado de Deus por quem cuida dele (Deus cuida de você como você cuida deste bebê), e uma oração curtíssima em voz baixa, entre aspas, dita com carinho.",
    storyVisuals:
      "Imagens grandes, de poucos elementos, contornos arredondados, cores suaves e contraste alto, reconhecíveis a um metro de distância. Um único foco por imagem, sem fundo poluído.",
    verseCards:
      "Prefira de uma a duas partes bem curtas, de duas a quatro palavras cada, para o cuidador repetir como canto.",
    verseCardArt:
      "Letras enormes e arredondadas, poucas palavras por cartão, cores suaves e fundo liso.",
    verseFixation:
      "Brincadeira sensorial de colo e musicalidade em que o cuidador repete o versículo (ou uma frase-síntese dele) cantando, balançando, batendo palminhas ou fazendo gestos. O bebê participa pelo corpo; o cuidador memoriza pela repetição.",
    game: "Brincadeira sensorial e de vínculo para o colo ou o tapete: cantiga com gestos, balançar no colo, esconde-esconde com as mãos, espelho inquebrável, chocalho grande de tecido, fita de cetim na mão do adulto, cesto de objetos macios e grandes, bola macia grande, fantoche de dedo grande (são só exemplos: invente, sem repetir sempre o mesmo objeto). Dura poucos minutos e pode ser repetida.",
    gameForbidden:
      "competição, tempo cronometrado, placar, correria, objetos pequenos que caibam na boca, sons altos ou luzes fortes, fila ou espera de vez",
    adaptations: {
      younger: "BEBÊS DE 0 A 12 MESES",
      older: "CRIANÇAS DE 1 A 2 ANOS",
    },
    gameMinutes: { min: 3, max: 8 },
    gameSafety:
      "objetos grandes demais para a boca, sem pontas nem partes soltas e higienizáveis; nada de bexiga, bolinha de gude, moeda, pilha ou bolhas sem supervisão; ninguém pega o bebê no colo sem o consentimento do cuidador; volume baixo",
    gameSpace:
      "um tapete ou o colo (cerca de 2 m × 2 m), tudo no chão macio, sem sair do lugar",
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
      "adaptações para 3 a 7 anos (mais simples) e 8 a 11 anos (mais desafiador)",
      "ninguém é exposto, comparado ou constrangido diante do grupo",
    ],
    lessonWords: { min: 700, max: 1000 },
    reviewQuestions: { min: 6, max: 8 },
    activitySteps: { min: 3, max: 6 },
    visualItems: { min: 4, max: 10 },
    facilitatorAction: "Ação do Professor",
    supportMaterials: { min: 3, max: 6 },
    teacherActions: { min: 3, max: 6 },
    storyBlocks: "de 5 a 8",
    storyScope:
      "Conte a passagem inteira, do começo ao fim, em ordem, sem pular o desfecho.",
    minQuotes: 2,
    verseMaxWords: 15,
    maxKitElements: 12,
    lessonDelivery:
      "A lição é uma narrativa ao vivo com objetos de apoio: cada material representa uma ideia da história e o professor o usa em momentos marcados como (Ação do Professor: …) — mostrar, encher, esconder, virar, apontar, fazer uma expressão. As crianças participam respondendo perguntas curtas, repetindo uma frase-chave e olhando o objeto.",
    icebreaker:
      "Uma situação do cotidiano infantil e neutra (festa, brinquedo, lanche, escola, bola) que cria a pergunta que a história responde. Termina apresentando o objeto de apoio e o desafio: hoje vamos descobrir… Sem exigir que a criança fale da própria família.",
    application:
      "Dois movimentos: o que a história mostra sobre Jesus e sobre Deus, e o que a criança pode levar para a vida (entregar a Jesus o que é pequeno ou difícil). O convite é voluntário (se você quiser, pode orar comigo), com uma oração simples dita frase a frase.",
    storyVisuals:
      "Ilustração bíblica infantil, calorosa e colorida, com personagens de cabeça grande e expressões claras, legível à distância numa sala com várias crianças, sem elementos assustadores.",
    verseCards:
      "De uma a nove partes, curtas o bastante para decorar e completas o bastante para fazer sentido, com a referência em um cartão final.",
    verseCardArt:
      "Tipografia infantil extragrande e arredondada, fundo vibrante e paleta de até três cores, com pequenos desenhos que lembram o sentido de cada trecho.",
    verseFixation:
      "Gincana com ação física (correr, buscar, arremessar, estourar, montar) em que cada rodada faz as crianças falarem, montarem ou recuperarem o versículo, com repetição progressiva até todas recitarem juntas o versículo completo com a referência. Funciona para quem ainda não lê.",
    game: "Recreação de verdade, estilo gincana, em ESPAÇO PEQUENO (cabe numa sala pequena ou num canto: roda ou duas equipes frente a frente, tudo a no máximo três passos): ação com o corpo no lugar (mirar, arremessar, equilibrar, derrubar, empilhar, passar, estourar balão no lugar), equipes, rodadas, placar e vencedor, como boliche de garrafas PET, pontaria em baldes, pescaria numa bacia, torre de copos, ovo na colher parado, balão que não pode cair. A ligação com a lição é leve: nome, tema e princípio bíblico depois de brincar.",
    gameForbidden:
      "corrida, percurso, estafeta, circuito ou qualquer deslocamento de mais de três passos; desenhar, colorir, gestos ou mímica parados, apontar cartazes, quiz, reflexão e encenação",
    adaptations: {
      younger: "CRIANÇAS DE 3 A 7 ANOS",
      older: "CRIANÇAS DE 8 A 11 ANOS",
    },
    gameMinutes: { min: 10, max: 15 },
    gameSafety:
      "espaço livre de obstáculos, ninguém corre, empurra ou puxa; nada cortante nem pesado, sem alimento sem alerta de alergia, sem venda nos olhos; objetos grandes demais para a boca nas crianças de até 5 anos; a vitória de uma equipe nunca é sinal de maior fé ou favor de Deus",
    gameSpace:
      "até 3 m × 3 m: uma roda ou duas equipes frente a frente, sem sair do lugar (no máximo três passos)",
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
    lessonWords: { min: 800, max: 1100 },
    reviewQuestions: { min: 6, max: 8 },
    activitySteps: { min: 3, max: 6 },
    visualItems: { min: 3, max: 8 },
    facilitatorAction: "Ação do Líder",
    supportMaterials: { min: 3, max: 4 },
    teacherActions: { min: 2, max: 5 },
    storyBlocks: "de 5 a 8",
    storyScope:
      "Conte a passagem inteira, do começo ao fim, em ordem, sem pular o desfecho, com os dilemas e as emoções que um adolescente reconhece.",
    minQuotes: 2,
    verseMaxWords: 30,
    maxKitElements: 12,
    lessonDelivery:
      "A lição é uma narrativa conduzida com objetos simbólicos que viram metáfora (a pedra, o espelho, a coroa): o líder os usa em momentos marcados como (Ação do Líder: …) e faz pausas para provocar o pensamento, sem exigir resposta em voz alta. A história conecta o personagem bíblico a dilemas reais da idade.",
    icebreaker:
      "Uma provocação honesta ligada à vida real (pressão do grupo, comparação, medo de não ser aceito, decisões) usando um objeto simbólico, que apresenta a pergunta central sem expor ninguém. Perguntas retóricas ou de resposta voluntária.",
    application:
      "Confronta com respeito e esperança: o que a história revela sobre Deus e sobre quem somos, o desafio concreto da semana e a oferta clara do evangelho. A oração é voluntária, curta e em linguagem natural; ninguém é forçado a levantar a mão ou fechar os olhos.",
    storyVisuals:
      "Ilustração bíblica contemporânea e respeitosa, menos infantil, com proporções realistas, expressões marcantes e paleta mais sóbria, sem humor que diminua o texto bíblico, sem violência gráfica e sem estereótipos.",
    verseCards:
      "De uma a nove partes, em frases de ritmo natural que se leiam como legenda, com a referência em um cartão final.",
    verseCardArt:
      "Tipografia moderna e legível, forte contraste, paleta de até três cores mais sóbria, sem desenhos infantis e com poucos elementos gráficos discretos.",
    verseFixation:
      "Dinâmica de grupo com desafio, equipes e movimento (revezamento, caça às palavras, montagem em ordem, desafio dos trechos, eco que vai perdendo palavras) em que cada rodada obriga a falar, montar ou recuperar o versículo, até todos o recitarem completo com a referência. Competição leve, sem expor quem erra.",
    game: "Dinâmica divertida de grupo em ESPAÇO PEQUENO (sala pequena, roda ou mesa) com ação e competição saudável: desafios por equipe em pé no lugar ou à mesa, pontaria, torre de copos, cooperação sob pressão de tempo, desafios de equilíbrio, passa-objeto, jogo de memória em equipe. Clima de gincana de acampamento, com humor e sem tom infantil. A ligação com a lição aparece no nome, no tema e no princípio depois de jogar.",
    gameForbidden:
      "corrida, percurso, estafeta, circuito ou deslocamento de mais de três passos; mecânica que seja só conversa, roda de debate, quiz sentado, desenho, mímica parada, ou qualquer coisa que exponha, ridicularize ou toque nos participantes; jogos de beijo, verdade ou consequência e desafios de humilhação",
    adaptations: {
      younger: "ADOLESCENTES DE 12 E 13 ANOS",
      older: "ADOLESCENTES DE 14 E 15 ANOS",
    },
    gameMinutes: { min: 10, max: 20 },
    gameSafety:
      "sem contato físico forçado, sem apostas, sem exposição de quem perde, sem desafios de humilhação, comida ou fôlego; espaço livre e piso seguro; equipes equilibradas por idade e quem não quiser participar fisicamente vira juiz ou placar",
    gameSpace:
      "até 3 m × 3 m: uma mesa ou uma roda, em pé no lugar ou sentados, sem sair do lugar (no máximo três passos)",
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
    lessonWords: { min: 900, max: 1300 },
    reviewQuestions: { min: 6, max: 8 },
    activitySteps: { min: 3, max: 6 },
    visualItems: { min: 3, max: 8 },
    facilitatorAction: "Ação do Condutor",
    supportMaterials: { min: 3, max: 3 },
    teacherActions: { min: 2, max: 4 },
    storyBlocks: "de 5 a 8",
    storyScope:
      "Conte a passagem inteira, do começo ao fim, em ordem, com o contexto histórico que ilumina o texto e sem pular o desfecho.",
    minQuotes: 1,
    verseMaxWords: 40,
    maxKitElements: 12,
    lessonDelivery:
      "A lição é uma exposição conversada com três objetos simbólicos (como a bússola, o peso e a planta de Jonas): o condutor os usa em momentos marcados como (Ação do Condutor: …) para tornar a ideia visível, e traz o contexto histórico e cultural necessário. A pergunta final fica no ar para o grupo.",
    icebreaker:
      "Uma pergunta honesta sobre a vida adulta (recomeçar, perdoar, cansaço, fugir de um chamado) que cria identificação sem exigir confissão em público, terminando com a apresentação do objeto de apoio e da direção da lição.",
    application:
      "Espelho e esperança: o que a história revela sobre Deus, onde cada um se reconhece nela e qual é o próximo passo concreto. Apresenta Jesus com clareza e convida, sem pressão, a um momento de silêncio e a uma oração voluntária conduzida em voz alta; ninguém é exposto.",
    storyVisuals:
      "Ilustração respeitosa e sóbria, de proporções realistas, com atmosfera adulta e sem traço infantil, fiel à época e aos lugares bíblicos, sem violência gráfica e sem humor que diminua o texto.",
    verseCards:
      "De uma a nove partes, seguindo o ritmo natural da frase, com a referência em um cartão final.",
    verseCardArt:
      "Tipografia limpa e elegante, forte contraste e paleta sóbria de até três cores, com ornamentos mínimos e discretos, sem desenhos infantis.",
    verseFixation:
      "Dinâmica leve em duplas ou grupos pequenos para fixar o versículo (montar o texto em ordem, completar trechos, passa a palavra, recitar em revezamento, desafio de completar de cabeça), terminando com todos dizendo juntos o versículo e a referência. Ninguém é obrigado a recitar sozinho.",
    game: "Dinâmica de integração e descontração em grupo, de ritmo leve e risada, em ESPAÇO PEQUENO (mesa ou roda, sentados ou em pé no lugar): jogos cooperativos, desafios em duplas ou equipes, passa o objeto, adivinhações com mímica, jogos de memória em grupo, torre de copos e desafios de equilíbrio sentados. A ligação com a lição está no nome e no princípio dito depois.",
    gameForbidden:
      "corrida, percurso, estafeta, circuito ou deslocamento de mais de três passos; qualquer coisa que exponha histórias pessoais, exija contato físico, vergonha ou humilhação; jogos de azar ou aposta; mecânica que seja só conversa ou quiz sentado",
    adaptations: {
      younger: "JOVENS DE 16 A 25 ANOS",
      older: "ADULTOS E IDOSOS",
    },
    gameMinutes: { min: 10, max: 20 },
    gameSafety:
      "considerar pessoas com mobilidade reduzida, saúde frágil ou idosas: sempre uma versão sentada ou de baixo esforço; sem contato físico, sem apostas, sem exposição de quem erra; espaço livre e piso seguro",
    gameSpace:
      "uma mesa ou uma roda de cadeiras (cerca de 3 m × 3 m), todos sentados ou em pé no lugar",
  },
};

/**
 * Brincadeira das crianças: UM documento com DUAS brincadeiras, uma por faixa etária, cada uma com a sua imagem
 * compilada (compilado-01 e compilado-02). As demais categorias têm uma só.
 */
export interface GameAgeGroup {
  readonly label: string;
  readonly range: string;
  readonly adaptations: { readonly younger: string; readonly older: string };
  readonly look: string;
}

export const CHILD_GAME_AGE_GROUPS: readonly GameAgeGroup[] = [
  {
    label: "Crianças de 3 a 8 anos",
    range: "3 a 8 anos",
    adaptations: {
      younger:
        "3 a 5 anos: regra mais simples, objetos maiores e a ajuda de um adulto na vez de cada um",
      older:
        "6 a 8 anos: acrescente uma pequena meta de pontos ou um tempo curto",
    },
    look: "crianças de 3 a 8 anos, em traço infantil fofo e arredondado",
  },
  {
    label: "Crianças de 9 a 11 anos",
    range: "9 a 11 anos",
    adaptations: {
      younger:
        "9 e 10 anos: jogue em duplas, com a regra completa e sem tempo cronometrado",
      older:
        "11 anos: aumente o desafio com mais pontos, menos tempo ou um alvo menor",
    },
    look: "crianças de 9 a 11 anos, mais velhas, em traço cartoon vivo e menos infantil (sem aspecto de bebê)",
  },
];
