import { LessonCategory, LessonVisualStyle } from "../enums/lesson.enums";

/** Tudo que muda de um público para outro nos prompts do Estúdio Orfanato. */
export type LessonCategoryProfile = {
  /** Rótulo exibido (cabeçalhos, publicação, nome de arquivo). */
  label: string;
  /** Trecho seguro para nome de arquivo e rota. */
  slug: string;
  /** Faixa etária por extenso. */
  ageRange: string;
  /** Como o público é citado dentro das frases dos prompts. */
  audience: string;
  /** Quem conduz o encontro. */
  facilitator: string;
  /** Como o condutor é chamado nas orientações entre parênteses. */
  facilitatorAction: string;
  /** Tom e vocabulário. */
  voice: string;
  /** Faixa de palavras do campo story (referência do acervo LIÇÕES NOVAS 2026). */
  storyWords: { min: number; max: number };
  /** Quantidade de perguntas com gabarito. */
  questions: { min: number; max: number };
  /** Quantidade de materiais de apoio e de marcações de ação do condutor. */
  supportMaterials: { min: number; max: number };
  teacherActions: { min: number; max: number };
  /** Como a lição é entregue ao público (a dinâmica do item 1). */
  lessonDelivery: string;
  /** Como o quebra-gelo funciona. */
  icebreaker: string;
  /** Como aplicação e apelo são conduzidos. */
  application: string;
  /** Direção de arte dos visuais da lição. */
  storyVisuals: string;
  /** Estilo de desenho sugerido (o administrador pode trocar). */
  recommendedVisualStyle: LessonVisualStyle;
  /** Quantas partes o versículo pode ter (de 1 a 9 no contrato técnico). */
  verseCards: string;
  /** Arte dos cartões do versículo. */
  verseCardArt: string;
  /** O que é a fixação divertida do versículo. */
  verseFixation: string;
  /** O que é a brincadeira divertida. */
  game: string;
  /** O que é proibido como mecânica principal da brincadeira e da fixação. */
  gameForbidden: string;
  /** Rótulos das adaptações por idade dentro do mesmo grupo. */
  adaptations: { younger: string; older: string };
  /** Duração em minutos da brincadeira e da fixação. */
  gameMinutes: { min: number; max: number };
  /** Segurança física específica do público. */
  safety: string;
};

/**
 * Contexto comum a todos os públicos: a visita ao abrigo. Cuidados que nunca
 * podem ser removidos por prompt de administrador.
 */
export const SHELTER_VISIT_CONTEXT = `CONTEXTO DA VISITA (Ministério Orfanato NIB)
- O material é usado por voluntários da Nova Igreja Batista em visitas a abrigos e casas de acolhimento. Quem recebe é um grupo de pessoas acolhidas, muitas com histórias de perda, separação, violência ou abandono.
- Nunca chame o grupo de "órfãos" nem exponha a história pessoal de ninguém. Não peça que alguém conte sua situação familiar, não faça perguntas que exijam falar de pai, mãe ou família sem alternativa neutra, e não use "quem aqui não tem…" ou comparações com famílias ideais.
- Apresente Deus como Pai e Cuidador sem pressupor que a figura de pai ou mãe humanos foi boa. Quando o tema tocar família, perda ou rejeição, trate com acolhimento, sem culpa e sem promessa de que tudo se resolve já.
- Toda participação é voluntária: ninguém é obrigado a falar, orar, recitar, ser escolhido ou ser tocado. Nada de fotos, nomes ou dados pessoais no material.
- O voluntário visita uma vez e pode não voltar: a lição, a dinâmica e a brincadeira precisam funcionar completas em uma única visita, sem depender de encontros anteriores.
- Materiais simples, baratos e fáceis de levar na mochila; nada que dependa de internet, projetor ou eletricidade.`;

export const LESSON_CATEGORY_PROFILES: Record<
  LessonCategory,
  LessonCategoryProfile
