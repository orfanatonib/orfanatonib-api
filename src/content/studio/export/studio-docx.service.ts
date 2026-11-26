import { Injectable } from "@nestjs/common";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  type ISectionOptions,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import {
  MINISTRY_LOGO_ASPECT,
  MINISTRY_LOGO_PNG_BASE64,
} from "./brand-logo.constants";
import { DOCUMENT_BASE_FONT, DOCUMENT_DEFAULT_COLOR } from "./docx.constants";
import { sanitizeDocxText } from "./docx-text.util";
import type { DocxBlock } from "./docx.types";
import { TiptapDocxRenderer } from "./tiptap-docx.renderer";
import type { TiptapDocument } from "./tiptap.types";

export interface StudioDocxImage {
  readonly bytes: Buffer;
  readonly width: number;
  readonly height: number;
}

/** Visuais da lição: só imagens, UMA POR PÁGINA, na orientação escolhida (sem documento de texto). */
export interface StudioDocxImagePages {
  readonly images: readonly StudioDocxImage[];
  readonly orientation: "LANDSCAPE" | "PORTRAIT";
}

export interface StudioDocxStage {
  /** Rótulo da etapa ("LIÇÃO"). */
  title: string;
  /** Categoria do material ("Crianças"), mostrada na etiqueta do cabeçalho. */
  audienceName?: string;
  document: TiptapDocument;
  /** Quando existe, a etapa vira páginas de imagem e `document` é ignorado. */
  imagePages?: StudioDocxImagePages;
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
/** Cores do cabeçalho do ministério (modelo SAICA/Pequeno Nazareno). */
const TAG_BLUE = "0047AB";
const RULE_RED = "E30613";
const RULE_ORANGE = "F7A233";
const URL_BLUE = "0B5BD3";
const BANNER_SITE = "www.orfanatonib.com";
const BANNER_LEFT_TWIPS = 5900;
const BANNER_RIGHT_TWIPS = 3738;
const LOGO_WIDTH_PX = 150;
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
};

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
    const single = stages.length === 1;
    const textStages = stages.filter(
      (stage) => stage.document.content.length > 0 || !stage.imagePages,
    );
    const sections: ISectionOptions[] = [];
    let children: DocxBlock[] =
      single || textStages.length === 0 ? [] : [...this.cover(meta)];
    // Vai para o arquivo o texto acumulado e, em seguida, as páginas de imagem da etapa: cada documento termina
    // com a sua imagem (ex.: infográfico em retrato A4 como última página), e não no fim do arquivo todo.
    const flushText = (): void => {
      if (children.length === 0) return;
      sections.push(this.textSection(meta, children));
      children = [];
    };

    let textIndex = 0;
    for (const stage of stages) {
      if (stage.document.content.length > 0 || !stage.imagePages) {
        // O título do documento (primeiro H1) vai para o cabeçalho; o resto é o corpo.
        const [first, ...rest] = stage.document.content;
        const hasTitle =
          first?.type === "heading" &&
          (first.attrs as { level?: number } | undefined)?.level === 1;
        const title = hasTitle
          ? (first.content ?? []).map((node) => node.text ?? "").join("")
          : stage.title;
        children.push(
          ...this.banner(
            title,
            stage.audienceName ?? stage.title,
            meta.generatedAt,
            // Depois de uma seção de imagem o documento já começa em página nova: sem quebra extra.
            children.length > 0 &&
              (!(single || textStages.length === 1) || textIndex > 0),
          ),
        );
        this.renderer.renderTiptapNodes(
          children,
          hasTitle ? rest : stage.document.content,
        );
        textIndex += 1;
      }
      if (stage.imagePages) {
        flushText();
        sections.push(...this.imageSections(stage.imagePages));
      }
    }
    flushText();

    const document = new Document({
      creator: BRAND,
      title: sanitizeDocxText(meta.theme),
      styles: {
        default: { document: { run: { font: DOCUMENT_BASE_FONT, size: 24 } } },
      },
      sections,
    });
    return Packer.toBuffer(document);
  }

  /** Seção de texto: A4 com margem e rodapé "tema · Página X de Y". */
  private textSection(
    meta: StudioDocxMeta,
    children: DocxBlock[],
  ): ISectionOptions {
    return {
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
    };
  }

  /** Uma seção por imagem: a folha A4 inteira (sem margem), na orientação escolhida. */
  private imageSections(pages: StudioDocxImagePages): ISectionOptions[] {
    const portrait = pages.orientation === "PORTRAIT";
    // A4 a 96 dpi em pixels, com 6 px de folga para a imagem nunca empurrar uma página em branco.
    const maxWidth = (portrait ? 794 : 1123) - 6;
    const maxHeight = (portrait ? 1123 : 794) - 6;
    return pages.images.map((image) => {
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
      return {
        properties: {
          page: {
            size: {
              orientation: portrait
                ? PageOrientation.PORTRAIT
                : PageOrientation.LANDSCAPE,
              width: 11906,
              height: 16838,
            },
            margin: {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              header: 0,
              footer: 0,
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0, line: 240 },
            children: [
              new ImageRun({
                type: "png",
                data: image.bytes,
                transformation: {
                  width: Math.floor(image.width * scale),
                  height: Math.floor(image.height * scale),
                },
              }),
            ],
          }),
        ],
      };
    });
  }

  /**
   * Cabeçalho da primeira página de cada documento: título grande à esquerda; logo do ministério, etiqueta da
   * categoria e endereço à direita; linhas vermelha e laranja (modelo das lições SAICA/Pequeno Nazareno).
   */
  private banner(
    title: string,
    tag: string,
    generatedAt: Date,
    pageBreakBefore: boolean,
  ): DocxBlock[] {
    const upper = sanitizeDocxText(title).toUpperCase();
    const size = upper.length <= 22 ? 64 : upper.length <= 36 ? 52 : 42;
    const left = new TableCell({
      width: { size: BANNER_LEFT_TWIPS, type: WidthType.DXA },
      borders: NO_BORDERS,
      verticalAlign: "center",
      children: [
        new Paragraph({
          spacing: { after: 80, line: 240 },
          border: {
            bottom: {
              color: RULE_RED,
              style: BorderStyle.SINGLE,
              size: 36,
              space: 6,
            },
          },
          children: [
            new TextRun({
              text: upper,
              bold: true,
              size,
              font: "Arial",
              color: "000000",
            }),
          ],
        }),
      ],
    });
    const right = new TableCell({
      width: { size: BANNER_RIGHT_TWIPS, type: WidthType.DXA },
      borders: NO_BORDERS,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new ImageRun({
              type: "png",
              data: Buffer.from(MINISTRY_LOGO_PNG_BASE64, "base64"),
              transformation: {
                width: LOGO_WIDTH_PX,
                height: Math.round(LOGO_WIDTH_PX / MINISTRY_LOGO_ASPECT),
              },
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 40 },
          shading: { type: ShadingType.CLEAR, fill: TAG_BLUE, color: "auto" },
          children: [
            new TextRun({
              text: sanitizeDocxText(tag).toUpperCase(),
              bold: true,
              size: 26,
              font: "Arial",
              color: "FFFFFF",
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 40 },
          border: {
            bottom: {
              color: RULE_ORANGE,
              style: BorderStyle.SINGLE,
              size: 18,
              space: 2,
            },
          },
          children: [],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: BANNER_SITE, size: 18, color: URL_BLUE }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: `® ${generatedAt.getFullYear()}`,
              size: 16,
              color: "000000",
            }),
          ],
        }),
      ],
    });
    return [
      ...(pageBreakBefore
        ? [new Paragraph({ pageBreakBefore: true, children: [] })]
        : []),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          ...NO_BORDERS,
          insideHorizontal: NO_BORDER,
          insideVertical: NO_BORDER,
        },
        rows: [new TableRow({ children: [left, right] })],
      }),
      new Paragraph({ spacing: { after: 200 }, children: [] }),
    ];
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
