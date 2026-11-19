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
      purpose: "Confiar em Deus",
      memoryVerse: { text: "O Senhor é o meu pastor", reference: "Sl 23:1" },
      story: [{ heading: "O pastor", body: "Davi cuidava das ovelhas." }],
      reviewQuestions: [{ question: "Quem cuida de nós?", answer: "Deus" }],
      closingPrayer: "Obrigado, Senhor.",
    };
    expect(headings(ContentStageType.LESSON, content)).toEqual(
      expect.arrayContaining([
        "Deus cuida de nós",
        "VERSÍCULO PARA MEMORIZAR",
        "LIÇÃO",
        "O pastor",
        "PERGUNTAS DE REVISÃO",
        "ORAÇÃO FINAL",
      ]),
    );
    const text = allText(ContentStageType.LESSON, content);
    expect(text).toContain("O Senhor é o meu pastor (Sl 23:1)");
    expect(text).toContain("Davi cuidava das ovelhas.");
    expect(text).toContain("Quem cuida de nós?");
    expect(text).toContain("Deus");
  });

  it("atividade: duração, materiais e passo a passo numerado", () => {
    const doc = buildStageDocument(ContentStageType.ACTIVITY, {
      name: "Pastor e ovelhas",
      durationMinutes: 15,
      materials: ["bolas"],
      steps: ["Formem uma roda", "Cantem"],
    });
    expect(doc.content.some((node) => node.type === "orderedList")).toBe(true);
    expect(texts(doc as TiptapNode).join(" ")).toContain("15 minutos");
  });

  it("orientação ao facilitador: roteiro com minutos", () => {
    const text = allText(ContentStageType.FACILITATOR_GUIDANCE, {
      overview: "Visão",
      timeline: [{ minutes: 10, moment: "Acolhida" }],
    });
    expect(text).toContain("10 min — Acolhida");
  });

  it("apoios visuais: itens numerados com texto alternativo", () => {
    const text = allText(ContentStageType.VISUAL, {
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
      buildStageDocument(ContentStageType.DISCUSSION, {
        title: 5,
        questions: "x",
        groupAgreements: [1, null, "ok"],
      }),
    ).not.toThrow();
    expect(
      allText(ContentStageType.DISCUSSION, { groupAgreements: ["ok", "  "] }),
    ).toContain("ok");
  });
});
