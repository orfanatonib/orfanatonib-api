import { ContentAudience } from "../../enums/content-audience.enum";
import {
  ContentVisualOrientation,
  ContentVisualStyle,
} from "../../enums/content-visual.enums";
import type { VisualConfig } from "../../dto/visual-config.dto";
import { buildStageRequest } from "./stage-prompt.builder";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { fakeStageContent } from "./fake-stage-content";
import { imageSizeFor, lessonVisualImageSpecs } from "./image-prompts";
import { validateStageOutput } from "./stage-output.validator";
import {
  AUDIENCE_IMAGE_RULES,
  LessonVisualFormat,
} from "./visual-art.constants";
import {
  VISUAL_STYLE_OPTIONS_BY_AUDIENCE,
  VISUAL_STYLES,
} from "./visual-styles.constants";

const config = (over: Partial<VisualConfig> = {}): VisualConfig => ({
  quantity: 5,
  format: LessonVisualFormat.CUTOUT_KIT,
  style: ContentVisualStyle.CUTE_CARTOON,
  orientation: ContentVisualOrientation.LANDSCAPE,
  ...over,
});

const plan = (audience: ContentAudience, cfg: VisualConfig) =>
  fakeStageContent(ContentStageType.LESSON_VISUALS, audience, "T", cfg);

describe("prompts de imagem por categoria", () => {
  it("cada categoria tem regras de imagem próprias e diferentes", () => {
    const rules = Object.values(ContentAudience).map((audience) =>
      AUDIENCE_IMAGE_RULES[audience].join(" "),
    );
    expect(new Set(rules).size).toBe(4);
    expect(AUDIENCE_IMAGE_RULES[ContentAudience.BABY].join(" ")).toContain(
      "no máximo três",
    );
    expect(AUDIENCE_IMAGE_RULES[ContentAudience.TEEN].join(" ")).toContain(
      "nunca cabeça enorme",
    );
    expect(AUDIENCE_IMAGE_RULES[ContentAudience.ADULT].join(" ")).toContain(
      "Nunca estilo infantil",
    );
  });

  it.each(Object.values(ContentAudience))(
    "%s: o pedido de cada imagem leva o desenho, as fichas, as regras da categoria e a regra de folha",
    (audience) => {
      const cfg = config({
        style: VISUAL_STYLE_OPTIONS_BY_AUDIENCE[audience][0],
      });
      const specs = lessonVisualImageSpecs(plan(audience, cfg), cfg, audience);
      expect(specs).toHaveLength(cfg.quantity);
      const text = specs[0].instructions.join("\n");
      expect(text).toContain(VISUAL_STYLES[cfg.style].prompt);
      expect(text).toContain("PERSONAGENS — APARÊNCIA FIXA");
      for (const rule of AUDIENCE_IMAGE_RULES[audience])
        expect(text).toContain(rule);
      expect(text).toContain("LINHA DE CORTE"); // kit
      expect(text).toContain("Nunca coloque palavras");
    },
  );

  it("cenas completas usam a regra de folha A4 (e não a linha de corte)", () => {
    const cfg = config({ format: LessonVisualFormat.STORY_SCENES });
    const specs = lessonVisualImageSpecs(
      plan(ContentAudience.TEEN, cfg),
      cfg,
      ContentAudience.TEEN,
    );
    const text = specs[0].instructions.join("\n");
    expect(text).toContain("FOLHA A4");
    expect(text).not.toContain("LINHA DE CORTE");
  });

  it("o tamanho pedido ao gerador segue a orientação; só os itens pedidos são refeitos", () => {
    expect(imageSizeFor(ContentVisualOrientation.PORTRAIT)).toBe("1024x1536");
    expect(imageSizeFor(ContentVisualOrientation.LANDSCAPE)).toBe("1536x1024");
    const cfg = config({ orientation: ContentVisualOrientation.PORTRAIT });
    const specs = lessonVisualImageSpecs(
      plan(ContentAudience.CHILD, cfg),
      cfg,
      ContentAudience.CHILD,
      ["visual-02"],
    );
    expect(specs.map((spec) => spec.slot)).toEqual(["visual-02"]);
    expect(specs[0].size).toBe("1024x1536");
  });

  it("a orientação extra do admin entra no pedido", () => {
    const cfg = config({ instructions: "deixe o leão menos assustador" });
    const [spec] = lessonVisualImageSpecs(
      plan(ContentAudience.CHILD, cfg),
      cfg,
      ContentAudience.CHILD,
    );
    expect(spec.instructions.join("\n")).toContain(
      "deixe o leão menos assustador",
    );
  });
});

