import { LessonCategory, LessonStageType } from "../enums/lesson.enums";
import {
  lessonCategoryProfile,
  LessonCategoryProfile,
  SHELTER_VISIT_CONTEXT,
} from "./lesson-category-profiles.constants";
import { LESSON_STAGE_BASE_PROMPTS as LEGACY_STAGE_PROMPTS } from "./lesson-base-prompts.constants";

/** Rótulos das seções do modelo LIÇÕES NOVAS 2026, na ordem do documento. */
export const LESSON_MODEL_SECTIONS = [
  "PERSONAGENS",
  "MATERIAIS DE APOIO",
  "QUEBRA-GELO",
  "HISTÓRIA BÍBLICA",
  "APLICAÇÃO E APELO",
  "LIÇÃO (PERGUNTAS E RESPOSTAS)",
  "VERSÍCULOS",
] as const;

const range = (value: { min: number; max: number }): string =>
  value.min === value.max ? String(value.min) : `${value.min} a ${value.max}`;

function lessonPrompt(p: LessonCategoryProfile): string {
  return `Produza somente a LIÇÃO BÍBLICA no modelo LIÇÕES NOVAS 2026 do Ministério Orfanato NIB, para ${p.audience}. A lição é um ROTEIRO PARA ${p.facilitator.toUpperCase()} MINISTRAR DURANTE A VISITA, com uma dinâmica de apoio que torna a história visível.

${SHELTER_VISIT_CONTEXT}

PÚBLICO E TOM
- ${p.voice}
- Entregue uma aula completa, pronta para ministrar em uma única visita, com narrativa desenvolvida, diálogos fundamentados na passagem, transições e ensino aplicado. Não entregue resumo, sinopse, artigo ou roteiro telegráfico.

COMO A LIÇÃO É ENTREGUE (A DINÂMICA)
- ${p.lessonDelivery}
- Cada material de apoio representa uma ideia da história. A dinâmica fica DENTRO do texto, em marcações no formato (${p.facilitatorAction}: …), curtas e práticas, usando verbos de ação (pegue, mostre, aponte, encha, esconda, vire, faça uma pausa). Use de ${range(p.teacherActions)} marcações distribuídas entre o quebra-gelo, a história e, se couber, a aplicação.
- As marcações dizem o que quem conduz FAZ, nunca como narrar nem o que evitar. Nenhuma instrução sobre estas regras aparece no material.

ESTRUTURA OBRIGATÓRIA (CAMPOS DO JSON, NESTA ORDEM)
1. PERSONAGENS (characters): lista com um item por personagem relevante, no formato "Nome — contexto em uma frase". Só quem aparece na história.
2. MATERIAIS DE APOIO (supportMaterials): ${range(p.supportMaterials)} itens no formato "Objeto simples e barato — o que ele representa na história". Objetos fáceis de levar na mochila e seguros; cada um é usado em alguma marcação de ação.
3. QUEBRA-GELO (icebreaker): ${p.icebreaker} Inclui ao menos uma marcação de ação e termina ligando ao tema da história.
4. HISTÓRIA BÍBLICA (story): de ${p.storyWords.min} a ${p.storyWords.max} palavras, falada diretamente ao público, com contexto, o problema, a ação de Deus ou de Jesus, o desfecho e uma frase final com o ensino. Inclua as marcações de ação nos momentos em que um objeto de apoio entra. Quando houver duas ou mais histórias distintas, use subtítulos "### Nome (Referência)" em linhas próprias. Sem Markdown além disso.
5. APLICAÇÃO E APELO (applicationAndAppeal): ${p.application} Termine com a oração entre aspas, introduzida por "Vamos orar?" ou equivalente natural ao público.
6. LIÇÃO (reviewQuestions): ${range(p.questions)} perguntas com resposta, cobrindo os fatos, o ensino e o objeto de apoio. Toda resposta tem apoio no que foi dito na lição.
7. VERSÍCULOS (memoryVerse e verseOptions): memoryVerse é o versículo NVI principal, curto e memorizável (preferencialmente até 20 palavras, nunca muito acima de 30), que resume a mensagem central da lição inteira e não um detalhe secundário. verseOptions traz duas opções no formato "Opção 1 (foco em …): “texto” (Referência)" e "Opção 2 (foco em …): …", sendo a opção 1 igual ao memoryVerse.

MENSAGEM CENTRAL
- Defina primeiro, em centralMessage (campo interno), o ensino principal da passagem sobre Deus, Jesus e a salvação: quem Deus é, o que Jesus fez e como responder a Ele. Atitudes práticas entram na aplicação como fruto desse ensino, nunca como condição para ser aceito por Deus.
- Se o administrador definir o propósito da lição, ele é a mensagem central.

FIDELIDADE E FORMATO
- Preserve o tema, as referências informadas e os acontecimentos essenciais. Não invente fatos, falas, pensamentos ou costumes como se fossem bíblicos; exemplos do cotidiano ficam claramente separados dos fatos da passagem.
- Use a NVI nas citações literais. Se não puder garantir a redação exata, reconte sem aspas e registre a dúvida em reviewerNotes, campo interno que nunca aparece no material.
- Trate sofrimento, morte e violência com brevidade e reverência, sem detalhes gráficos. Não represente Deus Pai fisicamente.
- Texto simples em todos os campos, sem Markdown (exceto os subtítulos ### da história), sem listas com hífen dentro da narrativa.
- Preencha visualScenes separadamente (ids scene-01, scene-02…), só com acontecimentos presentes em story; nunca copie essas descrições para story.
- Não copie nomes de voluntários, escalas, dados pessoais, propaganda ou política do acervo. Os modelos do acervo definem o formato, não o conteúdo.

REVISÃO ANTES DE ENTREGAR
Reescreva o que falhar: história dentro da faixa de palavras; marcações de ação usando todos os materiais; centralMessage, versículo, aplicação e a última pergunta apontando para o mesmo ensino; nenhuma emoção ou diálogo sem apoio na passagem; oração voluntária; nenhum trecho que exponha a vida pessoal de quem está sendo ministrado.`;
}

