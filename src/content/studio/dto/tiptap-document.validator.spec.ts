import { BadRequestException } from "@nestjs/common";

import { SaveStageContentService } from "../services/save-stage-content.service";
import {
  TiptapDocumentValidator,
  tiptapPlainText,
} from "./tiptap-document.validator";

const validator = new TiptapDocumentValidator();
const para = (t: string) => ({
  type: "paragraph",
  content: [{ type: "text", text: t }],
});

describe("TiptapDocumentValidator", () => {
  it("aceita documento com raiz doc e conteúdo", () => {
    expect(validator.validate({ type: "doc", content: [para("oi")] })).toBe(
      true,
    );
    expect(validator.validate({ type: "doc", content: [] })).toBe(true);
  });

  it.each([
    null,
    undefined,
    [],
    "x",
    { type: "paragraph", content: [] },
    { type: "doc" },
    { type: "doc", content: "x" },
  ])("recusa %j", (value) => {
    expect(validator.validate(value)).toBe(false);
  });

  it("recusa filho sem tipo, profundidade acima de 32 e tamanho acima de 1,5 MB", () => {
    expect(validator.validate({ type: "doc", content: [{ foo: 1 }] })).toBe(
      false,
    );
    let deep: Record<string, unknown> = para("x");
    for (let i = 0; i < 40; i++) deep = { type: "blockquote", content: [deep] };
    expect(validator.validate({ type: "doc", content: [deep] })).toBe(false);
    expect(
      validator.validate({
        type: "doc",
        content: [para("x".repeat(1_600_000))],
      }),
    ).toBe(false);
  });

  it("texto corrido junta os nós", () => {
    expect(
      tiptapPlainText({ type: "doc", content: [para("a"), para("b")] }),
    ).toBe("a\nb");
  });
});

describe("SaveStageContentService com documento", () => {
  const repo = { saveStageContent: jest.fn().mockResolvedValue({ id: "p" }) };
  const svc = new SaveStageContentService(repo as never);
  beforeEach(() => jest.clearAllMocks());

  it("grava o documento junto e o checksum muda quando só o documento muda", async () => {
    await svc.execute(
      "p",
      "s",
      {
        structuredContent: { title: "a" },
        contentDocument: { type: "doc", content: [para("um")] },
      },
      "u",
    );
    await svc.execute(
      "p",
      "s",
      {
        structuredContent: { title: "a" },
        contentDocument: { type: "doc", content: [para("dois")] },
      },
      "u",
    );
    const [first, second] = repo.saveStageContent.mock.calls.map((c) => c[0]);
    expect(first.contentDocument).toBeTruthy();
    expect(first.contentChecksum).not.toBe(second.contentChecksum);
  });

  it("sem documento: contentDocument nulo", async () => {
    await svc.execute("p", "s", { structuredContent: { title: "a" } }, "u");
    expect(repo.saveStageContent.mock.calls[0][0].contentDocument).toBeNull();
  });

  it("documento com dado pessoal (nome de acolhido, CPF) é recusado e nada é gravado", async () => {
    await expect(
      svc.execute(
        "p",
        "s",
        {
          structuredContent: { title: "a" },
          contentDocument: {
            type: "doc",
            content: [para("O CPF dele é 123.456.789-09")],
          },
        },
        "u",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.saveStageContent).not.toHaveBeenCalled();
  });
});
