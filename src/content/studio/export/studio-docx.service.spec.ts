import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as sharpModule from "sharp";
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

const sharp = ((sharpModule as unknown as { default?: typeof sharpModule })
  .default ?? sharpModule) as unknown as typeof sharpModule.default;

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

  it("fixação: a imagem compilada vem logo depois do documento da própria etapa, em retrato A4, e não no fim do arquivo", async () => {
    const png = await sharp({
      create: {
        width: 1086,
        height: 1536,
        channels: 3,
        background: { r: 250, g: 240, b: 220 },
      },
    })
      .png()
      .toBuffer();
    const buffer = await service.build(meta, [
      {
        title: "Fixação",
        document: document([heading(1, "PRIMEIRO"), paragraph("corpo um")]),
        imagePages: {
          orientation: "PORTRAIT",
          images: [{ bytes: png, width: 1086, height: 1536 }],
        },
      },
      {
        title: "Brincadeira",
        document: document([heading(1, "SEGUNDO"), paragraph("corpo dois")]),
      },
    ]);
    const dir = mkdtempSync(join(tmpdir(), "docx-spec-"));
    const file = join(dir, "out.docx");
    writeFileSync(file, buffer);
    const xml = execFileSync("unzip", ["-p", file, "word/document.xml"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    rmSync(dir, { recursive: true, force: true });
    const first = xml.indexOf("PRIMEIRO");
    const image = xml.indexOf("<w:drawing>");
    const second = xml.indexOf("SEGUNDO");
    expect(first).toBeGreaterThan(-1);
    expect(image).toBeGreaterThan(first);
    expect(second).toBeGreaterThan(image); // a imagem fecha o 1º documento, antes do 2º
    // a seção da imagem é A4 em pé, sem margem
    const portrait = /<w:pgSz [^>]*w:w="11906"[^>]*w:h="16838"/;
    expect(xml).toMatch(portrait);
    expect(xml).toContain('w:top="0"');
  });
});