function lessonVisualsPrompt(p: LessonCategoryProfile, kit: boolean): string {
  const product = kit
    ? `Produza somente os VISUAIS DA LIÇÃO no formato KIT DE RECORTES: pranchas de elementos isolados em fundo branco, que ${p.facilitator} recorta ou mostra enquanto conta a história. Não gere cenas completas.`
    : `Produza somente os VISUAIS DA LIÇÃO como CENAS COMPLETAS: uma ilustração por trecho literal da história, com ambiente, personagens e a ação principal, em enquadramento claro para mostrar ao grupo. Não gere pranchas de recorte.`;
  const rules = kit
    ? `- Faça primeiro o inventário da LIÇÃO aprovada: personagens, animais, construções, cenário, céu e natureza e objetos. Todo elemento relevante precisa existir no kit, com storyEvidence literal; elementos que mudam de estado ou pose têm uma variante cada (variantOf).
- Respeite a quantidade de pranchas e a orientação de visualConfig. Ids kit-01, kit-02… com categoria, título, itens, layoutPlan, prompt e altText. Preencha coverageChecklist com as seis categorias (COVERED ou NOT_APPLICABLE com justificativa).
- Cada elemento tem linha de corte: contorno externo preto, grosso e contínuo, elementos grandes, separados e longe das bordas; nunca encolha um elemento para caber, reorganize as pranchas.`
    : `- Respeite a quantidade de cenas e a orientação de visualConfig. Ids visual-01, visual-02… Divida toda a história em trechos literais, contínuos, consecutivos e sem sobreposição (sourceExcerpt), cortando nos momentos em que muda o lugar, o personagem ou a ação principal.
- Ilustre somente o que o trecho narra; marcações de ação do condutor e perguntas ao grupo não são cena.`;
  return `${product} Estes visuais apoiam quem conta a história e são diferentes dos visuais do versículo, que pertencem a outra etapa.

PÚBLICO E DIREÇÃO DE ARTE
- Público: ${p.audience}. ${p.storyVisuals}
- A lição aprovada é a única fonte narrativa: use só seus personagens, ambientes, ações e objetos; não preencha lacunas criativamente nem altere fatos, falas ou ênfase teológica. Os objetos de apoio da dinâmica NÃO fazem parte da cena, a menos que a própria passagem os cite.

${SHELTER_VISIT_CONTEXT.split("\n")[0]}
- Pessoas representadas são sempre personagens da passagem bíblica, nunca retratos de pessoas reais e nunca crianças ou adultos "em situação de abrigo".

CONFIGURAÇÃO ESCOLHIDA PELO ADMINISTRADOR
${rules}

CONTINUIDADE E ARTE
- Crie antes uma ficha consistente por personagem (faixa etária, pele, cabelo, roupa, cores, acessórios, expressão) e preserve-a em todas as imagens. Preserve época e ambiente bíblicos; evite objetos modernos e símbolos anacrônicos.
- Siga o ESTILO DE DESENHO escolhido pelo administrador (sugestão para este público: ${p.recommendedVisualStyle}).
- Nunca coloque palavras, versículos, legendas, balões, números, molduras ou logotipos dentro da imagem.
- Não represente Deus Pai fisicamente. Sem sexualização, romance, violência gráfica ou elementos assustadores desnecessários; cenas sensíveis com reverência.
- Não crie cartões, palavras ou símbolos mnemônicos do versículo nesta etapa.`;
}

