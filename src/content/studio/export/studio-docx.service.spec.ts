import { StudioDocxService } from "./studio-docx.service";
import {
  document,
  heading,
  paragraph,
  bullets,
  numbered,
  quote,
  text,
} from "./tiptap-nodes.util";
import type { TiptapDocument } from "./tiptap.types";

const meta = {
  theme: "Deus cuida de nós",
  biblicalReferences: "Salmos 23",
  audienceLabel: "Crianças · 3 a 11 anos",
  generatedAt: new Date("2026-11-19"),
};

const rich: TiptapDocument = document([
  heading(1, "Título"),
  paragraph("Texto com acento: ação, coração.\nSegunda linha"),
  {
    type: "paragraph",
    content: [
      text("negrito", [{ type: "bold" }]),
      text(" e "),
      text("link", [{ type: "link", attrs: { href: "https://exemplo.org" } }]),
    ],
  },
  bullets(["a", "b"]),
  numbered(["um", "dois"]),
  quote("Citação"),
  { type: "horizontalRule" },
  {
    type: "table",
    content: [
      {
        type: "tableRow",
        content: [
          { type: "tableHeader", content: [paragraph("Col")] },
          { type: "tableCell", content: [paragraph("Val")] },
        ],
      },
    ],
  },
]);

describe("StudioDocxService", () => {
  const service = new StudioDocxService();

  it("gera um .docx válido (zip) com capa, etapa e todos os tipos de bloco", async () => {
    const buffer = await service.build(meta, [
      { title: "LIÇÃO", document: rich },
    ]);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    expect(buffer.length).toBeGreaterThan(5_000);
  });

  it("várias etapas e documento sem blocos não quebram", async () => {
    const buffer = await service.build(meta, [
      { title: "A", document: document([]) },
      { title: "B", document: document([paragraph("x")]) },
    ]);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  });

  it("caracteres que invalidam o XML são removidos (senão o LibreOffice recusa o arquivo)", async () => {
    const dirty = document([
      paragraph(
        `ok${String.fromCharCode(0x0b)}${String.fromCharCode(0x00)}fim`,
      ),
    ]);
    await expect(
      service.build(meta, [{ title: "L", document: dirty }]),
    ).resolves.toBeInstanceOf(Buffer);
  });
});
