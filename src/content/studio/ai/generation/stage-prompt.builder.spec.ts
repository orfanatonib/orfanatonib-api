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
    expect(texts[0]).toContain("NARRATIVA CURTA para bebês");
    expect(texts[1]).toContain("LIÇÃO BÍBLICA para crianças");
    expect(texts[2]).toContain("ESTUDO BÍBLICO para adolescentes");
    expect(texts[3]).toContain("ESTUDO BÍBLICO para adultos");
  });

  it("orçamento de palavras e de perguntas vem do perfil do público", () => {
    const baby = buildStageRequest(
      base({ audience: ContentAudience.BABY }),
    ).instructions.join("\n");
    expect(baby).toContain("60 a 220 palavras");
    expect(baby).toContain("Perguntas de revisão ficam vazias para bebês");
    const adult = buildStageRequest(
      base({ audience: ContentAudience.ADULT }),
    ).instructions.join("\n");
    expect(adult).toContain("900 a 1900 palavras");
    expect(adult).toContain("de 5 a 8 perguntas de revisão");
  });

  it("o esquema de saída é o da etapa e tem os campos internos antes das seções", () => {
    const built = buildStageRequest(
      base({ stageType: ContentStageType.ACTIVITY }),
    );
    expect(built.outputSchema).toBe(
      STAGE_OUTPUT_SCHEMAS[ContentStageType.ACTIVITY],
    );
    expect(
      Object.keys((built.outputSchema as { properties: object }).properties)[0],
    ).toBe("centralMessage");
  });

  it("conteúdo aprovado entra como dado; variantes anteriores são limitadas às 8 mais recentes", () => {
    const built = buildStageRequest(
      base({
        stageType: ContentStageType.ACTIVITY,
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
      [
        ContentStageType.CANONICAL_BASE,
        ContentStageType.LESSON,
        ContentStageType.DISCUSSION,
        ContentStageType.ACTIVITY,
        ContentStageType.VISUAL,
        ContentStageType.FACILITATOR_GUIDANCE,
      ].map((t) => [t, { a: big, b: big, c: big, d: big, e: big }]),
    ) as StageGenerationContext["upstream"];
    const built = buildStageRequest(base({ upstream }));
    const kept = Object.keys(built.input.approvedUpstream as object);
    expect(kept[0]).toBe("CANONICAL_BASE");
    expect(kept.length).toBeLessThan(6);
  });
});
