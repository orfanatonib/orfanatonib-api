import { LESSON_SHARED_QUALITY_RULES } from "../constants/lesson-quality.constants";
import { createHash } from "node:crypto";
import { LessonStageType } from "../enums/lesson.enums";
import { LESSON_FUN_GAME_LIMITS } from "../constants/ai-provider-settings.constants";

export type LessonTemplateContract = {
  key: string;
  version: string;
  stage: LessonStageType;
  exactStructure: readonly string[];
  rules: readonly string[];
};

const sharedRules = [
  ...LESSON_SHARED_QUALITY_RULES,
  "Escrever em português brasileiro, com fidelidade bíblica e linguagem acolhedora, adequada ao público (categoria) da lição.",
  "Usar a Bíblia NVI como referência e adequar todo o conteúdo ao público e ao contexto de visita a abrigos do Ministério Orfanato NIB.",
  "Não incluir conteúdo sexual, romântico, erotizado ou debates de sexualidade; manter foco exclusivo na passagem bíblica.",
  "Não inventar citações bíblicas. A referência e o texto devem ser coerentes entre si.",
  "Não alterar, omitir, renomear ou reordenar os campos do template.",
  "Não inserir logos na arte. Textos são compostos pelo renderer, exceto nos cartões tipográficos de VERSE_VISUALS, cuja própria imagem deve conter o texto exato exigido pelo contrato.",
] as const;

