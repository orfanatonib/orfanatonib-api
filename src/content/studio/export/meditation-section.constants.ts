/**
 * Bloco "Meditando e organizando" do fim de toda lição (modelo das lições SAICA/Pequeno Nazareno): orientação ao
 * voluntário, checklists por setor e objetivos da visita. O versículo e as brincadeiras têm etapa própria e ficam de
 * fora. Texto fixo e neutro quanto ao público (serve a bebês, crianças, adolescentes e adultos).
 */
export const MEDITATION_SECTION_TITLE = "Meditando e organizando";

/** Chamada que fecha a lição, logo abaixo do logo "Foi por você". */
export const AFTER_READING_PRAYER =
  "Após a leitura, ore! Peça para que Deus fale contigo!";
export const HANDS_TO_SERVICE =
  "Agora é hora de pôr as mãos a serviço do Senhor!!!";

export const CHECKLIST_TITLE = "TODOS OS SETORES SÃO IMPORTANTES!";
export const CHECKBOX = "☐";

/** "Lembrando dos outros setores": igual em todos os setores, muda só o nome do setor. */
export const otherSectors = (sector: string): readonly string[] => [
  `Não esqueça que a programação da visita passa por você, mas ${sector} não é o único setor de uma visita! Então esteja atento a tudo em sua volta: isto se chama consciência situacional!`,
  "Pense em uma pessoa do seu ministério para orar, ainda que não se lembre do nome; peça a Deus por aquela pessoa que está em seu coração.",
  "Agora ore pelo seu líder!",
  "Para ajudar na sua programação pessoal, conclua sua meditação com check nas atividades abaixo:",
];

export const THINKING_THE_STEPS = {
  title: "Todos — Pensando os passos",
  paragraphs: [
    "A Bíblia inteira é uma Carta de Amor. Quando estamos apaixonados não conseguimos tirar da cabeça a pessoa amada. Em tudo vemos, pensamos e até falamos daquela pessoa.",
    "Deus é amor! Ele deixou essa carta maravilhosa para nos demonstrar o tamanho do seu amor. Assim, o seu plano de salvação é descrito repetidamente nas Escrituras, de modo que em tudo podemos reconhecer os passos da salvação, uma verdade repetida diversas vezes.",
  ],
} as const;

export const LESSON_SECTOR = {
  title: "Lição",
  paragraphs: [
    "Jesus sempre será o principal alvo da sua lição! Nunca esqueça que o plano de Deus é perfeito. Nada é acaso: você tem o privilégio de anunciar as boas novas e levar a cada pessoa um presente fantástico dado pelo próprio Criador: a salvação!",
    "Sempre conclua a lição com o apelo e uma oração!",
  ],
  othersTitle: "Lembrando dos outros setores:",
  sectorName: "a lição",
  checklist: [
    "Já conheço as músicas da visita. Ainda não sabe quais serão? Peça ao líder!",
    "Já decorei o versículo da visita.",
    "Já separei uma oferta para contribuir com a visita.",
    "Já organizei meu trabalho/estudo para que nada conflite com a visita.",
    "Já organizei com minha equipe os visuais que serão utilizados nesta visita e pedi ajuda para fazer o material.",
  ],
  closing:
    "Se ainda não concluiu algum dos itens acima, corra! Lembre-se de que Jesus é um Deus de ordem!",
} as const;

export const MUSIC_SECTOR = {
  title: "Músicas",
  paragraphs: [
    "Nosso Deus fez sentidos para que possamos experimentar a sua criação de diversas formas, mas algumas pessoas não conseguem compreender plenamente a história somente ouvindo a lição, ou nem querem participar por timidez, então temos mais uma chance de ensinar: cantando!",
  ],
  emphasis:
    "Use cada memória da sua infância, referências da igreja ou mesmo o YouTube para pensar nas músicas que reiterem o objetivo principal da lição e novamente apresentem Deus.",
  afterEmphasis:
    "Caso não esteja tendo ideias, compartilhe com o ministério. Somos irmãos em Cristo!",
  rememberTitle: "Lembre-se:",
  remember: [
    "As músicas nunca poderão ser seculares!",
    "Enquanto as programações ocorrem, nenhum instrumento pode ser afinado, tocado ou “experimentado”; organize-se com antecedência.",
    "Evite levar instrumentos caros ou que possam ser facilmente danificados. Algumas pessoas podem querer “emprestar” instrumentos ou “ver com as mãos”.",
    "Ao elaborar coreografias, lembre-se de que todas as pessoas do ministério devem saber repetir os passos; assegure-se de tê-los ensinado!",
    "Sempre prefira tocar instrumentos, ainda que feitos artesanalmente. O Senhor pode lhe capacitar para tocar e para criar instrumentos.",
  ],
  othersTitle: "Lembrando dos outros setores:",
  sectorName: "a música",
  checklist: [
    "Já compartilhei com toda a equipe as músicas e os passos da coreografia que serão usados nesta visita.",
    "Já li toda a história.",
    "Já decorei o versículo da visita.",
    "Já separei uma oferta para contribuir com a visita.",
    "Já organizei meu trabalho/estudo para que nada conflite com a visita.",
    "Já organizei com minha equipe os instrumentos que serão utilizados nesta visita e pedi ajuda para fazer o material.",
  ],
} as const;

export const MEDITATING = {
  title: "Todos — Meditando",
  objectivesTitle: "Objetivos da visita",
  purpose: "Deus tem propósito! Inclusive contigo.",
  intro:
    "Conclua essa meditação fazendo todo o checklist do seu setor e este abaixo:",
  checklist: [
    "Já organizei todo o meu trabalho e estudos para que nada conflite com a visita.",
    "Dei o meu melhor em toda a programação e em todas as tarefas que me foram confiadas.",
  ],
  prayerItem:
    "Ore por sua família, pela sua saúde e pela saúde de quem mora com você, para que nada possa me impedir de ir à visita e cumprir a missão que Deus lhe confiou.",
} as const;
