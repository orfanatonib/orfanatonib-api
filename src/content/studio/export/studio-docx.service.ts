import { Injectable } from "@nestjs/common";
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import { DOCUMENT_BASE_FONT, DOCUMENT_DEFAULT_COLOR } from "./docx.constants";
import { sanitizeDocxText } from "./docx-text.util";
import type { DocxBlock } from "./docx.types";
import { TiptapDocxRenderer } from "./tiptap-docx.renderer";
import type { TiptapDocument } from "./tiptap.types";

export interface StudioDocxStage {
  /** Rótulo da etapa ("LIÇÃO"). */
  title: string;
  document: TiptapDocument;
}

export interface StudioDocxMeta {
  theme: string;
  biblicalReferences: string;
  /** "Crianças · 3 a 11 anos" ou, no material completo, "Todas as faixas". */
  audienceLabel: string;
  generatedAt: Date;
}

const A4_MARGIN_TWIPS = 1134;
const BRAND = "Orfanatos NIB";
const BRAND_COLOR = "1E3A5F";
const MUTED = "5F6B7A";

const run = (
  value: string,
  options: {
    bold?: boolean;
    size?: number;
    color?: string;
    italics?: boolean;
  } = {},
): TextRun =>
  new TextRun({
    text: sanitizeDocxText(value),
    bold: options.bold,
    italics: options.italics,
    size: options.size ?? 24,
    color: options.color ?? DOCUMENT_DEFAULT_COLOR,
  });

/** Monta o `.docx` do material para visita: capa, uma seção por etapa, cabeçalho e rodapé com paginação. */
@Injectable()
export class StudioDocxService {
  private readonly renderer = new TiptapDocxRenderer();

  async build(
    meta: StudioDocxMeta,
    stages: readonly StudioDocxStage[],
  ): Promise<Buffer> {
    const children: DocxBlock[] = [...this.cover(meta)];

    stages.forEach((stage, index) => {
      children.push(
        new Paragraph({
          pageBreakBefore: true,
          spacing: { after: 160 },
          children: [
            run(`ETAPA ${index + 1} · ${stage.title}`, {
              bold: true,
              size: 22,
              color: BRAND_COLOR,
            }),
          ],
          border: {
            bottom: { color: BRAND_COLOR, style: "single", size: 8, space: 4 },
          },
        }),
      );
      this.renderer.renderTiptapNodes(children, stage.document.content);
    });

    const document = new Document({
      creator: BRAND,
      title: sanitizeDocxText(meta.theme),
      styles: {
        default: { document: { run: { font: DOCUMENT_BASE_FONT, size: 24 } } },
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: A4_MARGIN_TWIPS,
                bottom: A4_MARGIN_TWIPS,
                left: A4_MARGIN_TWIPS,
                right: A4_MARGIN_TWIPS,
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    run(BRAND, { bold: true, size: 20, color: BRAND_COLOR }),
                    run("  ·  Material para visita", {
                      size: 20,
                      color: MUTED,
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    run(`${sanitizeDocxText(meta.theme)}  ·  Página `, {
                      size: 18,
                      color: MUTED,
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 18,
                      color: MUTED,
                    }),
                    run(" de ", { size: 18, color: MUTED }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      size: 18,
                      color: MUTED,
                    }),
                  ],
                }),
              ],
            }),
          },
          children,
        },
      ],
    });
    return Packer.toBuffer(document);
  }

  private cover(meta: StudioDocxMeta): Paragraph[] {
    return [
      new Paragraph({
        spacing: { before: 2400, after: 200 },
        alignment: AlignmentType.CENTER,
        children: [
          run("MATERIAL PARA VISITA", { bold: true, size: 26, color: MUTED }),
        ],
      }),
      new Paragraph({
        spacing: { after: 240 },
        alignment: AlignmentType.CENTER,
        children: [
          run(meta.theme, { bold: true, size: 64, color: BRAND_COLOR }),
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        alignment: AlignmentType.CENTER,
        children: [run(meta.biblicalReferences, { italics: true, size: 28 })],
      }),
      new Paragraph({
        spacing: { after: 120 },
        alignment: AlignmentType.CENTER,
        children: [run(meta.audienceLabel, { size: 28 })],
      }),
      new Paragraph({
        spacing: { before: 1600 },
        alignment: AlignmentType.CENTER,
        children: [
          run(`Gerado em ${meta.generatedAt.toLocaleDateString("pt-BR")}`, {
            size: 20,
            color: MUTED,
          }),
        ],
      }),
    ];
  }
}