function verseVisualsPrompt(p: LessonCategoryProfile): string {
  return `Produza somente os VISUAIS DO VERSÍCULO PRINCIPAL, como uma sequência de cartões tipográficos imprimíveis, para ${p.audience}. Esta etapa não é brincadeira nem a fixação divertida.

FONTE FECHADA
- Use exclusivamente o versículo principal aprovado na lição: texto integral, referência e versão NVI, sem parafrasear, acrescentar ou omitir palavras.
- Analise a estrutura do versículo e divida-o em unidades de sentido. ${p.verseCards} Os trechos, lidos em ordem, reconstroem exatamente o texto integral.
- Acrescente sempre uma última imagem exclusiva para a referência completa; nela displayText e a imagem contêm somente a referência.
- Informe a justificativa pedagógica da quebra e, em cada item, a ordem, o trecho exato, a finalidade, o conceito visual e o texto alternativo.

ARTE E IMPRESSÃO
- ${p.verseCardArt}
- O texto exato é o protagonista e ocupa cerca de 90% da imagem; os 10% restantes são pequenos detalhes ligados ao sentido do trecho, só nas sobras, sem tocar nas letras. Nunca diminua o texto para caber detalhes.
- Fundo escolhido a partir do sentido do versículo, indo até as bordas, sem moldura ou contorno branco. Uma única paleta de no máximo três cores para toda a sequência; texto, contornos e sombras usam só essas cores.
- Sem pessoas, personagens, cenas ou cenas bíblicas. Dentro da imagem, somente o trecho exato ou a referência exata, sem nenhuma outra letra, número ou logotipo.`;
}

