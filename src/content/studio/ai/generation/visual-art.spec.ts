import { VERSE_CARD_LOOK_VARIANTS } from "./verse-card-looks.constants";
import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { fakeStageContent } from "./fake-stage-content";
import { buildStageRequest } from "./stage-prompt.builder";
import { validateStageOutput } from "./stage-output.validator";
import {
  AUDIENCE_VISUAL_ART,
  CutoutCategory,
  LessonVisualFormat,
} from "./visual-art.constants";

const request = (audience: ContentAudience, stageType: ContentStageType) =>
  buildStageRequest({
    stageType,
    audience,
    theme: "O bom pastor",
    biblicalReferences: "João 10.1-18",
    canonicalObjective: "Jesus cuida",
    canonicalNotes: null,
    upstream: {},
    previousVariants: [],
  }).instructions.join("\n");

const AUDIENCES = Object.values(ContentAudience);

describe("direção de arte por público", () => {
  it("cada público tem estilo e tipografia próprios", () => {
    const styles = AUDIENCES.map((a) => AUDIENCE_VISUAL_ART[a].lessonStyle);
    const cards = AUDIENCES.map((a) => AUDIENCE_VISUAL_ART[a].verseCardStyle);
    const funs = AUDIENCES.map(
      (a) => AUDIENCE_VISUAL_ART[a].funInfographicStyle,
    );
    expect(new Set(styles).size).toBe(4);
    expect(new Set(cards).size).toBe(4);
    expect(new Set(funs).size).toBe(4);
  });

  it.each([ContentAudience.BABY, ContentAudience.CHILD])(
    "%s: visuais da lição em kit de recortes com linha de corte",
    (audience) => {
      const text = request(audience, ContentStageType.LESSON_VISUALS);
      expect(text).toContain("LINHA DE CORTE");
      expect(text).toContain("KIT DE RECORTES");
    },
  );

  it.each([ContentAudience.TEEN, ContentAudience.ADULT])(
    "%s: visuais da lição em cenas completas A4",
    (audience) => {
      const text = request(audience, ContentStageType.LESSON_VISUALS);
      expect(text).toContain("CENAS COMPLETAS");
      expect(text).toContain("FOLHA A4");
      expect(text).not.toContain("LINHA DE CORTE");
    },
  );

  it.each(AUDIENCES)(
    "%s: cartões do versículo usam o estilo do público",
    (a) => {
      const text = request(a, ContentStageType.VERSE_VISUALS);
      // Adolescentes e Adultos recebem uma direção visual (lookId); as demais categorias, o visual único.
      const variants = VERSE_CARD_LOOK_VARIANTS[a];
      expect(text).toContain(
        variants
          ? variants.find((item) => text.includes(item.style))!.style
          : AUDIENCE_VISUAL_ART[a].verseCardStyle,
      );
      expect(text).toContain("FOLHA A4 SEM BORDA");
    },
  );

  it.each([ContentStageType.VERSE_FIXATION, ContentStageType.STANDARD_GAME])(
    "%s: imagem-resumo no estilo de cada público",
    (stage) => {
      for (const a of AUDIENCES)
        expect(request(a, stage)).toContain(
          AUDIENCE_VISUAL_ART[a].funInfographicStyle,
        );
    },
  );

  describe("validação", () => {
    const upstream = {
      text: "Porque Deus tanto amou o mundo.",
      reference: "João 3.16",
    };
    const run = (
      a: ContentAudience,
      stage: ContentStageType,
      patch: (c: Record<string, unknown>) => void,
    ) => {
      const c = fakeStageContent(stage, a, "Tema");
      patch(c);
      return () => validateStageOutput(stage, a, c, upstream);
    };

    it("rejeita SCENE no kit e kit nas cenas", () => {
      for (const a of AUDIENCES) {
        const scenes =
          AUDIENCE_VISUAL_ART[a].format === LessonVisualFormat.STORY_SCENES;
        expect(
          run(a, ContentStageType.LESSON_VISUALS, (c) => {
            (c.items as Array<Record<string, unknown>>)[0].category = scenes
              ? CutoutCategory.OBJECTS
              : CutoutCategory.SCENE;
          }),
        ).toThrow(/category/);
      }
    });

    it("exige imagePrompt em itens, cartões, referência e imagem-resumo", () => {
      const a = ContentAudience.CHILD;
      expect(
        run(a, ContentStageType.LESSON_VISUALS, (c) => {
          (c.items as Array<Record<string, unknown>>)[0].imagePrompt = "";
        }),
      ).toThrow(/imagePrompt/);
      expect(
        run(a, ContentStageType.VERSE_VISUALS, (c) => {
          (c.cards as Array<Record<string, unknown>>)[0].imagePrompt = "";
        }),
      ).toThrow(/imagePrompt/);
      expect(
        run(a, ContentStageType.VERSE_VISUALS, (c) => {
          (c.referenceCard as Record<string, unknown>).imagePrompt = "";
        }),
      ).toThrow(/imagePrompt/);
      for (const stage of [
        ContentStageType.VERSE_FIXATION,
        ContentStageType.STANDARD_GAME,
      ])
        expect(
          run(a, stage, (c) => {
            c.imagePrompt = "";
          }),
        ).toThrow(/imagePrompt/);
    });

    it("limita a paleta a três cores e o bebê a dois cartões", () => {
      expect(
        run(ContentAudience.CHILD, ContentStageType.VERSE_VISUALS, (c) => {
          c.palette = ["a", "b", "c", "d"];
        }),
      ).toThrow(/palette/);
      expect(
        run(ContentAudience.BABY, ContentStageType.VERSE_VISUALS, (c) => {
          const cards = c.cards as Array<Record<string, unknown>>;
          c.cards = [...cards, { ...cards[0], id: "verso-03" }];
        }),
      ).toThrow(/cards/);
    });
  });

  describe("lição: versículo curto e falas por público", () => {
    const upstream = null;
    const lesson = (a: ContentAudience) =>
      fakeStageContent(ContentStageType.LESSON, a, "Tema");

    it("rejeita versículo longo demais para o bebê, mas aceita o mesmo no adulto", () => {
      const long =
        "O Senhor é a minha rocha, a minha fortaleza e o meu libertador; o meu Deus é o meu rochedo, em quem me refugio, o meu escudo.";
      const baby = lesson(ContentAudience.BABY);
      baby.memoryVerse = { text: long, reference: "Sl 18.2" };
      expect(() =>
        validateStageOutput(
          ContentStageType.LESSON,
          ContentAudience.BABY,
          baby,
          upstream,
        ),
      ).toThrow(/memoryVerse/);
      const adult = lesson(ContentAudience.ADULT);
      adult.memoryVerse = { text: long, reference: "Sl 18.2" };
      expect(() =>
        validateStageOutput(
          ContentStageType.LESSON,
          ContentAudience.ADULT,
          adult,
          upstream,
        ),
      ).not.toThrow();
    });

    it("exige falas em discurso direto fora do bebê", () => {
      const child = lesson(ContentAudience.CHILD) as {
        story: Array<{ body: string }>;
      };
      child.story = child.story.map((block) => ({
        ...block,
        body: block.body.replace(/[“”]/g, ""),
      }));
      expect(() =>
        validateStageOutput(
          ContentStageType.LESSON,
          ContentAudience.CHILD,
          child,
          upstream,
        ),
      ).toThrow(/discurso direto/);
    });
  });

  describe("título da lição (tema só com o nome → TEMA: subtítulo)", () => {
    const run = (theme: string, title: string) => {
      const c = fakeStageContent(
        ContentStageType.LESSON,
        ContentAudience.CHILD,
        "X",
      );
      c.title = title;
      return () =>
        validateStageOutput(
          ContentStageType.LESSON,
          ContentAudience.CHILD,
          c,
          null,
          theme,
        );
    };

    it.each(Object.values(ContentAudience))(
      "%s: tema sem subtítulo aceita 'SANSÃO: Deus cuida e salva' e o conserva",
      (audience) => {
        const c = fakeStageContent(ContentStageType.LESSON, audience, "SANSÃO");
        c.title = "SANSÃO: Deus cuida e salva.";
        const out = validateStageOutput(
          ContentStageType.LESSON,
          audience,
          c,
          null,
          "SANSÃO",
        );
        expect(out.content.title).toBe("SANSÃO: Deus cuida e salva");
      },
    );

    it("tema sem subtítulo rejeita título sem subtítulo, com outro tema ou com subtítulo enorme", () => {
      expect(run("SANSÃO", "SANSÃO")).toThrow(/subtítulo/);
      expect(run("SANSÃO", "Jonas: o peixe")).toThrow(/subtítulo/);
      expect(
        run(
          "SANSÃO",
          "SANSÃO: uma história muito longa sobre força cabelo promessa leão Dalila e Deus",
        ),
      ).toThrow(/longo demais/);
    });

    it("tema que já tem subtítulo vira o título exatamente, sem gerar outro", () => {
      const c = fakeStageContent(
        ContentStageType.LESSON,
        ContentAudience.TEEN,
        "X",
      );
      c.title = "Outro título qualquer";
      const out = validateStageOutput(
        ContentStageType.LESSON,
        ContentAudience.TEEN,
        c,
        null,
        "SANSÃO: A força vem de Deus",
      );
      expect(out.content.title).toBe("SANSÃO: A força vem de Deus");
    });
  });

  it("o prompt manda gerar o subtítulo só quando o tema não tem; senão copia o tema", () => {
    const text = (theme: string) =>
      buildStageRequest({
        stageType: ContentStageType.LESSON,
        audience: ContentAudience.CHILD,
        theme,
        biblicalReferences: "Juízes 13",
        canonicalObjective: "x",
        canonicalNotes: null,
        upstream: {},
        previousVariants: [],
      }).instructions.join("\n");
    expect(text("SANSÃO")).toContain("NÃO tem subtítulo");
    expect(text("SANSÃO")).toContain('"SANSÃO: Subtítulo"');
    expect(text("SANSÃO: Deus cuida e salva")).toContain("já traz o subtítulo");
    expect(text("SANSÃO: Deus cuida e salva")).not.toContain(
      "NÃO tem subtítulo",
    );
  });

  it("bebê: a aplicação não pode listar ensinos (primeiro/segundo)", () => {
    const baby = fakeStageContent(
      ContentStageType.LESSON,
      ContentAudience.BABY,
      "X",
    );
    baby.application =
      "O primeiro: Deus cuida. O segundo: Jesus salva. “Jesus, obrigado. Amém.”";
    expect(() =>
      validateStageOutput(
        ContentStageType.LESSON,
        ContentAudience.BABY,
        baby,
        null,
      ),
    ).toThrow(/não lista ensinos/);
    const child = fakeStageContent(
      ContentStageType.LESSON,
      ContentAudience.CHILD,
      "X",
    );
    child.application =
      "O primeiro é que Deus cuida. O segundo é que Jesus salva.";
    expect(() =>
      validateStageOutput(
        ContentStageType.LESSON,
        ContentAudience.CHILD,
        child,
        null,
      ),
    ).not.toThrow();
  });

  it("versículo em partes: reticências no começo ou no fim do trecho são retiradas do dado", () => {
    const baby = fakeStageContent(
      ContentStageType.LESSON,
      ContentAudience.BABY,
      "X",
    );
    baby.memoryVerse = {
      text: "…e sem derramamento de sangue não há perdão",
      reference: "Hebreus 9.22b",
    };
    const out = validateStageOutput(
      ContentStageType.LESSON,
      ContentAudience.BABY,
      baby,
      null,
    );
    expect((out.content.memoryVerse as { text: string }).text).toBe(
      "e sem derramamento de sangue não há perdão",
    );
    const child = fakeStageContent(
      ContentStageType.LESSON,
      ContentAudience.CHILD,
      "X",
    );
    child.memoryVerse = {
      text: "Tudo o que fizerem...",
      reference: "Colossenses 3.23a",
    };
    const out2 = validateStageOutput(
      ContentStageType.LESSON,
      ContentAudience.CHILD,
      child,
      null,
    );
    expect((out2.content.memoryVerse as { text: string }).text).toBe(
      "Tudo o que fizerem",
    );
    // ponto final do versículo não é reticência
    const ok = fakeStageContent(
      ContentStageType.LESSON,
      ContentAudience.CHILD,
      "X",
    );
    ok.memoryVerse = { text: "Deus é amor.", reference: "1 João 4.8" };
    expect(
      (
        validateStageOutput(
          ContentStageType.LESSON,
          ContentAudience.CHILD,
          ok,
          null,
        ).content.memoryVerse as { text: string }
      ).text,
    ).toBe("Deus é amor.");
  });
});
