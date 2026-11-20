import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { containsSensitiveContentInstruction } from "../utils/ai-provider-policy.util";
import { validateStructuredContent } from "../utils/structured-content-policy.util";
import { AUDIENCE_PROFILES } from "./audience-profiles.constants";
import { STAGE_OUTPUT_SCHEMAS } from "./stage-output-schemas";
import {
  buildStageRequest,
  StageGenerationContext,
} from "./stage-prompt.builder";

const base = (
  over: Partial<StageGenerationContext> = {},
): StageGenerationContext => ({
  stageType: ContentStageType.LESSON,
  audience: ContentAudience.CHILD,
  theme: "O bom pastor",
  biblicalReferences: "João 10.1-18",
  canonicalObjective: "Mostrar que Jesus cuida de cada pessoa",
  canonicalNotes: null,
  upstream: {},
  previousVariants: [],
  ...over,
});

const ALL = Object.values(ContentAudience).flatMap((audience) =>
  Object.values(ContentStageType).map(
    (stageType) => [audience, stageType] as const,
  ),
);

describe("buildStageRequest", () => {
  it.each(ALL)(
    "%s × %s: prompts e entrada passam na política de segurança do provedor",
    (audience, stageType) => {
      const built = buildStageRequest(base({ audience, stageType }));
      expect(
        containsSensitiveContentInstruction(
          `${built.instructions.join("\n")}\n${JSON.stringify(built.input)}`,
        ),
      ).toBe(false);
      expect(() => validateStructuredContent(built.input)).not.toThrow();
    },
  );

  it.each(Object.values(ContentAudience))(
    "o bloco do público %s define quem conduz, voz e cuidados",
    (audience) => {
      const text = buildStageRequest(base({ audience })).instructions.join(
        "\n",
      );
      const p = AUDIENCE_PROFILES[audience];
      expect(text).toContain(`PÚBLICO: ${p.label} (${p.ageRange})`);
      expect(text).toContain(p.deliveredBy);
      expect(text).toContain(p.safety[0]);
    },
  );

  it("o mesmo tema gera instruções diferentes por público (bebê ≠ criança ≠ adolescente ≠ adulto)", () => {
    const texts = Object.values(ContentAudience).map((audience) =>
      buildStageRequest(base({ audience })).instructions.join("\n"),
    );
    expect(new Set(texts).size).toBe(4);
    expect(texts[0]).toContain("Ação do Voluntário");
    expect(texts[1]).toContain("Ação do Professor");
    expect(texts[2]).toContain("Ação do Líder");
    expect(texts[3]).toContain("Ação do Condutor");
  });

  it("a lição segue o modelo 2026: dinâmica com materiais de apoio e marcações de ação", () => {
    const text = buildStageRequest(base()).instructions.join("\n");
    for (const field of [
      "PERSONAGENS (characters)",
      "MATERIAIS DE APOIO (supportMaterials)",
      "QUEBRA-GELO (icebreaker)",
      "HISTÓRIA BÍBLICA (story)",
      "APLICAÇÃO E APELO (application)",
      "LIÇÃO (reviewQuestions)",
      "VERSÍCULOS (memoryVerse e verseOptions)",
    ])
      expect(text).toContain(field);
    expect(text).toContain("no máximo 15 palavras");
  });

  it("orçamento de palavras, perguntas e materiais vem do perfil do público", () => {
    const baby = buildStageRequest(
      base({ audience: ContentAudience.BABY }),
    ).instructions.join("\n");
    expect(baby).toContain("de 250 a 450 palavras");
    // Bebê não tem perguntas e respostas.
    expect(baby).not.toContain("perguntas com resposta");
    expect(baby).toContain("reviewQuestions como lista vazia");
    const adult = buildStageRequest(
      base({ audience: ContentAudience.ADULT }),
    ).instructions.join("\n");
    expect(adult).toContain("de 900 a 1300 palavras");
    expect(adult).toContain("de 6 a 8 perguntas");
    expect(adult).toContain("3 itens");
  });

  it.each([
    [ContentStageType.VERSE_VISUALS, "verso-01", "referenceCard"],
    [ContentStageType.VERSE_FIXATION, "recitação coletiva", "evaluation"],
    [
      ContentStageType.STANDARD_GAME,
      "PROIBIDO como mecânica principal",
      "compilado-01",
    ],
    [ContentStageType.LESSON_VISUALS, "visual-01", "sourceExcerpt"],
  ])("a etapa %s declara seu contrato", (stageType, a, b) => {
    const text = buildStageRequest(base({ stageType })).instructions.join("\n");
    expect(text).toContain(a);
    expect(text).toContain(b);
  });

  it("a brincadeira de adultos tem versão de baixo esforço; a de bebê não tem competição", () => {
    const adult = buildStageRequest(
      base({
        stageType: ContentStageType.STANDARD_GAME,
        audience: ContentAudience.ADULT,
      }),
    ).instructions.join("\n");
    expect(adult).toContain("versão sentada ou de baixo esforço");
    const baby = buildStageRequest(
      base({
        stageType: ContentStageType.STANDARD_GAME,
        audience: ContentAudience.BABY,
      }),
    ).instructions.join("\n");
    expect(baby).toContain("competição, tempo cronometrado, placar");
  });

  it("o esquema de saída é o da etapa e tem os campos internos antes das seções", () => {
    const built = buildStageRequest(
      base({ stageType: ContentStageType.STANDARD_GAME }),
    );
    expect(built.outputSchema).toBe(
      STAGE_OUTPUT_SCHEMAS[ContentStageType.STANDARD_GAME],
    );
    expect(
      Object.keys((built.outputSchema as { properties: object }).properties)[0],
    ).toBe("centralMessage");
  });

  it("conteúdo aprovado entra como dado; variantes anteriores são limitadas às 8 mais recentes", () => {
    const built = buildStageRequest(
      base({
        stageType: ContentStageType.STANDARD_GAME,
        upstream: { [ContentStageType.LESSON]: { title: "A" } },
        previousVariants: Array.from({ length: 12 }, (_, i) => `v${i}`),
      }),
    );
    expect(
      (built.input.approvedUpstream as Record<string, unknown>).LESSON,
    ).toEqual({ title: "A" });
    expect(built.input.previousVariants).toEqual([
      "v4",
      "v5",
      "v6",
      "v7",
      "v8",
      "v9",
      "v10",
      "v11",
    ]);
  });

  it("personalização do administrador acrescenta, com a ressalva de que não remove segurança", () => {
    const text = buildStageRequest(
      base({ adminPrompt: "Use exemplos de futebol." }),
    ).instructions.join("\n");
    expect(text).toContain("Use exemplos de futebol.");
    expect(text).toContain("nunca remove campos");
  });

  it("conteúdo a montante muito grande é cortado, mantendo as etapas mais antigas", () => {
    const big = { text: "x".repeat(7_000) };
    const upstream = Object.fromEntries(
      Object.values(ContentStageType).map((t) => [
        t,
        { a: big, b: big, c: big, d: big, e: big },
      ]),
    ) as StageGenerationContext["upstream"];
    const built = buildStageRequest(base({ upstream }));
    const kept = Object.keys(built.input.approvedUpstream as object);
    expect(kept[0]).toBe("LESSON");
    expect(kept.length).toBeLessThan(5);
  });

  describe("escolha do versículo da lição", () => {
    const lesson = (audience: ContentAudience) =>
      buildStageRequest(base({ audience })).instructions.join("\n");

    it.each(Object.values(ContentAudience))(
      "%s: o versículo precisa estar alinhado ao título e ao propósito, em NVI exata",
      (audience) => {
        const text = lesson(audience);
        expect(text).toContain("ALINHADO AO TÍTULO E AO PROPÓSITO");
        expect(text).toContain("canonicalObjective");
        expect(text).toContain("centralMessage");
        expect(text).toContain("Nova Versão Internacional (NVI)");
        expect(text).toContain("redação exata");
        expect(text).toContain("nunca reconte o versículo com palavras suas");
        expect(text).toContain("reviewerNotes");
        // as duas opções obedecem às mesmas regras e a 2 é outro aspecto do mesmo propósito
        expect(text).toContain("nunca outro assunto");
      },
    );

    it("bebê e crianças: versículo curto (8 e 15 palavras), simples e rítmico; os mais velhos podem mais", () => {
      const baby = lesson(ContentAudience.BABY);
      const child = lesson(ContentAudience.CHILD);
      expect(baby).toContain("no máximo 8 palavras");
      expect(child).toContain("no máximo 15 palavras");
      for (const text of [baby, child])
        expect(text).toContain("simples e rítmica");
      expect(lesson(ContentAudience.TEEN)).toContain("no máximo 30 palavras");
      expect(lesson(ContentAudience.TEEN)).not.toContain("simples e rítmica");
      expect(lesson(ContentAudience.ADULT)).toContain("no máximo 40 palavras");
    });
  });

  describe("versículo em partes (a, b…) para bebê e crianças", () => {
    const lesson = (audience: ContentAudience) =>
      buildStageRequest(base({ audience })).instructions.join("\n");

    it.each([ContentAudience.BABY, ContentAudience.CHILD])(
      "%s: pode usar só a parte do versículo, indicando a letra na referência",
      (audience) => {
        const text = lesson(audience);
        expect(text).toContain("SÓ A PARTE dele (a, b, c…)");
        expect(text).toContain("Hebreus 9.22b");
        expect(text).toContain("sem reticências (o sistema as coloca)");
        expect(text).toContain(
          "“…e sem derramamento de sangue não há perdão de pecados”",
        );
        expect(text).toContain("redação exata da NVI");
      },
    );

    it.each([ContentAudience.TEEN, ContentAudience.ADULT])(
      "%s: continua com o versículo inteiro",
      (audience) => {
        expect(lesson(audience)).not.toContain("SÓ A PARTE dele");
      },
    );

    it("os visuais e a fixação do versículo usam o trecho como está, sem completar", () => {
      for (const stage of [
        ContentStageType.VERSE_VISUALS,
        ContentStageType.VERSE_FIXATION,
      ])
        expect(
          buildStageRequest(base({ stageType: stage })).instructions.join("\n"),
        ).toContain("só uma PARTE");
    });
  });
});