function funDocument(
  p: LessonCategoryProfile,
  kind: "GAME" | "FIXATION",
): string {
  const fixation = kind === "FIXATION";
  const title = fixation
    ? "FIXAÇÃO DIVERTIDA DO VERSÍCULO"
    : "BRINCADEIRA DIVERTIDA";
  const what = fixation ? p.verseFixation : p.game;
  const sections = [
    "NOME: até 5 palavras, com cara de jogo.",
    "OBJETIVO: uma frase.",
    "MECÂNICAS DIVERTIDAS: 2 ou 3 itens de até 6 palavras.",
    "MATERIAIS: até 6 itens curtos, com quantidade, baratos e fáceis de levar.",
    "PREPARAÇÃO: no máximo 2 frases.",
    `COMO BRINCAR: de 3 a 6 passos, cada um uma frase de comando${fixation ? ", terminando com a recitação coletiva" : ""}.`,
    `REGRAS E SEGURANÇA: até 4 regras curtas, incluindo a duração (${p.gameMinutes.min} a ${p.gameMinutes.max} minutos) e como se vence ou se encerra.`,
    `ADAPTAÇÕES POR IDADE: uma frase para ${p.adaptations.younger} e uma para ${p.adaptations.older}.`,
    ...(fixation ? ["COMO AVALIAR: uma frase, sem constrangimento."] : []),
    fixation
      ? "PRINCÍPIO BÍBLICO: até 2 frases curtas sobre o sentido do versículo."
      : "PRINCÍPIO BÍBLICO: até 2 frases curtas para dizer depois de brincar.",
    `VISUAL DE APOIO: UMA única imagem-resumo (id compilado-01) que compila toda a ${fixation ? "fixação" : "brincadeira"} — ${fixation ? "o versículo e a referência em destaque, " : ""}materiais, preparação do espaço, o passo a passo em painéis na ordem de leitura e o encerramento. Mostre pessoas genéricas do público (${p.audience}) fazendo cada ação, sem rosto identificável. Não crie uma imagem por passo, nem cenas bíblicas, nem decoração.`,
  ].map((line, i) => `${i + 1}. ${line}`);
  return `Produza somente a ${title} para ${p.audience}, para ${p.facilitator} conduzir na visita.${fixation ? " Esta etapa é diferente dos Visuais do Versículo já produzidos." : ""}

${SHELTER_VISIT_CONTEXT}

O QUE É
- ${what}
${fixation ? "- Use o único versículo principal aprovado na lição, preservando texto, referência e versão NVI.\n" : ""}- Regra central explicável em um minuto, todos participando quase o tempo todo; quem sai de uma rodada volta na seguinte ou vira juiz ou torcida. Todos comemoram juntos no fim.
- Planeje para o grupo todo, com uma simplificação e um desafio extra por idade.

ESTRUTURA OBRIGATÓRIA — DOCUMENTO CURTO, QUE CABE EM UMA PÁGINA A4
${sections.join("\n")}

REGRAS
- PROIBIDO como mecânica principal: ${p.gameForbidden}
- Segurança: ${p.safety}
- A vitória nunca é apresentada como sinal de maior fé ou favor de Deus, e ninguém é exposto ou constrangido.
- A imagem-resumo é um infográfico vertical (retrato, A4), colorido, com o título, as faixas MATERIAIS, PREPARAÇÃO e COMO BRINCAR${fixation ? ", o versículo e a referência exatamente como aprovados" : ""}, os passos numerados e o encerramento escritos em português correto.`;
}

export const ORFANATO_STAGES: readonly LessonStageType[] = [
  LessonStageType.LESSON,
  LessonStageType.LESSON_VISUALS,
  LessonStageType.VERSE_VISUALS,
  LessonStageType.VERSE_FIXATION,
  LessonStageType.STANDARD_GAME,
];

/** Prompt base imutável de uma etapa para um público; o administrador só acrescenta. */
export function lessonStageBasePrompt(
  stage: LessonStageType,
  category?: LessonCategory | null,
  cutoutKit = true,
): string {
  const profile = lessonCategoryProfile(category);
  switch (stage) {
    case LessonStageType.LESSON:
      return lessonPrompt(profile);
    case LessonStageType.LESSON_VISUALS:
      return lessonVisualsPrompt(profile, cutoutKit);
    case LessonStageType.VERSE_VISUALS:
      return verseVisualsPrompt(profile);
    case LessonStageType.VERSE_FIXATION:
      return funDocument(profile, "FIXATION");
    case LessonStageType.STANDARD_GAME:
      return funDocument(profile, "GAME");
    default:
      return LEGACY_STAGE_PROMPTS[stage];
  }
}
