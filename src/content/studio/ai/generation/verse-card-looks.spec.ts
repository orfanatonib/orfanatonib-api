import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { fakeStageContent } from "./fake-stage-content";
import { verseCardImageSpecs } from "./image-prompts";
import { buildStageRequest } from "./stage-prompt.builder";
import { validateStageOutput } from "./stage-output.validator";
import {
  VERSE_CARD_LOOK_VARIANTS,
  assignVerseCardLook,
  findVerseCardLook,
  verseCardLookIds,
} from "./verse-card-looks.constants";

const WITH_VARIANTS = [ContentAudience.TEEN, ContentAudience.ADULT] as const;

const request = (
  audience: ContentAudience,
  theme: string,
  previous: string[] = [],
) =>
  buildStageRequest({
    stageType: ContentStageType.VERSE_VISUALS,
    audience,
    theme,
    biblicalReferences: "João 3.16",
    canonicalObjective: "O",
    canonicalNotes: null,
    upstream: {},
    previousVariants: previous,
  }).instructions.join("\n");

describe("direções visuais dos cartões do versículo (Adolescentes e Adultos)", () => {
  it.each(WITH_VARIANTS)(
    "%s: há várias direções, todas completas, com letras grossas, e fundo claro E escuro",
    (audience) => {
      const variants = VERSE_CARD_LOOK_VARIANTS[audience]!;
      expect(variants.length).toBeGreaterThanOrEqual(6);
      expect(new Set(variants.map((item) => item.id)).size).toBe(
        variants.length,
      );
      expect(new Set(variants.map((item) => item.composition)).size).toBe(
        variants.length,
      );
      for (const variant of variants) {
        for (const key of [
          "name",
          "style",
          "lettering",
          "background",
          "illustrations",
          "colors",
          "composition",
        ] as const)
          expect(variant[key].length).toBeGreaterThan(key === "name" ? 5 : 20);
        // Letras grossas e nada infantil em qualquer direção.
        expect(variant.lettering).toMatch(/negrit|GROSSO|bold|black|heavy/i);
        expect(variant.lettering).not.toMatch(/\b(light|hairline|fina)\b/i);
        expect(`${variant.style} ${variant.lettering}`).not.toMatch(
          /infantil|cartoon|fofo/i,
        );
      }
      const light = variants.filter((item) =>
        /\bCLARO\b|claro e uniforme|muito claro|branco-gelo|papel/i.test(
          item.background,
        ),
      );
      const dark = variants.filter((item) =>
        /escuro|quase preto|azul-noite|verde-musgo|concreto/i.test(
          item.background,
        ),
      );
      expect(light.length).toBeGreaterThanOrEqual(2);
      expect(dark.length).toBeGreaterThanOrEqual(2);
    },
  );

  it("Bebê e Crianças continuam com o visual único (sem direções)", () => {
    expect(verseCardLookIds(ContentAudience.BABY)).toEqual([]);
    expect(verseCardLookIds(ContentAudience.CHILD)).toEqual([]);
    expect(assignVerseCardLook(ContentAudience.BABY, "x", 0)).toBeNull();
  });

  it("a atribuição é estável para o mesmo material e muda a cada regeneração (nunca repete a anterior)", () => {
    for (const audience of WITH_VARIANTS) {
      const first = assignVerseCardLook(audience, "Tema|João 3.16", 0)!;
      expect(assignVerseCardLook(audience, "Tema|João 3.16", 0)!.id).toBe(
        first.id,
      );
      const ids = [0, 1, 2, 3, 4, 5].map(
        (regen) => assignVerseCardLook(audience, "Tema|João 3.16", regen)!.id,
      );
      expect(new Set(ids).size).toBe(
        VERSE_CARD_LOOK_VARIANTS[audience]!.length,
      );
      for (let index = 1; index < ids.length; index += 1)
        expect(ids[index]).not.toBe(ids[index - 1]);
    }
  });

  it("materiais diferentes recebem direções diferentes (não sai sempre a mesma)", () => {
    for (const audience of WITH_VARIANTS) {
      const used = new Set(
        Array.from(
          { length: 24 },
          (_, index) =>
            assignVerseCardLook(audience, `Tema ${index}|João 3.16`, 0)!.id,
        ),
      );
      expect(used.size).toBeGreaterThanOrEqual(4);
    }
  });

  it.each(WITH_VARIANTS)(
    "%s: o prompt de geração traz a direção atribuída (id, composição) e manda copiar em lookId",
    (audience) => {
      const assigned = assignVerseCardLook(audience, "Tema A|João 3.16", 0)!;
      const text = request(audience, "Tema A");
      expect(text).toContain(`lookId = ${assigned.id}`);
      expect(text).toContain(assigned.composition);
      expect(text).toContain(assigned.lettering);
      // Regenerar muda a direção.
      const again = assignVerseCardLook(audience, "Tema A|João 3.16", 1)!;
      expect(request(audience, "Tema A", ["v1"])).toContain(
        `lookId = ${again.id}`,
      );
      expect(again.id).not.toBe(assigned.id);
    },
  );

  it("Bebê e Crianças: o prompt pede lookId 'padrao' e não cita direção", () => {
    const text = request(ContentAudience.CHILD, "Tema A");
    expect(text).toContain('lookId: escreva "padrao"');
    expect(text).not.toContain("DIREÇÃO VISUAL ATRIBUÍDA");
  });

  it.each(WITH_VARIANTS)(
    "%s: cada direção chega às imagens com as suas letras, fundo, cores e composição",
    (audience) => {
      for (const variant of VERSE_CARD_LOOK_VARIANTS[audience]!) {
        const content = {
          ...fakeStageContent(ContentStageType.VERSE_VISUALS, audience, "T"),
          lookId: variant.id,
        };
        const text = verseCardImageSpecs(
          content,
          audience,
        )[0].instructions.join("\n");
        expect(text).toContain(variant.lettering);
        expect(text).toContain(variant.background);
        expect(text).toContain(variant.colors);
        expect(text).toContain(`COMPOSIÇÃO DA FOLHA: ${variant.composition}`);
        expect(text).toContain("CONTRASTE: o texto tem contraste FORTE");
        expect(text).toContain("A4 em PAISAGEM");
      }
    },
  );

  it("conteúdo antigo (sem lookId) mantém o visual único e não quebra", () => {
    const old = {
      ...fakeStageContent(
        ContentStageType.VERSE_VISUALS,
        ContentAudience.TEEN,
        "T",
      ),
    };
    delete old.lookId;
    expect(findVerseCardLook(ContentAudience.TEEN, undefined)).toBeNull();
    const text = verseCardImageSpecs(
      old,
      ContentAudience.TEEN,
    )[0].instructions.join("\n");
    expect(text).toContain("Tipografia de pôster");
    expect(text).not.toContain("COMPOSIÇÃO DA FOLHA");
  });

  it("a validação exige uma direção válida em Adolescentes e Adultos (e não exige nas outras)", () => {
    const validate = (audience: ContentAudience, lookId: unknown) =>
      validateStageOutput(ContentStageType.VERSE_VISUALS, audience, {
        ...fakeStageContent(ContentStageType.VERSE_VISUALS, audience, "T"),
        lookId,
      });
    expect(() => validate(ContentAudience.TEEN, "inventada")).toThrow(
      /lookId deve ser um destes/,
    );
    expect(() => validate(ContentAudience.ADULT, undefined)).toThrow(
      /lookId deve ser um destes/,
    );
    expect(() =>
      validate(ContentAudience.TEEN, verseCardLookIds(ContentAudience.TEEN)[2]),
    ).not.toThrow();
    expect(() => validate(ContentAudience.CHILD, "padrao")).not.toThrow();
  });
});