export const LESSON_TEMPLATES: Record<LessonStageType, LessonTemplateContract> =
  {
    [LessonStageType.LESSON]: {
      key: "orfanato.lesson.canonical",
      version: "1.0.0",
      stage: LessonStageType.LESSON,
      exactStructure: [
        "LIÇÃO E TÍTULO",
        "TEXTO/REFERÊNCIA BÍBLICA",
        "PERSONAGENS",
        "MATERIAIS DE APOIO",
        "QUEBRA-GELO",
        "HISTÓRIA BÍBLICA",
        "APLICAÇÃO E APELO",
        "LIÇÃO (PERGUNTAS E RESPOSTAS)",
        "VERSÍCULOS",
      ],
      rules: [
        ...sharedRules,
        "O produto é um roteiro de visita com dinâmica: materiais de apoio simples que representam ideias da história e marcações no formato (Ação do <condutor>: …) dentro do quebra-gelo e da história.",
        'Campos: characters e supportMaterials são listas de textos "Nome — contexto" e "Objeto — o que representa"; icebreaker e story são textos corridos; applicationAndAppeal termina com a oração voluntária entre aspas; reviewQuestions tem perguntas com resposta; memoryVerse é o versículo principal e verseOptions traz duas opções com foco, sendo a primeira igual a memoryVerse.',
        "Tamanho da história, quantidade de materiais, de marcações de ação e de perguntas seguem o perfil do público informado no prompt editorial da etapa.",
        "Definir primeiro a mensagem central (centralMessage, campo interno) e o versículo que a resume (verseChoice, campo interno); quebra-gelo, história, aplicação, perguntas e versículo servem à mesma mensagem.",
        "A narrativa não pode apresentar sentimentos, intenções ou diálogos não sustentados pelas passagens como fatos bíblicos; ilustrações do cotidiano ficam separadas dos fatos bíblicos pela forma de narrar, sem notas explicativas no texto.",
        "Descrições visuais ficam somente em visualScenes (ids scene-01…), nunca dentro de story. Nenhuma pergunta ou dinâmica exige que alguém exponha a própria história familiar.",
        "Convite e oração são voluntários; a oração de apelo é revisável e nunca é substituída por texto dentro de imagem.",
      ],
    },
    [LessonStageType.LESSON_VISUALS]: {
      key: "orfanato.lesson-visuals.canonical",
      version: "3.0.1",
      stage: LessonStageType.LESSON_VISUALS,
      exactStructure: [
        "INVENTÁRIO DE ELEMENTOS DA LIÇÃO",
        "PRANCHAS POR CATEGORIA",
        "VARIANTES",
        "PERSONAGENS E CONSISTÊNCIA",
        "TEXTO ALTERNATIVO",
      ],
      rules: [
        ...sharedRules,
        "Estes são exclusivamente visuais de apoio para quem conta a história; não são visuais de memorização do versículo.",
        "O produto é um kit de recortes: pranchas de elementos isolados em fundo branco, que o professor recorta e monta. Não gere cenas completas.",
        "Faça o inventário completo da LIÇÃO BÍBLICA: todo personagem, animal, construção, cenário e objeto relevante precisa existir no kit, cada um com storyEvidence literal.",
        "Cada prancha usa id sequencial kit-01, kit-02 e assim por diante, com categoria, itens, layoutPlan, prompt e altText.",
        "Elementos que mudam de estado ou pose na história têm uma variante cada. Legendas são aplicadas depois pelo sistema; a imagem não contém texto.",
        "Estilo de ilustração bíblica infantil, amigável, com cores claras, sem violência gráfica e sem texto na imagem.",
      ],
    },
    [LessonStageType.STANDARD_GAME]: {
      key: "orfanato.standard-game.canonical",
      version: "4.2.0",
      stage: LessonStageType.STANDARD_GAME,
      exactStructure: [
        "NOME DA BRINCADEIRA",
        "OBJETIVO",
        "MECÂNICAS DIVERTIDAS",
        "MATERIAIS",
        "PREPARAÇÃO",
        "COMO BRINCAR/PASSO A PASSO",
        "REGRAS E SEGURANÇA",
        "ADAPTAÇÕES POR IDADE",
        "PRINCÍPIO BÍBLICO",
        "VISUAIS DE APOIO",
      ],
      rules: [
        ...sharedRules,
        "A brincadeira divertida é recreação de verdade, no estilo gincana: mecânica física e de ação (correr, pular, mirar, arremessar, equilibrar, puxar, estourar, buscar), inspirada em clássicos como estoura balão, pescaria, tiro ao alvo, cabo de guerra, pênalti, corrida do saco, ovo na colher e boliche de garrafa.",
        "Equipes, rodadas, placar e vencedor são bem-vindos quando o público comporta; todos comemoram no fim. A ligação com a lição é leve: nome, tema e o princípio bíblico depois de brincar.",
        "Proibido como mecânica principal: desenhar, gestos ou mímica parados, apontar cartazes, quiz, reflexão, encenação ou atividade de mesa.",
        "A brincadeira deve ser segura e exequível; a regra central serve ao grupo todo, com uma simplificação e um desafio extra por idade, conforme o perfil do público.",
        "A entrega é um documento simples explicando a brincadeira e UMA única imagem (id compilado-01) com o compilado de tudo: materiais, preparação do espaço, o passo a passo em painéis na ordem de leitura e o encerramento. A imagem mostra crianças genéricas e alegres fazendo cada ação, em clima de gincana; não criar uma imagem por passo nem personagens ou cenas bíblicas.",
        `Documento curto, de uma página A4: de 3 a ${LESSON_FUN_GAME_LIMITS.maxSteps} passos de uma frase, até ${LESSON_FUN_GAME_LIMITS.maxMaterials} materiais, até ${LESSON_FUN_GAME_LIMITS.maxRules} regras curtas, uma frase por adaptação e por objetivo. Sem repetir informação entre seções.`,
        "Exceção à regra de textos do renderer: o compilado-01 traz o título, as faixas, os passos numerados e o encerramento escritos na própria arte.",
      ],
    },
    [LessonStageType.VERSE_VISUALS]: {
      key: "orfanato.verse-visuals.canonical",
      version: "1.4.1",
      stage: LessonStageType.VERSE_VISUALS,
      exactStructure: [
        "VISUAIS DO VERSÍCULO",
        "VERSÍCULO PRINCIPAL NVI",
        "JUSTIFICATIVA DA QUEBRA SEMÂNTICA",
        "SEQUÊNCIA DE TRECHOS",
        "CARTÃO FINAL DA REFERÊNCIA",
      ],
      rules: [
        ...sharedRules,
        "Usar exatamente o único versículo principal NVI aprovado na lição.",
        "Dividir todo o texto do versículo em trechos curtos, consecutivos e semanticamente completos, sem omitir, repetir, alterar ou reordenar palavras.",
        "Criar uma imagem mnemônica para cada trecho e acrescentar obrigatoriamente uma última imagem dedicada somente à referência bíblica.",
        "A quantidade é determinada pela melhor quebra pedagógica do versículo; o cartão final não contém o texto do versículo.",
        "Cartões tipográficos finais em A4 paisagem, sem borda branca: a própria imagem gerada contém o texto exato, extragrande e arredondado em aproximadamente 90% da área, e só as sobras recebem detalhes minúsculos e variados ligados ao sentido do trecho, em quantidade decidida pelo espaço livre, pelo estilo e pela semântica, somando no máximo 10% da imagem, sem nunca diminuir o texto; fundo e paleta única de no máximo três cores escolhidos a partir do versículo e mantidos em toda a sequência.",
      ],
    },
    [LessonStageType.VERSE_FIXATION]: {
      key: "orfanato.verse-fixation.canonical",
      version: "3.0.0",
      stage: LessonStageType.VERSE_FIXATION,
      exactStructure: [
        "NOME DA BRINCADEIRA",
        "OBJETIVO",
        "MECÂNICAS DIVERTIDAS",
        "MATERIAIS",
        "PREPARAÇÃO",
        "COMO BRINCAR/PASSO A PASSO",
        "REGRAS E SEGURANÇA",
        "ADAPTAÇÕES POR IDADE",
        "COMO AVALIAR",
        "PRINCÍPIO BÍBLICO",
        "VISUAIS DE APOIO",
      ],
      rules: [
        ...sharedRules,
        "Usar exatamente o único versículo principal NVI aprovado na lição.",
        "A fixação divertida é gincana com ação física (correr, buscar, arremessar, estourar, montar) em que cada rodada faz o grupo falar, montarem ou recuperarem o versículo, com repetição progressiva até todos recitarem juntos o versículo completo com a referência.",
        "Equipes, rodadas, tempo e placar são bem-vindos; proibido como mecânica principal desenhar, quiz, repetição sentada ou cartaz parado. Funciona para quem ainda não lê.",
        `Documento curto, de uma página A4: de 3 a ${LESSON_FUN_GAME_LIMITS.maxSteps} passos de uma frase, até ${LESSON_FUN_GAME_LIMITS.maxMaterials} materiais, até ${LESSON_FUN_GAME_LIMITS.maxRules} regras curtas, uma frase por adaptação, por objetivo e por avaliação. Sem repetir informação entre seções.`,
        "A entrega é o documento e UMA única imagem (id compilado-01) com o compilado de tudo: o versículo e a referência em destaque, materiais, preparação, o passo a passo em painéis na ordem de leitura e o encerramento, com pessoas genéricas do público fazendo cada ação; não criar uma imagem por passo nem personagens ou cenas bíblicas.",
        "Exceção à regra de textos do renderer: o compilado-01 traz o título, o versículo, as faixas, os passos numerados e o encerramento escritos na própria arte.",
      ],
    },
    [LessonStageType.MEDITATION_YOUNGER]: {
      key: "clubinho.meditation-younger.canonical",
      version: "2.1.0",
      stage: LessonStageType.MEDITATION_YOUNGER,
      exactStructure: [
        "MEDITAÇÃO PARA CRIANÇAS MENORES",
        "TÍTULO",
        "NOME E DATA",
        "VERSÍCULO PARA DECORAR",
        "ATIVIDADES",
        "FALANDO COM DEUS",
        "PEÇAS IMPRIMÍVEIS",
      ],
      rules: [
        ...sharedRules,
        "Criar exatamente duas atividades complementares para 5 a 8 anos, com mecânicas diferentes entre si e variadas de semana a semana, no estilo das folhas impressas: labirinto simples, labirinto de letras que revela um nome, pintar os pontinhos, cobrir pontilhado, pintar o local ou a cena certa, circular/X em figuras, ligar, ordenar cenas ou múltipla escolha escrita com 3 opções.",
        "A resposta correta de cada atividade representa a mensagem central e o propósito da lição, não um detalhe secundário; pelo menos uma atividade trata diretamente dessa mensagem.",
        "Usar o único versículo principal NVI aprovado, sem paráfrase.",
        "A atividade 1 sempre tem arte; a atividade 2 tem arte, exceto quando for múltipla escolha escrita. Toda atividade que cita figuras, labirinto ou caminho tem sua arte. Ids 1 e 2; conferir a solução e todas as pistas.",
        "A composição final deve permitir duas cópias idênticas da meditação por folha A4, como no padrão manual.",
      ],
    },
    [LessonStageType.MEDITATION_OLDER]: {
      key: "clubinho.meditation-older.canonical",
      version: "2.0.1",
      stage: LessonStageType.MEDITATION_OLDER,
      exactStructure: [
        "MEDITAÇÃO PARA CRIANÇAS MAIORES",
        "TÍTULO",
        "NOME E DATA",
        "VERSÍCULO PARA DECORAR",
        "TEXTO BÍBLICO",
        "ENTENDENDO A LIÇÃO",
        "TRÊS DESAFIOS",
        "GABARITO",
        "FALANDO COM DEUS",
        "PEÇAS IMPRIMÍVEIS",
      ],
      rules: [
        ...sharedRules,
        "Três blocos estruturados: narrativa, compreensão e aplicação concreta, com mecânicas distintas. Subitens e gabaritos completos; sem mínimo artificial de palavras. Sempre três imagens, uma como anexo ou apoio de cada questão, sem repetir texto ou revelar respostas.",
        "Cada desafio precisa ter instrução completa e gabarito determinístico para o professor.",
        "Usar o único versículo principal NVI aprovado, sem paráfrase.",
        "Gerar exatamente três imagens de anexo ou apoio às questões, ids 1, 2 e 3. Permitir letras/números e legendas curtas quando indispensáveis; omitir cabeçalho, instruções e gabarito na imagem.",
      ],
    },
    [LessonStageType.MANUAL_WORK]: {
      key: "clubinho.manual-work.canonical",
      version: "1.1.0",
      stage: LessonStageType.MANUAL_WORK,
      exactStructure: [
        "TRABALHO MANUAL",
        "VERSÍCULO PRINCIPAL",
        "INSTRUÇÃO",
        "DESENHO PARA COLORIR",
        "PADRÃO DE IMPRESSÃO",
      ],
      rules: [
        ...sharedRules,
        "Criar uma única imagem para a criança pintar, diretamente relacionada à lição e ao único versículo principal NVI aprovado. Nunca entregar desenho já colorido.",
        "A arte deve ser line art preto e branco puro, fundo branco, contornos nítidos e grossos, sem cinza, cor, sombra, textura fotográfica ou áreas excessivamente fechadas.",
        "Não inserir letras ou versículo na imagem; o renderer aplica texto e referência com fidelidade.",
        "Preparar duas cópias idênticas do trabalho manual em uma folha A4 retrato, com margens seguras para impressão e recorte.",
      ],
    },
  };

