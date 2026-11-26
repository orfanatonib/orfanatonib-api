import { ContentAudience } from "../../enums/content-audience.enum";
import { ContentStageType } from "../../enums/content-stage-type.enum";
import { fakeStageContent } from "./fake-stage-content";
import {
  StageOutputError,
  sanitizeText,
  validateStageOutput,
} from "./stage-output.validator";

const ALL = Object.values(ContentAudience).flatMap((a) =>
  Object.values(ContentStageType).map((s) => [a, s] as const),
);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

describe("validateStageOutput", () => {
  it.each(ALL)(
    "conteúdo simulado de %s × %s cumpre o esquema e as regras do público",
    (audience, stage) => {
      const { content, internal } = validateStageOutput(
        stage,
        audience,
        fakeStageContent(stage, audience, "Tema"),
      );
      expect(content).not.toHaveProperty("centralMessage");
      expect(content).not.toHaveProperty("reviewerNotes");
      expect(internal).toHaveProperty("centralMessage");
    },
  );

  it("bebê: lição curta e sem perguntas; adulto: estudo longo com mais perguntas", () => {
    const baby = fakeStageContent(
      ContentStageType.LESSON,
      ContentAudience.BABY,
      "T",
    ) as { story: Array<{ body: string }>; reviewQuestions: unknown[] };
    const adult = fakeStageContent(
      ContentStageType.LESSON,
      ContentAudience.ADULT,
      "T",
    ) as { story: Array<{ body: string }>; reviewQuestions: unknown[] };
    expect(baby.reviewQuestions).toHaveLength(0);
    expect(adult.reviewQuestions.length).toBeGreaterThanOrEqual(6);
    const total = (c: { story: Array<{ body: string }> }) =>
      c.story.reduce((n, b) => n + b.body.split(" ").length, 0);
    expect(total(adult)).toBeGreaterThan(total(baby) * 2);
  });

  it("uma lição de adulto curta demais (do tamanho de bebê) é recusada", () => {
    const content = clone(
      fakeStageContent(ContentStageType.LESSON, ContentAudience.ADULT, "T"),
    ) as { story: Array<{ body: string }> };
    content.story = [{ heading: "x", body: "texto curto demais." } as never];
    expect(() =>
      validateStageOutput(
        ContentStageType.LESSON,
        ContentAudience.ADULT,
        content,
      ),
    ).toThrow(StageOutputError);
  });

  it("a lição exige as marcações de ação do condutor do público", () => {
    const content = clone(
      fakeStageContent(ContentStageType.LESSON, ContentAudience.TEEN, "T"),
    ) as { icebreaker: string; story: Array<{ body: string }> };
    content.icebreaker = "Sem marcação.";
    content.story = content.story.map((block) => ({
      ...block,
      body: block.body.replace(/\(Ação do Líder:[^)]*\)/g, ""),
    }));
    expect(() =>
      validateStageOutput(
        ContentStageType.LESSON,
        ContentAudience.TEEN,
        content,
      ),
    ).toThrow(/Ação do Líder/);
  });

  it("a lição exige a quantidade de materiais do público e duas opções de versículo", () => {
    const adult = clone(
      fakeStageContent(ContentStageType.LESSON, ContentAudience.ADULT, "T"),
    ) as { supportMaterials: string[]; verseOptions: string[] };
    adult.supportMaterials = ["Um — representa x."];
    expect(() =>
      validateStageOutput(
        ContentStageType.LESSON,
        ContentAudience.ADULT,
        adult,
      ),
    ).toThrow(/supportMaterials/);
    const child = clone(
      fakeStageContent(ContentStageType.LESSON, ContentAudience.CHILD, "T"),
    ) as { verseOptions: string[] };
    child.verseOptions = ["só uma"];
    expect(() =>
      validateStageOutput(
        ContentStageType.LESSON,
        ContentAudience.CHILD,
        child,
      ),
    ).toThrow(/verseOptions/);
  });

  it("bebê com mais perguntas do que o limite é recusado; criança sem perguntas também", () => {
    const baby = clone(
      fakeStageContent(ContentStageType.LESSON, ContentAudience.BABY, "T"),
    ) as { reviewQuestions: unknown[] };
    baby.reviewQuestions = Array.from({ length: 9 }, () => ({
      question: "q?",
      answer: "a",
    }));
    expect(() =>
      validateStageOutput(ContentStageType.LESSON, ContentAudience.BABY, baby),
    ).toThrow(/reviewQuestions/);
    const child = clone(
      fakeStageContent(ContentStageType.LESSON, ContentAudience.CHILD, "T"),
    ) as { reviewQuestions: unknown[] };
    child.reviewQuestions = [];
    expect(() =>
      validateStageOutput(
        ContentStageType.LESSON,
        ContentAudience.CHILD,
        child,
      ),
    ).toThrow(/reviewQuestions/);
  });

  it.each([
    [
      "campo obrigatório ausente",
      (c: Record<string, unknown>) => {
        delete c.objective;
      },
      /objective/,
    ],
    [
      "campo desconhecido",
      (c: Record<string, unknown>) => {
        c.extra = "x";
      },
      /extra/,
    ],
    [
      "tipo errado",
      (c: Record<string, unknown>) => {
        c.durationMinutes = "dez";
      },
      /inteiro/,
    ],
    [
      "sem materiais",
      (c: Record<string, unknown>) => {
        c.materials = [];
      },
      /materials/,
    ],
    [
      "adaptações diferentes de duas",
      (c: Record<string, unknown>) => {
        c.ageAdaptations = ["só uma"];
      },
      /ageAdaptations/,
    ],
    [
      "duração fora da faixa do público",
      (c: Record<string, unknown>) => {
        c.durationMinutes = 90;
      },
      /durationMinutes/,
    ],
  ])("brincadeira: %s", (_n, mutate, expected) => {
    const c = clone(
      fakeStageContent(
        ContentStageType.STANDARD_GAME,
        ContentAudience.CHILD,
        "T",
      ),
    );
    mutate(c);
    expect(() =>
      validateStageOutput(
        ContentStageType.STANDARD_GAME,
        ContentAudience.CHILD,
        c,
      ),
    ).toThrow(expected);
  });

  it("os visuais da lição exigem ids sequenciais visual-01…", () => {
    const c = clone(
      fakeStageContent(
        ContentStageType.LESSON_VISUALS,
        ContentAudience.CHILD,
        "T",
      ),
    ) as { items: Array<{ id: string }> };
    c.items[1].id = "visual-09";
    expect(() =>
      validateStageOutput(
        ContentStageType.LESSON_VISUALS,
        ContentAudience.CHILD,
        c,
      ),
    ).toThrow(/visual-02/);
  });

  describe("versículo (fonte fechada da lição aprovada)", () => {
    const approved = {
      text: "Porque Deus tanto amou o mundo.",
      reference: "João 3.16",
    };

    it("cartões que reconstroem o versículo e referência isolada passam", () => {
      expect(() =>
        validateStageOutput(
          ContentStageType.VERSE_VISUALS,
          ContentAudience.TEEN,
          fakeStageContent(
            ContentStageType.VERSE_VISUALS,
            ContentAudience.TEEN,
            "T",
          ),
          approved,
        ),
      ).not.toThrow();
    });

    it("recusa cartões que omitem palavras", () => {
      const c = clone(
        fakeStageContent(
          ContentStageType.VERSE_VISUALS,
          ContentAudience.TEEN,
          "T",
        ),
      ) as { cards: Array<{ text: string }> };
      c.cards[1].text = "amou.";
      expect(() =>
        validateStageOutput(
          ContentStageType.VERSE_VISUALS,
          ContentAudience.TEEN,
          c,
          approved,
        ),
      ).toThrow(/não reconstroem/);
    });

    it("recusa referência misturada ao texto no cartão final", () => {
      const c = clone(
        fakeStageContent(
          ContentStageType.VERSE_VISUALS,
          ContentAudience.TEEN,
          "T",
        ),
      ) as { referenceCard: { text: string } };
      c.referenceCard.text = "Porque Deus tanto amou o mundo. João 3.16";
      expect(() =>
        validateStageOutput(
          ContentStageType.VERSE_VISUALS,
          ContentAudience.TEEN,
          c,
          approved,
        ),
      ).toThrow(/referenceCard/);
    });

    it("recusa versículo diferente do aprovado na lição (visuais e fixação)", () => {
      const other = {
        text: "O Senhor é o meu pastor.",
        reference: "Salmos 23.1",
      };
      for (const stage of [
        ContentStageType.VERSE_VISUALS,
        ContentStageType.VERSE_FIXATION,
      ])
        expect(() =>
          validateStageOutput(
            stage,
            ContentAudience.CHILD,
            fakeStageContent(stage, ContentAudience.CHILD, "T"),
            other,
          ),
        ).toThrow(/difere do versículo aprovado/);
    });

    it("a fixação exige a avaliação", () => {
      const c = clone(
        fakeStageContent(
          ContentStageType.VERSE_FIXATION,
          ContentAudience.ADULT,
          "T",
        ),
      ) as { evaluation: string };
      c.evaluation = "";
      expect(() =>
        validateStageOutput(
          ContentStageType.VERSE_FIXATION,
          ContentAudience.ADULT,
          c,
          approved,
        ),
      ).toThrow(/evaluation/);
    });
  });

  it("higieniza Markdown e marcadores de imagem, sem mexer no texto", () => {
    expect(
      sanitizeText(
        "**Importante** e __forte__\n## Título\ntexto [Image #1] fim",
      ),
    ).toBe("Importante e forte\nTítulo\ntexto  fim");
    const c = clone(
      fakeStageContent(ContentStageType.LESSON, ContentAudience.TEEN, "T"),
    ) as { icebreaker: string };
    c.icebreaker = `**Bem-vindos** (Ação do Líder: mostre a pedra.)`;
    const { content } = validateStageOutput(
      ContentStageType.LESSON,
      ContentAudience.TEEN,
      c,
    );
    expect((content as { icebreaker: string }).icebreaker).toContain(
      "Bem-vindos (Ação do Líder",
    );
  });
});