> = {
  [LessonCategory.BABY]: {
    label: "Baby",
    slug: "baby",
    ageRange: "0 a 2 anos",
    audience: "bebês e crianças de 0 a 2 anos, com o cuidador por perto",
    facilitator: "o voluntário e o cuidador que está com o bebê",
    facilitatorAction: "Ação do Voluntário",
    voice:
      "Frases curtíssimas, voz suave, repetição, rima e musicalidade. O texto é dito PARA o cuidador e PELO voluntário: o bebê entende o tom, o rosto, o colo e o gesto, não o conteúdo. Nenhum conceito abstrato.",
    storyWords: { min: 150, max: 350 },
    questions: { min: 3, max: 4 },
    supportMaterials: { min: 2, max: 3 },
    teacherActions: { min: 3, max: 6 },
    lessonDelivery:
      "A lição é contada em blocos de uma a três frases, cada um acompanhado de um gesto, um toque suave ou um objeto macio (ação do voluntário). A história cabe em 5 minutos, com repetição de uma frase-refrão que o cuidador repete baixinho. O foco é o vínculo: olhar, colo, voz e carinho.",
    icebreaker:
      "Um momento de olhar e música: cantarolar o nome de Deus ou do tema, mostrar um objeto macio ou colorido e sorrir para cada criança. Sem perguntas que exijam resposta falada.",
    application:
      "Uma frase de cuidado direcionada ao cuidador (Deus cuida de você como você cuida deste bebê) e uma oração curtíssima e voluntária, em voz baixa. Nada de apelo emocional ou decisão.",
    storyVisuals:
      "Imagens grandes, de poucos elementos, contornos arredondados, cores suaves e contraste alto, fáceis de reconhecer a um metro de distância. Um único foco por imagem, sem fundo poluído.",
    recommendedVisualStyle: LessonVisualStyle.CUTE_CARTOON,
    verseCards:
      "Prefira de uma a duas partes bem curtas, de duas a quatro palavras cada, para o cuidador repetir como canto.",
    verseCardArt:
      "Letras enormes e arredondadas, poucas palavras por cartão, cores suaves e fundo liso.",
    verseFixation:
      "Uma brincadeira sensorial de colo e musicalidade em que o cuidador repete o versículo (ou uma frase-síntese dele) cantando, balançando, batendo palminhas ou fazendo gestos. O bebê participa pelo corpo; o cuidador memoriza pela repetição.",
    game: "Uma brincadeira sensorial e de vínculo para o chão ou o colo: esconde-esconde com pano, bolhas de sabão, tocar texturas seguras, cantiga com gestos, balançar no colo, cesto de objetos macios. Dura poucos minutos e pode ser repetida várias vezes.",
    gameForbidden:
      "Competição, tempo cronometrado, placar, correria, objetos pequenos que caibam na boca, sons altos ou luzes fortes, e qualquer coisa que exija ficar em fila ou esperar a vez.",
    adaptations: {
      younger: "BEBÊS DE 0 A 12 MESES",
      older: "CRIANÇAS DE 1 A 2 ANOS",
    },
    gameMinutes: { min: 3, max: 8 },
    safety:
      "Objetos grandes demais para a boca, sem pontas, sem partes soltas e higienizáveis; nada de bexiga, bolinha de gude, moeda, pilha ou bolhas sem supervisão; ninguém pega o bebê no colo sem o consentimento do cuidador; volume baixo.",
  },
  [LessonCategory.CHILD]: {
    label: "Crianças",
    slug: "criancas",
    ageRange: "3 a 11 anos",
    audience: "crianças de 3 a 11 anos",
    facilitator: "o professor voluntário",
    facilitatorAction: "Ação do Professor",
    voice:
      "Português brasileiro falado, caloroso e concreto, com frases curtas, perguntas às crianças, comparações do dia a dia e palavras difíceis explicadas na hora. O voluntário conversa com as crianças como num bate-papo, sem tom de sermão.",
    storyWords: { min: 450, max: 700 },
    questions: { min: 6, max: 8 },
    supportMaterials: { min: 3, max: 6 },
    teacherActions: { min: 3, max: 6 },
    lessonDelivery:
      "A lição é uma narrativa ao vivo com objetos de apoio: cada material representa uma ideia da história e o professor o usa em momentos marcados como (Ação do Professor: …) — mostrar, encher, esconder, virar, apontar, fazer uma expressão. As crianças participam respondendo perguntas curtas, repetindo uma frase-chave e olhando o objeto.",
    icebreaker:
      'Uma situação do cotidiano infantil e neutra (festa, brinquedo, lanche, escola, bola) que cria a pergunta que a história responde. Termina apresentando o objeto de apoio e o desafio: "hoje vamos descobrir…". Sem exigir que a criança fale da própria família.',
    application:
      'Dois movimentos: o que a história mostra sobre Jesus e sobre Deus, e o que a criança pode levar para a vida (entregar a Jesus o que é pequeno ou difícil). O convite é voluntário ("se você quiser, pode orar comigo"), com uma oração simples dita frase a frase.',
    storyVisuals:
      "Ilustração bíblica infantil, calorosa e colorida, com personagens de cabeça grande e expressões claras, legível à distância numa sala com várias crianças, sem elementos assustadores.",
    recommendedVisualStyle: LessonVisualStyle.CUTE_CARTOON,
    verseCards:
      "De uma a nove partes, curtas o bastante para decorar e completas o bastante para fazer sentido, com a referência em um cartão final.",
    verseCardArt:
      "Tipografia infantil extragrande e arredondada, fundo vibrante e paleta de até três cores, com pequenos desenhos que lembram o sentido de cada trecho.",
    verseFixation:
      "Uma gincana com ação física (correr, buscar, arremessar, estourar, montar) em que cada rodada faz as crianças falarem, montarem ou recuperarem o versículo, com repetição progressiva até todas recitarem juntas o versículo completo com a referência. Funciona para quem ainda não lê.",
    game: "Recreação de verdade, no estilo gincana: ação física (correr, pular, mirar, arremessar, equilibrar, puxar, estourar, buscar), equipes, rodadas, placar e vencedor, como estoura balão, pescaria, tiro ao alvo, cabo de guerra, pênalti, corrida do saco, ovo na colher e boliche de garrafa. A ligação com a lição é leve: nome, tema e princípio bíblico depois de brincar.",
    gameForbidden:
      "Desenhar, colorir, gestos ou mímica parados, apontar cartazes, quiz, reflexão, encenação e qualquer atividade que caiba numa sala com as crianças sentadas.",
    adaptations: {
      younger: "CRIANÇAS DE 3 A 7 ANOS",
      older: "CRIANÇAS DE 8 A 11 ANOS",
    },
    gameMinutes: { min: 10, max: 15 },
    safety:
      "Espaço livre de obstáculos, nada cortante, sem alimento sem alerta de alergia, sem venda nos olhos sem assistência, corridas só em piso seguro e sem empurrar; a vitória de uma equipe nunca é sinal de maior fé ou favor de Deus.",
  },
  [LessonCategory.TEEN]: {
    label: "Adolescentes",
    slug: "adolescentes",
    ageRange: "12 a 15 anos",
    audience: "adolescentes de 12 a 15 anos",
    facilitator: "o líder voluntário",
    facilitatorAction: "Ação do Líder",
    voice:
      "Direto, honesto e sem infantilizar: linguagem do dia a dia deles, exemplos de escola, grupo de amigos, redes sociais, pressão, família e identidade, sem gíria forçada, sem sermão e sem ironia que ridicularize. Perguntas reais e silêncio respeitado.",
    storyWords: { min: 550, max: 850 },
    questions: { min: 6, max: 8 },
    supportMaterials: { min: 3, max: 4 },
    teacherActions: { min: 2, max: 5 },
    lessonDelivery:
      'A lição é uma narrativa conduzida com objetos simbólicos que viram metáfora ("a pedra", "o espelho", "a coroa"): o líder os usa em momentos marcados como (Ação do Líder: …) e faz pausas para provocar o pensamento, sem exigir resposta em voz alta. A história conecta o personagem bíblico a dilemas reais da idade.',
    icebreaker:
      "Uma provocação honesta ligada à vida real (pressão do grupo, comparação, medo de não ser aceito, decisões) usando um objeto simbólico, que apresenta a pergunta central sem expor ninguém. Perguntas retóricas ou de resposta voluntária.",
    application:
      "Confronta com respeito e esperança: o que a história revela sobre Deus e sobre quem somos, o desafio concreto da semana e a oferta clara do evangelho. A oração é voluntária, curta e em linguagem natural; ninguém é forçado a levantar a mão ou fechar os olhos.",
    storyVisuals:
      "Ilustração bíblica contemporânea e respeitosa, menos infantil, com proporções realistas, expressões marcantes e paleta mais sóbria, sem humor que diminua o texto bíblico, sem violência gráfica e sem estereótipos.",
    recommendedVisualStyle: LessonVisualStyle.ILLUSTRATED,
    verseCards:
      "De uma a nove partes, em frases de ritmo natural que se leiam como legenda, com a referência em um cartão final.",
    verseCardArt:
      "Tipografia moderna e legível, forte contraste, paleta de até três cores mais sóbria, sem desenhos infantis e com poucos elementos gráficos discretos.",
    verseFixation:
      'Uma dinâmica de grupo com desafio, equipes e movimento (revezamento, caça às palavras, montagem em ordem, "desafio dos trechos", eco que vai perdendo palavras) em que cada rodada obriga a falar, montar ou recuperar o versículo, até todos o recitarem completo com a referência. Competição leve, sem expor quem erra.',
    game: 'Uma dinâmica divertida de grupo com ação e competição saudável: desafios por equipe, circuito, caça ao objeto, jogos de pontaria, cooperação sob pressão de tempo, "quem sou eu" em movimento, desafios de equilíbrio e estafetas. O clima é de gincana de acampamento, com humor e sem tom infantil. A ligação com a lição aparece no nome, no tema e no princípio depois de jogar.',
    gameForbidden:
      "Mecânica que seja só conversa, roda de debate, quiz sentado, desenho, mímica parada, ou qualquer coisa que exponha, ridicularize ou toque nos participantes; jogos de beijo, verdade ou consequência e desafios de humilhação.",
    adaptations: {
      younger: "ADOLESCENTES DE 12 E 13 ANOS",
      older: "ADOLESCENTES DE 14 E 15 ANOS",
    },
    gameMinutes: { min: 10, max: 20 },
    safety:
      "Sem contato físico forçado, sem apostas, sem exposição de quem perde, sem desafios de humilhação, comida ou fôlego; espaço livre de obstáculos e piso seguro; equipes equilibradas por idade e quem não quiser participar fisicamente vira juiz ou placar.",
  },
  [LessonCategory.ADULT]: {
    label: "Adultos",
    slug: "adultos",
    ageRange: "16 anos ou mais",
    audience: "adultos e jovens a partir de 16 anos",
    facilitator: "o voluntário que conduz o encontro",
    facilitatorAction: "Ação do Condutor",
    voice:
      "Maduro, acolhedor e direto, de igual para igual: sem infantilizar, sem sermão e sem jargão evangélico. Usa exemplos de trabalho, família, culpa, recomeço e esperança, reconhecendo que o grupo carrega histórias difíceis. Linguagem simples e respeitosa.",
    storyWords: { min: 650, max: 1000 },
    questions: { min: 6, max: 8 },
    supportMaterials: { min: 3, max: 3 },
    teacherActions: { min: 2, max: 4 },
    lessonDelivery:
      'A lição é uma exposição conversada com três objetos simbólicos (como a bússola, o peso e a planta de Jonas): o condutor os usa em momentos marcados como (Ação do Condutor: …) para tornar a ideia visível, e traz o contexto histórico e cultural necessário. A pergunta final fica "no ar" para o grupo.',
    icebreaker:
      "Uma pergunta honesta sobre a vida adulta (recomeçar, perdoar, cansaço, fugir de um chamado) que cria identificação sem exigir confissão em público, terminando com a apresentação do objeto de apoio e da direção da lição.",
    application:
      "Espelho e esperança: o que a história revela sobre Deus, onde cada um se reconhece nela e qual é o próximo passo concreto. Apresenta Jesus com clareza e convida, sem pressão, a um momento de silêncio e a uma oração voluntária que o condutor conduz em voz alta; ninguém é exposto.",
    storyVisuals:
      "Ilustração respeitosa e sóbria, de proporções realistas, com atmosfera adulta e sem traço infantil, fiel à época e aos lugares bíblicos, sem violência gráfica e sem humor que diminua o texto.",
    recommendedVisualStyle: LessonVisualStyle.ILLUSTRATED,
    verseCards:
      "De uma a nove partes, seguindo o ritmo natural da frase, com a referência em um cartão final.",
    verseCardArt:
      "Tipografia limpa e elegante, forte contraste e paleta sóbria de até três cores, com ornamentos mínimos e discretos, sem desenhos infantis.",
    verseFixation:
      'Uma dinâmica leve em duplas ou grupos pequenos para fixar o versículo (montar o texto em ordem, completar trechos, "passa a palavra", recitar em revezamento, desafio de completar de cabeça), terminando com todos dizendo juntos o versículo e a referência. Ninguém é obrigado a recitar sozinho.',
    game: 'Uma dinâmica de integração e descontração em grupo, de ritmo leve e risada: jogos cooperativos, desafios em duplas ou equipes, estafetas simples, "passa o objeto", adivinhações com mímica em movimento, jogos de memória em grupo e desafios de equilíbrio. A ligação com a lição está no nome e no princípio dito depois.',
    gameForbidden:
      "Qualquer coisa que exponha histórias pessoais, exija contato físico, vergonha ou humilhação; jogos de azar ou aposta; mecânica que seja só conversa ou quiz sentado.",
    adaptations: {
      younger: "JOVENS DE 16 A 25 ANOS",
      older: "ADULTOS E IDOSOS",
    },
    gameMinutes: { min: 10, max: 20 },
    safety:
      "Considerar pessoas com mobilidade reduzida, saúde frágil ou idosas: sempre uma versão sentada ou de baixo esforço; sem contato físico, sem apostas, sem exposição de quem erra; espaço livre e piso seguro.",
  },
};

export function lessonCategoryProfile(
  category?: LessonCategory | null,
): LessonCategoryProfile {
  return LESSON_CATEGORY_PROFILES[category ?? LessonCategory.CHILD];
}
