import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { plannedImageSlots } from "../../services/get-stage-images.service";
import { buildStageRequest } from "./stage-prompt.builder";
import { validateStageOutput } from "./stage-output.validator";
import { fakeStageContent } from "./fake-stage-content";
import { funSummaryImageSpecs, verseCardImageSpecs } from "./image-prompts";
import {
  VERSE_CARD_LOOK_AUDIENCE_RULES,
  findVerseCardLook,
} from "./verse-card-looks.constants";
import {
  AUDIENCE_FUN_IMAGE_RULES,
  COMPILED_SLOT,
  AUDIENCE_VERSE_CARD_LOOK,
  AUDIENCE_VERSE_CARD_RULES,
  AUDIENCE_VISUAL_ART,
  VERSE_REFERENCE_SLOT,
} from "./visual-art.constants";

const plan = (audience: ContentAudience) =>
  fakeStageContent(ContentStageType.VERSE_VISUALS, audience, "T");

describe("cartões do versículo como imagens", () => {
  it.each(Object.values(ContentAudience))(
    "%s: um pedido por trecho e um para a referência, com o texto exato e a regra de folha",
    (audience) => {
      const content = plan(audience);
      const specs = verseCardImageSpecs(content, audience);
      const cards = content.cards as Array<{ id: string; text: string }>;
      expect(specs.map((spec) => spec.slot)).toEqual([
        ...cards.map((card) => card.id),
        VERSE_REFERENCE_SLOT,
      ]);
      const first = specs[0].instructions.join("\n");
      expect(first).toContain(`"${cards[0].text}"`);
      expect(first).toContain("copie caractere por caractere");
      expect(first).toContain("FOLHA A4 SEM BORDA");
      expect(first).toContain("PALETA ÚNICA");
      // Adolescentes e Adultos: a direção registrada em lookId; as demais categorias: o visual único.
      const variant = findVerseCardLook(audience, content.lookId);
      expect(first).toContain(
        variant ? variant.style : AUDIENCE_VISUAL_ART[audience].verseCardStyle,
      );
      for (const rule of variant
        ? [VERSE_CARD_LOOK_AUDIENCE_RULES[audience] ?? ""]
        : AUDIENCE_VERSE_CARD_RULES[audience])
        expect(first).toContain(rule);
      expect(specs.every((spec) => spec.size === "1536x1024")).toBe(true);
    },
  );

  it("o cartão da referência só leva a referência; os de trecho, só o trecho", () => {
    const content = plan(ContentAudience.CHILD);
    const specs = verseCardImageSpecs(content, ContentAudience.CHILD);
    const reference = specs[specs.length - 1].instructions.join("\n");
    expect(reference).toContain('"João 3.16"');
    expect(reference).toContain("SOMENTE a referência bíblica");
    expect(specs[0].instructions.join("\n")).toContain("SOMENTE este trecho");
  });

  it("a tipografia muda por categoria", () => {
    const rules = Object.values(ContentAudience).map((a) =>
      AUDIENCE_VERSE_CARD_RULES[a].join(" "),
    );
    expect(new Set(rules).size).toBe(4);
    expect(AUDIENCE_VERSE_CARD_RULES[ContentAudience.BABY].join(" ")).toContain(
      "ENORMES",
    );
    expect(AUDIENCE_VERSE_CARD_RULES[ContentAudience.TEEN].join(" ")).toContain(
      "sem serifa em negrito",
    );
    expect(
      AUDIENCE_VERSE_CARD_RULES[ContentAudience.ADULT].join(" "),
    ).toContain("sóbria");
  });

  it("refazer um cartão gera só ele", () => {
    const specs = verseCardImageSpecs(
      plan(ContentAudience.TEEN),
      ContentAudience.TEEN,
      ["verso-02"],
    );
    expect(specs.map((spec) => spec.slot)).toEqual(["verso-02"]);
  });

  it("os itens do plano que viram imagem: cartões + referência (versículo) ou pranchas (visuais)", () => {
    const verse = plannedImageSlots(
      ContentStageType.VERSE_VISUALS,
      plan(ContentAudience.CHILD),
    );
    expect(verse[verse.length - 1]).toMatchObject({
      slot: VERSE_REFERENCE_SLOT,
    });
    expect(verse.length).toBeGreaterThanOrEqual(2);
    const lesson = plannedImageSlots(ContentStageType.LESSON_VISUALS, {
      items: [{ id: "visual-01", title: "Personagens" }],
    });
    expect(lesson).toEqual([{ slot: "visual-01", title: "Personagens" }]);
    expect(plannedImageSlots(ContentStageType.VERSE_VISUALS, {})).toEqual([]);
  });

  it.each(Object.values(ContentAudience))(
    "%s: o pedido manda o texto ocupar ~90%% da folha A4 paisagem, com ilustrações pequenas nos 10%% restantes e texto em destaque",
    (audience) => {
      const [spec] = verseCardImageSpecs(plan(audience), audience);
      const text = spec.instructions.join("\n");
      expect(text).toContain("A4 em PAISAGEM");
      expect(text).toContain("cerca de 90% de TODA a área");
      expect(text).toContain("10% restantes são PEQUENAS ILUSTRAÇÕES");
      expect(text).toContain("destaque máximo");
      const look =
        findVerseCardLook(audience, plan(audience).lookId) ??
        AUDIENCE_VERSE_CARD_LOOK[audience];
      expect(text).toContain(look.lettering);
      expect(text).toContain(look.background);
      expect(text).toContain(look.illustrations);
    },
  );

  it("letras, fundo e ilustrações são diferentes em cada categoria", () => {
    for (const key of ["lettering", "background", "illustrations"] as const)
      expect(
        new Set(
          Object.values(ContentAudience).map(
            (a) => AUDIENCE_VERSE_CARD_LOOK[a][key],
          ),
        ).size,
      ).toBe(4);
    expect(AUDIENCE_VERSE_CARD_LOOK[ContentAudience.BABY].lettering).toContain(
      "balão",
    );
    expect(AUDIENCE_VERSE_CARD_LOOK[ContentAudience.CHILD].lettering).toContain(
      "adesivo",
    );
    expect(AUDIENCE_VERSE_CARD_LOOK[ContentAudience.TEEN].lettering).toContain(
      "pôster",
    );
    expect(AUDIENCE_VERSE_CARD_LOOK[ContentAudience.ADULT].lettering).toContain(
      "folha de ouro",
    );
  });

  it("as ilustrações do cartão (concept) entram no pedido só como os 10% das sobras", () => {
    const content = plan(ContentAudience.CHILD);
    (content.cards as Array<{ concept: string }>)[0].concept =
      "ouvido, nota musical, estrela";
    const text = verseCardImageSpecs(
      content,
      ContentAudience.CHILD,
    )[0].instructions.join("\n");
    expect(text).toContain("ouvido, nota musical, estrela");
    expect(text).toContain("só nos 10% das sobras");
  });

  it("adolescentes e adultos: paleta contida e sóbria; bebê e crianças: cores vivas", () => {
    const teen = verseCardImageSpecs(
      plan(ContentAudience.TEEN),
      ContentAudience.TEEN,
    )[0].instructions.join("\n");
    const adult = verseCardImageSpecs(
      plan(ContentAudience.ADULT),
      ContentAudience.ADULT,
    )[0].instructions.join("\n");
    // Em qualquer direção (clara ou escura) a paleta é contida: poucas cores nomeadas e contraste forte exigido.
    for (const text of [teen, adult]) {
      expect(text).toContain("CONTRASTE: o texto tem contraste FORTE");
      expect(text).toContain("PALETA ÚNICA");
    }
    for (const [audience, text] of [
      [ContentAudience.TEEN, teen],
      [ContentAudience.ADULT, adult],
    ] as const) {
      const look = findVerseCardLook(audience, plan(audience).lookId)!;
      expect(text).toContain(look.colors);
    }
    expect(
      verseCardImageSpecs(
        plan(ContentAudience.CHILD),
        ContentAudience.CHILD,
      )[0].instructions.join("\n"),
    ).toContain("Cores vivas");
    expect(
      verseCardImageSpecs(
        plan(ContentAudience.BABY),
        ContentAudience.BABY,
      )[0].instructions.join("\n"),
    ).toContain("Cores doces");
  });

  it.each(Object.values(ContentAudience))(
    "%s: o pedido de cada cartão exige letras grossas, nunca finas",
    (audience) => {
      const text = verseCardImageSpecs(
        plan(audience),
        audience,
      )[0].instructions.join("\n");
      expect(text).toContain("sempre GROSSAS e fortes");
      expect(text).toContain("nunca fontes finas");
    },
  );

  it.each(Object.values(ContentAudience))(
    "%s: o pedido exige contraste forte entre o texto e o fundo, em toda a área atrás das letras",
    (audience) => {
      const text = verseCardImageSpecs(
        plan(audience),
        audience,
      )[0].instructions.join("\n");
      expect(text).toContain("contraste FORTE e imediato");
      expect(text).toContain(
        "nunca letras de tom médio sobre fundo de tom médio",
      );
      expect(text).toContain(
        "Nenhuma textura, luz, degradê claro ou ilustração pode ficar atrás das letras",
      );
    },
  );

  it("adolescentes e adultos: fundo sempre escuro e uniforme atrás do texto claro (diferença enorme de luminosidade)", () => {
    for (const audience of [ContentAudience.TEEN, ContentAudience.ADULT]) {
      const look = AUDIENCE_VERSE_CARD_LOOK[audience];
      expect(look.background).toContain(
        "SEMPRE escuro e uniforme atrás das letras",
      );
      expect(look.colors).toMatch(/ALTÍSSIMO|enorme/);
    }
    const plan1 = buildStageRequest({
      stageType: ContentStageType.VERSE_VISUALS,
      audience: ContentAudience.ADULT,
      theme: "T",
      biblicalReferences: "R",
      canonicalObjective: "O",
      canonicalNotes: null,
      upstream: {},
      previousVariants: [],
    }).instructions.join("\n");
    expect(plan1).toContain("contraste FORTE e imediato");
  });

  it("adolescentes e adultos: letras de traço grosso mesmo em serifa", () => {
    expect(AUDIENCE_VERSE_CARD_LOOK[ContentAudience.ADULT].lettering).toContain(
      "GROSSO",
    );
    expect(AUDIENCE_VERSE_CARD_LOOK[ContentAudience.TEEN].lettering).toContain(
      "nunca fina",
    );
  });

  describe("quebra do versículo em cartões", () => {
    const request = (audience: ContentAudience) =>
      buildStageRequest({
        stageType: ContentStageType.VERSE_VISUALS,
        audience,
        theme: "T",
        biblicalReferences: "R",
        canonicalObjective: "O",
        canonicalNotes: null,
        upstream: {},
        previousVariants: [],
      }).instructions.join("\n");

    it("o prompt manda dividir em MAIS cartões quando o versículo é grande, só em unidades de sentido completas", () => {
      for (const audience of [ContentAudience.TEEN, ContentAudience.ADULT]) {
        const text = request(audience);
        expect(text).toContain("QUANTAS PALAVRAS POR CARTÃO");
        expect(text).toContain("divida em MAIS cartões");
        expect(text).toContain("unidades de sentido COMPLETAS");
        expect(text).toContain("nunca corte no meio de uma expressão");
        expect(text).toContain("Entre 2 e 6 cartões");
        expect(text).toContain("sempre GROSSAS e fortes");
      }
      expect(request(ContentAudience.TEEN)).toContain("de 4 a 9 palavras");
      expect(request(ContentAudience.ADULT)).toContain("de 4 a 10 palavras");
    });

    const run = (
      audience: ContentAudience,
      verseText: string,
      cardTexts: string[],
    ) => {
      const c = plan(audience);
      c.verse = { text: verseText, reference: "R 1.1" };
      (c.referenceCard as Record<string, unknown>).text = "R 1.1";
      c.cards = cardTexts.map((text, i) => ({
        id: `verso-${String(i + 1).padStart(2, "0")}`,
        text,
        concept: "estrela",
        imagePrompt: "x",
        altText: "a",
      }));
      return () =>
        validateStageOutput(ContentStageType.VERSE_VISUALS, audience, c, {
          text: verseText,
          reference: "R 1.1",
        });
    };

    it("recusa cartão grande demais (divida mais) e cartão-fragmento sem sentido (junte)", () => {
      const verse =
        "Pois Deus enviou o seu Filho ao mundo para que este fosse salvo por meio dele sempre";
      expect(run(ContentAudience.TEEN, verse, [verse, "x"])).toThrow(
        /divida em mais cartões|abaixo/,
      );
      const long =
        "Pois Deus enviou o seu Filho ao mundo para que este fosse salvo";
      expect(
        run(ContentAudience.TEEN, long, [
          long.split(" ").slice(0, 11).join(" "),
          long.split(" ").slice(11).join(" "),
        ]),
      ).toThrow(/divida em mais cartões/);
      expect(
        run(
          ContentAudience.ADULT,
          "Pois Deus enviou o seu Filho ao mundo para que este fosse salvo",
          [
            "Pois Deus enviou",
            "o seu Filho ao mundo",
            "para que este",
            "fosse",
            "salvo",
          ],
        ),
      ).toThrow(/junte com o trecho vizinho/);
    });

    it("aceita a quebra em unidades de sentido completas", () => {
      expect(
        run(
          ContentAudience.TEEN,
          "Pois Deus enviou o seu Filho ao mundo, não para condenar o mundo, mas para que este fosse salvo por meio dele.",
          [
            "Pois Deus enviou o seu Filho ao mundo,",
            "não para condenar o mundo,",
            "mas para que este fosse salvo por meio dele.",
          ],
        ),
      ).not.toThrow();
    });
  });

  it("margem de impressão em todos os cartões; a referência comprida vai em duas linhas", () => {
    for (const audience of Object.values(ContentAudience)) {
      const specs = verseCardImageSpecs(plan(audience), audience);
      for (const spec of specs)
        expect(spec.instructions.join("\n")).toContain("MARGEM DE IMPRESSÃO");
      expect(specs[0].instructions.join("\n")).not.toContain(
        "CARTÃO DA REFERÊNCIA",
      );
      const reference = specs[specs.length - 1].instructions.join("\n");
      expect(reference).toContain("CARTÃO DA REFERÊNCIA");
      expect(reference).toContain("DUAS linhas");
      expect(reference).toContain("7%");
    }
  });

  it("o fragmento final de poucas palavras é recusado em adolescentes e adultos (junte ao trecho anterior)", () => {
    const verse =
      "Pois Deus enviou o seu Filho ao mundo, não para condenar o mundo, mas para que este fosse salvo por meio dele.";
    const c = plan(ContentAudience.TEEN);
    c.verse = { text: verse, reference: "R 1.1" };
    (c.referenceCard as Record<string, unknown>).text = "R 1.1";
    c.cards = [
      "Pois Deus enviou o seu Filho ao mundo,",
      "não para condenar o mundo,",
      "mas para que este fosse salvo",
      "por meio dele.",
    ].map((text, i) => ({
      id: `verso-0${i + 1}`,
      text,
      concept: "x",
      imagePrompt: "x",
      altText: "a",
    }));
    expect(() =>
      validateStageOutput(
        ContentStageType.VERSE_VISUALS,
        ContentAudience.TEEN,
        c,
        { text: verse, reference: "R 1.1" },
      ),
    ).toThrow(/junte com o trecho vizinho/);
  });

  describe("imagem compilada (infográfico) da fixação e da brincadeira", () => {
    const fun = (stage: ContentStageType, audience: ContentAudience) =>
      fakeStageContent(stage, audience, "T");

    it.each(Object.values(ContentAudience))(
      "%s: (fixação antiga, sem peças) um infográfico vertical com título, versículo exato, MATERIAIS, PREPARAÇÃO, passos numerados e quadro final",
      (audience) => {
        const content = fun(ContentStageType.VERSE_FIXATION, audience);
        delete content.pieces;
        const [spec] = funSummaryImageSpecs(
          ContentStageType.VERSE_FIXATION,
          content,
          audience,
        );
        expect(spec.slot).toBe(COMPILED_SLOT);
        expect(spec.size).toBe("1024x1536"); // retrato
        const text = spec.instructions.join("\n");
        expect(text).toContain(
          "INFOGRÁFICO VERTICAL (RETRATO, FOLHA A4 PARA IMPRIMIR)",
        );
        expect(text).toContain("FAIXA DO VERSÍCULO");
        const verse = content.verse as { text: string; reference: string };
        expect(text).toContain(`"${verse.text}"`);
        expect(text).toContain(`"${verse.reference}"`);
        expect(text).toContain(
          'faixas "MATERIAIS", "PREPARAÇÃO" e "COMO BRINCAR"',
        );
        const steps = content.steps as string[];
        expect(text).toContain(`EXATAMENTE ${steps.length} paradas numeradas`);
        expect(text).toContain(`"${String(content.closingPhrase)}"`);
        expect(text).toContain("português do Brasil");
        expect(text).toContain("o número fica só no círculo");
        expect(text).toContain("Sem personagens bíblicos");
        for (const rule of AUDIENCE_FUN_IMAGE_RULES[audience])
          expect(text).toContain(rule);
      },
    );

    it("a brincadeira não tem faixa do versículo; cada categoria mostra pessoas diferentes", () => {
      const game = funSummaryImageSpecs(
        ContentStageType.STANDARD_GAME,
        fun(ContentStageType.STANDARD_GAME, ContentAudience.CHILD),
        ContentAudience.CHILD,
      )[0].instructions.join("\n");
      expect(game).not.toContain("FAIXA DO VERSÍCULO");
      expect(game).toContain("UMA ÚNICA BRINCADEIRA");
      const rules = Object.values(ContentAudience).map((a) =>
        AUDIENCE_FUN_IMAGE_RULES[a].join(" "),
      );
      expect(new Set(rules).size).toBe(4);
      expect(
        AUDIENCE_FUN_IMAGE_RULES[ContentAudience.BABY].join(" "),
      ).toContain("SOMENTE MULHERES");
      expect(
        AUDIENCE_FUN_IMAGE_RULES[ContentAudience.TEEN].join(" "),
      ).toContain("nada infantil");
      expect(
        AUDIENCE_FUN_IMAGE_RULES[ContentAudience.ADULT].join(" "),
      ).toContain("esforço físico mínimo");
    });

    it("brincadeira das crianças: duas imagens (compilado-01 e compilado-02), cada uma com a idade da sua faixa e o espaço pequeno", () => {
      const content = fun(
        ContentStageType.STANDARD_GAME,
        ContentAudience.CHILD,
      );
      const specs = funSummaryImageSpecs(
        ContentStageType.STANDARD_GAME,
        content,
        ContentAudience.CHILD,
      );
      expect(specs.map((spec) => spec.slot)).toEqual([
        "compilado-01",
        "compilado-02",
      ]);
      const first = specs[0].instructions.join("\n");
      const second = specs[1].instructions.join("\n");
      expect(first).toContain("crianças de 3 a 8 anos");
      expect(second).toContain("crianças de 9 a 11 anos");
      expect(second).toContain("menos infantil");
      expect(first).toContain("ESPAÇO PEQUENO");
      expect(first).toContain(
        "nunca um campo, quadra, pátio ou percurso grande",
      );
      const extra = (content.extraGames as Array<{ name: string }>)[0];
      expect(second).toContain(`título "${extra.name}"`);
      // refazer só a segunda
      expect(
        funSummaryImageSpecs(
          ContentStageType.STANDARD_GAME,
          content,
          ContentAudience.CHILD,
          ["compilado-02"],
        ).map((spec) => spec.slot),
      ).toEqual(["compilado-02"]);
    });

    it.each([
      ContentAudience.BABY,
      ContentAudience.TEEN,
      ContentAudience.ADULT,
    ])("%s: uma só imagem de brincadeira", (audience) => {
      const specs = funSummaryImageSpecs(
        ContentStageType.STANDARD_GAME,
        fun(ContentStageType.STANDARD_GAME, audience),
        audience,
      );
      expect(specs.map((spec) => spec.slot)).toEqual(["compilado-01"]);
    });

    it("slots planejados: duas imagens para a brincadeira das crianças (com a faixa no título) e uma para as demais", () => {
      const child = plannedImageSlots(
        ContentStageType.STANDARD_GAME,
        fun(ContentStageType.STANDARD_GAME, ContentAudience.CHILD),
      );
      expect(child.map((item) => item.slot)).toEqual([
        "compilado-01",
        "compilado-02",
      ]);
      expect(child[0].title).toContain("3 a 8 anos");
      expect(child[1].title).toContain("9 a 11 anos");
      expect(
        plannedImageSlots(
          ContentStageType.STANDARD_GAME,
          fun(ContentStageType.STANDARD_GAME, ContentAudience.TEEN),
        ).map((item) => item.slot),
      ).toEqual(["compilado-01"]);
      expect(
        plannedImageSlots(
          ContentStageType.VERSE_FIXATION,
          fun(ContentStageType.VERSE_FIXATION, ContentAudience.CHILD),
        ).map((item) => item.slot),
      ).toEqual(["compilado-01", "peca-01", "peca-02", "peca-referencia"]);
    });

    it("refazer: só a imagem compilada, e só se for pedida", () => {
      const content = fun(
        ContentStageType.VERSE_FIXATION,
        ContentAudience.TEEN,
      );
      expect(
        funSummaryImageSpecs(
          ContentStageType.VERSE_FIXATION,
          content,
          ContentAudience.TEEN,
          [COMPILED_SLOT],
        ),
      ).toHaveLength(1);
      expect(
        funSummaryImageSpecs(
          ContentStageType.VERSE_FIXATION,
          content,
          ContentAudience.TEEN,
          ["outra"],
        ),
      ).toHaveLength(0);
    });
  });

  describe("fixação e brincadeira: validação de aprendizado e segurança", () => {
    const run = (
      stage: ContentStageType,
      audience: ContentAudience,
      patch: (c: Record<string, unknown>) => void,
    ) => {
      const c = fakeStageContent(stage, audience, "T");
      patch(c);
      return () =>
        validateStageOutput(stage, audience, c, {
          text: "Porque Deus tanto amou o mundo.",
          reference: "João 3.16",
        });
    };

    it("um título curto por passo e a frase do quadro final são obrigatórios", () => {
      const F = ContentStageType.VERSE_FIXATION;
      expect(
        run(F, ContentAudience.CHILD, (c) => {
          c.stepTitles = ["só um"];
        }),
      ).toThrow(/stepTitles/);
      expect(
        run(F, ContentAudience.CHILD, (c) => {
          (c.stepTitles as string[])[0] =
            "um título bem longo demais para a imagem";
        }),
      ).toThrow(/mais de 5 palavras/);
      expect(
        run(F, ContentAudience.CHILD, (c) => {
          c.closingPhrase = "";
        }),
      ).toThrow(/closingPhrase/);
    });

    it("fixação: o versículo aprovado precisa aparecer escrito nos passos", () => {
      const F = ContentStageType.VERSE_FIXATION;
      expect(run(F, ContentAudience.TEEN, () => undefined)).not.toThrow();
      expect(
        run(F, ContentAudience.TEEN, (c) => {
          c.steps = (c.steps as string[]).map(
            (_, i) => `Passo ${i + 1} sem o texto.`,
          );
        }),
      ).toThrow(/versículo aprovado precisa aparecer escrito/);
    });

    it.each([ContentStageType.VERSE_FIXATION, ContentStageType.STANDARD_GAME])(
      "%s: recusa passos e materiais com risco (venda, tesoura, fogo, empurrar)",
      (stage) => {
        for (const bad of [
          // Venda nos olhos: liberada só na fixação de crianças e adolescentes.
          ...(stage === ContentStageType.STANDARD_GAME
            ? ["Vende os olhos de quem busca."]
            : []),
          "Corte com tesoura.",
          "Acendam uma vela.",
          "Empurre o colega.",
        ])
          expect(
            run(stage, ContentAudience.CHILD, (c) => {
              (c.steps as string[])[1] = bad;
            }),
          ).toThrow(/risco ou exposição/);
        expect(
          run(stage, ContentAudience.CHILD, (c) => {
            c.materials = ["Faca de plástico"];
          }),
        ).toThrow(/materials/);
      },
    );

    it("não confunde o verbo faça/façam com a faca (cedilha), mas recusa faca e punição", () => {
      for (const ok of [
        "Faça o gesto com o bebê.",
        "Façam palmas e cantem.",
        "Faça uma pausa e sorria.",
      ])
        expect(
          run(ContentStageType.STANDARD_GAME, ContentAudience.BABY, (c) => {
            (c.steps as string[])[0] = ok;
          }),
        ).not.toThrow();
      for (const bad of ["Corte com a faca.", "Dê uma punição a quem errar."])
        expect(
          run(ContentStageType.STANDARD_GAME, ContentAudience.TEEN, (c) => {
            (c.steps as string[])[0] = bad;
          }),
        ).toThrow(/risco ou exposição/);
    });

    it("as regras de segurança podem citar o que é proibido (não são passos)", () => {
      expect(
        run(ContentStageType.STANDARD_GAME, ContentAudience.CHILD, (c) => {
          c.safetyRules = [
            "Sem empurrões nem venda nos olhos.",
            "Sinal de parar: apito.",
          ];
        }),
      ).not.toThrow();
    });

    it("bebê: nada de bexiga, correria, placar ou objeto que caiba na boca", () => {
      for (const bad of [
        "Estourem as bexigas.",
        "Corram até a manta.",
        "Marquem o placar.",
        "Passem a moeda.",
      ])
        expect(
          run(ContentStageType.STANDARD_GAME, ContentAudience.BABY, (c) => {
            (c.steps as string[])[0] = bad;
          }),
        ).toThrow(/não serve para bebês/);
      // as demais categorias podem usar balão (no lugar, sem correr)
      expect(
        run(ContentStageType.STANDARD_GAME, ContentAudience.CHILD, (c) => {
          (c.steps as string[])[0] = "Estourem a bexiga sem sair do lugar.";
        }),
      ).not.toThrow();
    });

    describe("brincadeira: espaço pequeno e uma brincadeira por faixa etária", () => {
      const G = ContentStageType.STANDARD_GAME;

      it("recusa correr, percurso, pista, circuito, estafeta e quadra (espaço grande)", () => {
        for (const bad of [
          "Corram até a parede.",
          "Montem um percurso no pátio.",
          "Façam um circuito pela quadra.",
          "Revezamento em fila.",
        ])
          expect(
            run(G, ContentAudience.TEEN, (c) => {
              (c.steps as string[])[0] = bad;
            }),
          ).toThrow(/pede espaço grande/);
        expect(
          run(G, ContentAudience.TEEN, (c) => {
            c.spaceNeeded = "";
          }),
        ).toThrow(/spaceNeeded/);
      });

      it("crianças: exatamente duas brincadeiras (3 a 8 e 9 a 11 anos), diferentes entre si e cada uma validada", () => {
        expect(run(G, ContentAudience.CHILD, () => undefined)).not.toThrow();
        expect(
          run(G, ContentAudience.CHILD, (c) => {
            c.extraGames = [];
          }),
        ).toThrow(/exatamente uma brincadeira/);
        expect(
          run(G, ContentAudience.CHILD, (c) => {
            (c.extraGames as Array<Record<string, unknown>>)[0].name = c.name;
          }),
        ).toThrow(/devem ser diferentes/);
        expect(
          run(G, ContentAudience.CHILD, (c) => {
            (c.extraGames as Array<{ steps: string[] }>)[0].steps[0] =
              "Corram até a linha.";
          }),
        ).toThrow(/extraGames\[0\]\.steps.*espaço grande/);
      });

      it.each([
        ContentAudience.BABY,
        ContentAudience.TEEN,
        ContentAudience.ADULT,
      ])("%s: uma brincadeira só (extraGames vazio)", (audience) => {
        expect(run(G, audience, () => undefined)).not.toThrow();
        expect(
          run(G, audience, (c) => {
            c.extraGames = fakeStageContent(G, ContentAudience.CHILD, "T")
              .extraGames as unknown[];
          }),
        ).toThrow(/lista vazia/);
      });
    });
  });
});
