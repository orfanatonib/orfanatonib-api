import { verseWithEllipsis } from "./stage-document.builder";
import { ContentStageType } from "../enums/content-stage-type.enum";
import {
  STAGE_DOCUMENT_TITLES,
  buildStageDocument,
} from "./stage-document.builder";
import type { TiptapNode } from "./tiptap.types";

const texts = (node: TiptapNode): string[] => [
  ...(node.text ? [node.text] : []),
  ...(node.content ?? []).flatMap(texts),
];
const allText = (type: ContentStageType, content: unknown) =>
  texts(buildStageDocument(type, content)).join("\n");
const headings = (type: ContentStageType, content: unknown) =>
  (buildStageDocument(type, content).content ?? [])
    .filter((node) => node.type === "heading")
    .map((node) => texts(node).join(""));

describe("buildStageDocument", () => {
  it("todo tipo de etapa tem rótulo e conteúdo vazio gera documento vazio (sem quebrar)", () => {
    for (const type of Object.values(ContentStageType)) {
      expect(STAGE_DOCUMENT_TITLES[type]).toBeTruthy();
      expect(buildStageDocument(type, {})).toEqual({
        type: "doc",
        content: [],
      });
      expect(buildStageDocument(type, null).content).toEqual([]);
    }
  });

  it("lição: título, versículo, blocos da história e perguntas com resposta", () => {
    const content = {
      title: "Deus cuida de nós",
      biblicalReference: "Salmos 23",
      memoryVerse: { text: "O Senhor é o meu pastor", reference: "Sl 23:1" },
      story: [{ heading: "O pastor", body: "Davi cuidava das ovelhas." }],
      reviewQuestions: [{ question: "Quem cuida de nós?", answer: "Deus" }],
    };
    expect(headings(ContentStageType.LESSON, content)).toEqual(
      expect.arrayContaining([
        "Deus cuida de nós",
        "Versículos",
        "História",
        "O pastor",
        "Lição",
      ]),
    );
    const text = allText(ContentStageType.LESSON, content);
    expect(text).toContain("O Senhor é o meu pastor (Sl 23:1)");
    expect(text).toContain("Davi cuidava das ovelhas.");
    expect(text).toContain("Quem cuida de nós?");
    expect(text).toContain("Deus");
  });

  it("brincadeira: duração, materiais e como brincar numerado", () => {
    const doc = buildStageDocument(ContentStageType.STANDARD_GAME, {
      name: "Pastor e ovelhas",
      durationMinutes: 15,
      materials: ["bolas"],
      steps: ["Formem uma roda", "Cantem"],
      funMechanics: ["Corrida em equipes"],
      visualSummary: "Imagem-resumo.",
    });
    expect(doc.content.some((node) => node.type === "orderedList")).toBe(true);
    const text = texts(doc as TiptapNode).join(" ");
    expect(text).toContain("15 minutos");
    expect(text).toContain("Como brincar");
    // os campos técnicos da imagem não aparecem no documento (a imagem compilada é outra peça)
    expect(text).not.toContain("IMAGEM-RESUMO");
    expect(text).not.toContain("Imagem-resumo.");
  });

  it("fixação do versículo: traz o versículo e como avaliar", () => {
    const text = allText(ContentStageType.VERSE_FIXATION, {
      name: "Corrida do versículo",
      verse: { text: "Porque Deus amou.", reference: "João 3.16" },
      evaluation: "Cada equipe recita sem ajuda.",
    });
    expect(text).toContain("Porque Deus amou. (João 3.16)");
    expect(text).toContain("Como avaliar");
  });

  it("fixação: tabela de dados amarela, passos com título, regras como caixa de checklist e adaptações em tabela", () => {
    const doc = buildStageDocument(ContentStageType.VERSE_FIXATION, {
      name: "Eco do versículo",
      objective: "Fixar o versículo",
      durationMinutes: 12,
      funMechanics: ["Eco que some", "Palavras escondidas"],
      verse: {
        text: "Tudo posso naquele que me fortalece.",
        reference: "Filipenses 4.13",
      },
      materials: ["6 cartões de papel"],
      preparation: "Espalhe os cartões no chão.",
      steps: ["Todos dizem o versículo.", "Escondam um cartão."],
      stepTitles: ["Todos dizem", "Esconde-esconde"],
      safetyRules: ["Espaço livre.", "Sinal de parar: palma."],
      ageAdaptations: ["MENORES: use gestos", "MAIORES: sem cartões"],
      evaluation: "Cada equipe recita.",
    });
    const tables = doc.content.filter((node) => node.type === "table");
    // dados + checklist de segurança + adaptações
    expect(tables).toHaveLength(3);
    const info = JSON.stringify(tables[0]);
    expect(info).toContain("Versículo");
    expect(info).toContain(
      "Tudo posso naquele que me fortalece. (Filipenses 4.13)",
    );
    expect(info).toContain("12 minutos");
    expect(info).toContain("Eco que some · Palavras escondidas");
    expect(JSON.stringify(doc)).toContain(
      "Todos dizem. Todos dizem o versículo.",
    );
    expect(JSON.stringify(tables[1])).toContain("☐ Espaço livre.");
    expect(JSON.stringify(tables[2])).toContain("MENORES");
  });

  it("visual do versículo: cartões na ordem e cartão da referência", () => {
    const text = allText(ContentStageType.VERSE_VISUALS, {
      title: "Cartões",
      verse: { text: "Porque Deus amou.", reference: "João 3.16" },
      cards: [
        { id: "verso-01", text: "Porque Deus", concept: "corações" },
        { id: "verso-02", text: "amou.", concept: "" },
      ],
      referenceCard: { text: "João 3.16" },
    });
    expect(text).toContain("Cartão 1");
    expect(text).toContain("Porque Deus");
    expect(text).toContain("Cartão da referência");
  });

  it("lição no modelo 2026: personagens, materiais, quebra-gelo e opções de versículo", () => {
    const text = allText(ContentStageType.LESSON, {
      characters: ["Jesus — O Filho de Deus."],
      supportMaterials: ["Jarra — a água comum."],
      icebreaker: "Quem já foi a uma festa?",
      story: [{ heading: "Caná", body: "Houve uma festa." }],
      application: "Entregue a Jesus.",
      verseOptions: ["Opção 1 (foco em amor): “x” (João 3.16)"],
    });
    // Títulos de seção no estilo das lições impressas do ministério (SAICA/Pequeno Nazareno).
    for (const label of [
      "Personagens",
      "Materiais de apoio",
      "Quebra-gelo",
      "História",
      "Aplicação e apelo",
      "Versículos",
    ])
      expect(text).toContain(label);
  });

  it("visuais da lição: itens numerados com texto alternativo", () => {
    const text = allText(ContentStageType.LESSON_VISUALS, {
      title: "Visuais",
      items: [
        {
          id: "visual-01",
          title: "Pastor",
          description: "Um pastor",
          altText: "Pastor com ovelha",
        },
      ],
    });
    expect(text).toContain("1. Pastor");
    expect(text).toContain("Pastor com ovelha");
  });

  it("ignora campos vazios e de tipo errado em vez de quebrar", () => {
    expect(() =>
      buildStageDocument(ContentStageType.STANDARD_GAME, {
        name: 5,
        steps: "x",
        materials: [1, null, "ok"],
      }),
    ).not.toThrow();
    expect(
      allText(ContentStageType.STANDARD_GAME, { materials: ["ok", "  "] }),
    ).toContain("ok");
  });

  it("lição: tabela de dados (Referência/Personagens/Locais) e tabelas amarelas de personagens e materiais", () => {
    const doc = buildStageDocument(ContentStageType.LESSON, {
      title: "Sansão",
      biblicalReference: "Juízes 13 a 16",
      locations: ["Israel", "Gaza"],
      characters: ["Sansão — juiz de Israel", "Dalila — mulher de Soreque"],
      supportMaterials: ["Tira de papel — o cabelo"],
      story: [
        {
          heading: "A promessa",
          body: "Primeiro parágrafo.\n\nSegundo parágrafo.",
        },
      ],
    });
    const tables = doc.content.filter((node) => node.type === "table");
    // dados + personagens + materiais (+ caixas de checklist do fecho "Meditando e organizando")
    expect(tables.length).toBeGreaterThanOrEqual(3);
    const info = JSON.stringify(tables[0]);
    expect(info).toContain("Referência");
    expect(info).toContain("Locais");
    expect(info).toContain("Israel, Gaza");
    // primeira coluna é cabeçalho (amarelo) na tabela de dados; primeira linha nas demais
    expect(JSON.stringify(tables[0])).toContain("tableHeader");
    expect(JSON.stringify(tables[1])).toContain("Seu contexto");
    expect(JSON.stringify(tables[2])).toContain("O que representa");
    // linha em branco vira novo parágrafo
    expect(
      doc.content.filter((node) => node.type === "paragraph").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("lição: falas em itálico e marcações de ação em negrito", () => {
    const doc = buildStageDocument(ContentStageType.LESSON, {
      title: "T",
      story: [
        {
          heading: "H",
          body: "Deus disse: “Vá a Nínive”. (Ação do Professor: mostre o barco.) Fim.",
        },
      ],
    });
    const json = JSON.stringify(doc);
    expect(json).toContain(
      '"text":"“Vá a Nínive”","marks":[{"type":"italic"}]',
    );
    expect(json).toContain(
      '"text":"(Ação do Professor: mostre o barco.)","marks":[{"type":"bold"}]',
    );
  });

  it("lição de bebê: sem perguntas e respostas, não aparece a seção Lição", () => {
    const text = allText(ContentStageType.LESSON, {
      title: "T",
      story: [{ heading: "H", body: "B" }],
      reviewQuestions: [],
    });
    const doc = buildStageDocument(ContentStageType.LESSON, {
      title: "T",
      story: [{ heading: "H", body: "B" }],
      reviewQuestions: [],
    });
    const h2 = doc.content
      .filter((node) => node.type === "heading")
      .filter((node) => (node.attrs as { level?: number }).level === 2)
      .map((node) => JSON.stringify(node.content));
    expect(h2.some((value) => value.includes('"Lição"'))).toBe(false);
    expect(text).toContain("Meditando"); // o fecho existe em toda lição
  });

  it("lição: o fecho começa em página nova, com o logo Foi por você, a chamada à oração e as faixas coloridas", () => {
    const doc = buildStageDocument(ContentStageType.LESSON, {
      title: "T",
      visitObjectives: "Mostrar que com Deus podemos vencer o mal.",
      story: [{ heading: "H", body: "B" }],
    });
    const types = doc.content.map((node) => node.type);
    const at = types.indexOf("pageBreak");
    expect(at).toBeGreaterThan(0);
    // logo logo depois da quebra de página, seguido das duas frases e da faixa
    expect(types[at + 1]).toBe("brandLogo");
    const json = JSON.stringify(doc.content.slice(at, at + 6));
    expect(json).toContain(
      "Após a leitura, ore! Peça para que Deus fale contigo!",
    );
    expect(json).toContain(
      "Agora é hora de pôr as mãos a serviço do Senhor!!!",
    );
    expect(types.filter((type) => type === "colorBars")).toHaveLength(2);
    // blocos de versículo e brincadeira não entram na meditação
    const text = JSON.stringify(doc);
    expect(text).toContain("Objetivos da visita");
    expect(text).toContain("Mostrar que com Deus podemos vencer o mal.");
    expect(text).not.toContain("BRINCADEIRAS");
  });

  it("versículo em partes: 'b' começa com reticências, 'a' termina com elas, e inteiro fica como está", () => {
    expect(
      verseWithEllipsis(
        "e sem derramamento de sangue não há perdão de pecados",
        "Hebreus 9.22b",
      ),
    ).toBe("…e sem derramamento de sangue não há perdão de pecados");
    expect(verseWithEllipsis("Tudo o que fazem", "Colossenses 3.23a")).toBe(
      "Tudo o que fazem…",
    );
    expect(verseWithEllipsis("Deus é amor", "1 João 4.8")).toBe("Deus é amor");
    const text = JSON.stringify(
      buildStageDocument(ContentStageType.LESSON, {
        title: "T",
        story: [{ heading: "H", body: "B" }],
        memoryVerse: {
          text: "e sem derramamento de sangue não há perdão de pecados",
          reference: "Hebreus 9.22b",
        },
      }),
    );
    expect(text).toContain(
      "…e sem derramamento de sangue não há perdão de pecados (Hebreus 9.22b)",
    );
  });

  it("brincadeira das crianças: um documento com as duas brincadeiras (3 a 8 e 9 a 11 anos), cada uma em sua página", () => {
    const game = (name: string) => ({
      name,
      objective: "Brincar junto",
      durationMinutes: 10,
      spaceNeeded: "Uma mesa",
      materials: ["6 copos"],
      steps: ["Empilhem os copos."],
      stepTitles: ["Empilhar"],
      safetyRules: ["Sem empurrar."],
      ageAdaptations: ["A: simplifique", "B: desafie"],
      biblicalConnection: "Deus cuida.",
    });
    const doc = buildStageDocument(ContentStageType.STANDARD_GAME, {
      ...game("Torre Maluca"),
      extraGames: [game("Duelo de Copos")],
    });
    const text = texts(doc as TiptapNode).join(" ");
    expect(text).toContain("Torre Maluca");
    expect(text).toContain("Duelo de Copos");
    expect(text).toContain("Crianças de 3 a 8 anos");
    expect(text).toContain("Crianças de 9 a 11 anos");
    expect(text).toContain("Uma mesa"); // linha Espaço
    // a segunda brincadeira começa em página nova
    const types = doc.content.map((node) => node.type);
    expect(types.filter((type) => type === "pageBreak")).toHaveLength(1);
    // uma só brincadeira (outras categorias): sem quebra de página nem faixa etária
    const single = buildStageDocument(ContentStageType.STANDARD_GAME, {
      ...game("Só Uma"),
      extraGames: [],
    });
    expect(single.content.some((node) => node.type === "pageBreak")).toBe(
      false,
    );
    expect(texts(single as TiptapNode).join(" ")).not.toContain("Faixa etária");
  });

  it("adaptações sem dois-pontos: a faixa etária vai na primeira coluna", () => {
    const doc = buildStageDocument(ContentStageType.STANDARD_GAME, {
      name: "Pinos",
      ageAdaptations: [
        "Para 3 a 5 anos, use pinos maiores e ajuda do adulto.",
        "6 a 8 anos: tentem uma meta de pontos.",
      ],
    });
    const json = JSON.stringify(doc);
    expect(json).toContain("3 a 5 anos");
    expect(json).toContain("Use pinos maiores e ajuda do adulto.");
    expect(json).toContain("6 a 8 anos");
    expect(json).not.toContain('"Adaptação"');
  });
});