describe("plano dos visuais com as escolhas do admin", () => {
  const request = (audience: ContentAudience, cfg: VisualConfig) =>
    buildStageRequest({
      stageType: ContentStageType.LESSON_VISUALS,
      audience,
      theme: "T",
      biblicalReferences: "R",
      canonicalObjective: "O",
      canonicalNotes: null,
      upstream: {},
      previousVariants: [],
      visualConfig: cfg,
    }).instructions.join("\n");

  it("o prompt manda gerar exatamente a quantidade, o tipo e o desenho escolhidos", () => {
    const text = request(ContentAudience.CHILD, config({ quantity: 7 }));
    expect(text).toContain("exatamente 7 pranchas");
    expect(text).toContain("KIT DE RECORTES");
    expect(text).toContain("Cartoon fofo");
    expect(text).toContain("prancha 7");
  });

  it("bebê: só os elementos centrais, poucos e grandes", () => {
    expect(request(ContentAudience.BABY, config())).toContain(
      "NÃO faça o inventário completo",
    );
  });

  it("o prompt de cada categoria cita o desenho dela", () => {
    const teen = request(
      ContentAudience.TEEN,
      config({
        format: LessonVisualFormat.STORY_SCENES,
        style: ContentVisualStyle.GRAPHIC_NOVEL,
      }),
    );
    expect(teen).toContain("Graphic novel");
    expect(teen).toContain("exatamente 5 cenas");
  });

  describe("validação", () => {
    const run = (
      audience: ContentAudience,
      cfg: VisualConfig,
      patch: (c: Record<string, unknown>) => void = () => undefined,
    ) => {
      const c = plan(audience, cfg);
      patch(c);
      return () =>
        validateStageOutput(
          ContentStageType.LESSON_VISUALS,
          audience,
          c,
          null,
          "T",
          cfg,
        );
    };

    it("aceita exatamente a quantidade pedida e recusa outra", () => {
      expect(run(ContentAudience.CHILD, config({ quantity: 6 }))).not.toThrow();
      expect(
        run(ContentAudience.CHILD, config({ quantity: 6 }), (c) => {
          (c.items as unknown[]).pop();
        }),
      ).toThrow(/pediu exatamente 6/);
    });

    it("kit exige peças por prancha; o bebê tem teto de peças", () => {
      expect(
        run(ContentAudience.CHILD, config(), (c) => {
          (c.items as Array<Record<string, unknown>>)[0].elements = [];
        }),
      ).toThrow(/elements vazio/);
      expect(
        run(ContentAudience.BABY, config(), (c) => {
          const items = c.items as Array<{ elements: unknown[] }>;
          items[0].elements = Array.from(
            { length: 8 },
            () => items[0].elements[0] ?? {},
          );
        }),
      ).toThrow(/máximo 4 por prancha/);
    });

    it("o tipo escolhido manda: cenas pedidas não aceitam categoria de kit", () => {
      const cfg = config({ format: LessonVisualFormat.STORY_SCENES });
      expect(run(ContentAudience.CHILD, cfg)).not.toThrow();
      expect(
        run(ContentAudience.CHILD, cfg, (c) => {
          (c.items as Array<Record<string, unknown>>)[0].category = "OBJECTS";
        }),
      ).toThrow(/SCENE/);
    });
  });
});