export function serializeTemplate(contract: LessonTemplateContract): string {
  return JSON.stringify(contract);
}

export function templateChecksum(contract: LessonTemplateContract): string {
  return createHash("sha256").update(serializeTemplate(contract)).digest("hex");
}

/**
 * Story visuals of a weekly lesson as complete scenes (the alternative to the
 * cutout kit): one full illustration per literal excerpt of the story.
 */
export const REGULAR_SCENE_VISUALS_TEMPLATE: LessonTemplateContract = {
  key: "orfanato.lesson-visuals.scenes",
  version: "1.0.0",
  stage: LessonStageType.LESSON_VISUALS,
  exactStructure: [
    "CENAS COMPLETAS DA HISTÓRIA, NA ORDEM",
    "TRECHO LITERAL DE CADA CENA",
    "PERSONAGENS E CONSISTÊNCIA",
    "TEXTO ALTERNATIVO",
  ],
  rules: [
    ...sharedRules,
    "Estes são exclusivamente visuais de apoio para quem conta a história; não são visuais de memorização do versículo.",
    "O produto são cenas completas: cada imagem ilustra um trecho da LIÇÃO BÍBLICA com ambiente, personagens e a ação principal, em enquadramento claro para o professor mostrar à distância. Não gere pranchas de recorte.",
    "Divida toda a LIÇÃO BÍBLICA em exatamente visualConfig.quantity trechos literais, contínuos, consecutivos e sem sobreposição; cada asset (visual-01, visual-02 e assim por diante) traz em sourceExcerpt o seu trecho exato.",
    "Ilustre somente o que o trecho narra. Orientações ao condutor entre parênteses e perguntas ao grupo não são cena.",
    "Personagens mantêm o mesmo rosto, roupa e traço em todas as cenas; a primeira cena estabelece a identidade visual.",
    "Sem texto, legenda, balão ou número dentro da imagem; nada violento, assustador ou sexualizado.",
  ],
};
