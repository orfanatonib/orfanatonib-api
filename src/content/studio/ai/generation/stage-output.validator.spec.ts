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

  it("bebê: lição curta e sem perguntas; adulto: estudo longo com perguntas", () => {
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
    expect(adult.reviewQuestions.length).toBeGreaterThanOrEqual(5);
    const total = (c: { story: Array<{ body: string }> }) =>
      c.story.reduce((n, b) => n + b.body.split(" ").length, 0);
    expect(total(adult)).toBeGreaterThan(total(baby) * 4);
  });

  it("uma lição de adulto curta demais (do tamanho de bebê) é recusada", () => {
    const content = clone(
      fakeStageContent(ContentStageType.LESSON, ContentAudience.ADULT, "T"),
    ) as { story: Array<{ body: string }> };
    content.story = [{ body: "texto curto demais para adultos." }];
    expect(() =>
      validateStageOutput(
        ContentStageType.LESSON,
        ContentAudience.ADULT,
        content,
      ),
    ).toThrow(StageOutputError);
  });

  it("bebê com perguntas de revisão é recusado; criança sem perguntas também", () => {
    const baby = clone(
      fakeStageContent(ContentStageType.LESSON, ContentAudience.BABY, "T"),
    ) as { reviewQuestions: unknown[] };
    baby.reviewQuestions = [{ question: "q?", answer: "a" }];
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
  ])("atividade: %s", (_n, mutate, expected) => {
    const c = clone(
      fakeStageContent(ContentStageType.ACTIVITY, ContentAudience.CHILD, "T"),
    );
    mutate(c);
    expect(() =>
      validateStageOutput(ContentStageType.ACTIVITY, ContentAudience.CHILD, c),
    ).toThrow(expected);
  });

  it("apoios visuais exigem ids sequenciais visual-01…", () => {
    const c = clone(
      fakeStageContent(ContentStageType.VISUAL, ContentAudience.CHILD, "T"),
    ) as { items: Array<{ id: string }> };
    c.items[1].id = "visual-09";
    expect(() =>
      validateStageOutput(ContentStageType.VISUAL, ContentAudience.CHILD, c),
    ).toThrow(/visual-02/);
  });

  it("higieniza Markdown e marcadores de imagem, sem mexer no texto", () => {
    expect(
      sanitizeText(
        "**Importante** e __forte__\n## Título\ntexto [Image #1] fim",
      ),
    ).toBe("Importante e forte\nTítulo\ntexto  fim");
    const c = clone(
      fakeStageContent(ContentStageType.DISCUSSION, ContentAudience.TEEN, "T"),
    ) as { introduction: string };
    c.introduction = "**Bem-vindos**";
    const { content } = validateStageOutput(
      ContentStageType.DISCUSSION,
      ContentAudience.TEEN,
      c,
    );
    expect((content as { introduction: string }).introduction).toBe(
      "Bem-vindos",
    );
  });
});
