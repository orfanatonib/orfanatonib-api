import {
  AlignmentType,
  BorderStyle,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Paragraph,
  ParagraphChild,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import { BRAND_IMAGES, BrandImageName } from "./brand-images.constants";
import {
  DOCUMENT_CODE_FONT,
  DOCUMENT_DEFAULT_COLOR,
  DOCUMENT_DEFAULT_FONT_SIZE,
  DOCUMENT_DEFAULT_HIGHLIGHT,
  DOCUMENT_LINK_COLOR,
  DOCUMENT_LIST_INDENT,
} from "./docx.constants";
import {
  docxTextLines,
  normalizeDocxColor,
  sanitizeDocxText,
} from "./docx-text.util";
import {
  documentCellWidth,
  documentFontFamily,
  documentFontSize,
  documentLineSpacing,
  documentLink,
  documentTableSpan,
} from "./docx-units.util";
import type { DocxInlineOptions, DocxListContext } from "./docx.types";

type Json = Record<string, unknown>;
type Alignment = (typeof AlignmentType)[keyof typeof AlignmentType];

/** Faixa do título da meditação (preto, vermelho, branco, amarelo, verde). */
const COLOR_BARS = ["000000", "FF3B30", "FFFFFF", "FFD400", "00B050"] as const;

/** Corpo do texto: 11 pt, com recuo de primeira linha de 1 cm. */
const BODY_FONT_SIZE = 22;
const BODY_FIRST_LINE_INDENT = 567;
/** Cabeçalhos de tabela: amarelo do ministério, com borda preta. */
const TABLE_HEADER_FILL = "FFD400";
const TABLE_BORDER = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
const TABLE_BORDERS = {
  top: TABLE_BORDER,
  bottom: TABLE_BORDER,
  left: TABLE_BORDER,
  right: TABLE_BORDER,
  insideHorizontal: TABLE_BORDER,
  insideVertical: TABLE_BORDER,
};

const asObject = (value: unknown): Json =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : {};
const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

/**
 * Converte um documento TipTap/ProseMirror em blocos do `docx` (parágrafos, listas, citações, tabelas,
 * marcas de texto, links). Portado do exportador do Clubinho, sem nada de lição, imagem ou S3.
 */
export class TiptapDocxRenderer {
  renderTiptapNodes(
    out: (Paragraph | Table)[],
    nodes: unknown[],
    listContext?: DocxListContext,
  ): void {
    if (!Array.isArray(nodes)) return;

    let orderedIndex = listContext?.start ?? 1;

    for (const raw of nodes) {
      const node = asObject(raw);
      const type = asString(node.type);

      if (type === "bulletList") {
        const listContent = Array.isArray(node.content) ? node.content : [];
        this.renderTiptapNodes(out, listContent, {
          type: "bullet",
          depth: (listContext?.depth ?? 0) + 1,
        });
        continue;
      }

      if (type === "orderedList") {
        const listContent = Array.isArray(node.content) ? node.content : [];
        const start = Number(asObject(node.attrs).start);
        this.renderTiptapNodes(out, listContent, {
          type: "ordered",
          depth: (listContext?.depth ?? 0) + 1,
          start: Number.isInteger(start) && start > 0 ? start : 1,
        });
        continue;
      }

      if (type === "listItem") {
        const depth = listContext?.depth ?? 1;
        const index = listContext?.type === "ordered" ? orderedIndex++ : 1;
        const prefix = listContext?.type === "ordered" ? `${index}. ` : "• ";
        this.renderListItem(out, node, prefix, depth);
        continue;
      }

      if (type === "heading") {
        const attrs = asObject(node.attrs);
        const level = Number(attrs.level) || 1;
        // Identidade do Orfanato (modelo SAICA/Pequeno Nazareno): título grande, preto, à esquerda.
        const alignment = this.getAlignment(
          attrs,
          level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
        );
        const runs = this.convertInlineNodesToTextRuns(
          Array.isArray(node.content) ? node.content : [],
          {
            size: level === 1 ? 52 : level === 2 ? 56 : 28,
            defaultBold: true,
            defaultColor: "000000",
          },
        );
        if (runs.length) {
          out.push(
            new Paragraph({
              heading:
                level === 1
                  ? HeadingLevel.HEADING_1
                  : level === 2
                    ? HeadingLevel.HEADING_2
                    : HeadingLevel.HEADING_3,
              alignment,
              children: runs,
              keepNext: true,
              spacing: documentLineSpacing(
                attrs,
                level === 2
                  ? { before: 360, after: 140 }
                  : { before: 240, after: 100 },
              ),
            }),
          );
        }
        continue;
      }

      if (type === "blockquote") {
        this.renderBlockquote(out, node);
        continue;
      }

      if (type === "table") {
        this.renderTable(out, node);
        continue;
      }

      if (type === "pageBreak") {
        out.push(new Paragraph({ pageBreakBefore: true, children: [] }));
        continue;
      }

      if (type === "brandLogo") {
        const name = asString(asObject(node.attrs).name) as BrandImageName;
        if (BRAND_IMAGES[name]) out.push(this.brandImageParagraph(name));
        continue;
      }

      if (type === "colorBars") {
        out.push(
          this.colorBarsTable(),
          new Paragraph({ spacing: { after: 60 }, children: [] }),
        );
        continue;
      }

      if (type === "horizontalRule") {
        out.push(
          new Paragraph({
            border: {
              bottom: { color: "DDDDDD", style: BorderStyle.SINGLE, size: 6 },
            },
          }),
        );
        continue;
      }
      if (type === "paragraph" || type === "codeBlock") {
        const attrs = asObject(node.attrs);
        const alignment = this.getAlignment(attrs, AlignmentType.JUSTIFIED);
        const runs = this.convertInlineNodesToTextRuns(
          Array.isArray(node.content) ? node.content : [],
          {
            size: BODY_FONT_SIZE,
            defaultColor: DOCUMENT_DEFAULT_COLOR,
            defaultFont: type === "codeBlock" ? DOCUMENT_CODE_FONT : undefined,
          },
        );
        if (runs.length || type === "paragraph") {
          out.push(
            new Paragraph({
              alignment,
              // Recuo de primeira linha, como nas lições impressas do ministério.
              indent: listContext
                ? undefined
                : { firstLine: BODY_FIRST_LINE_INDENT },
              spacing: documentLineSpacing(attrs, { after: 160, line: 276 }),
              children: runs.length ? runs : [new TextRun("")],
            }),
          );
        }
        continue;
      }

      if (Array.isArray(node.content)) {
        this.renderTiptapNodes(out, node.content, listContext);
      }
    }
  }

  /**
   * Renders every block of a list item. The marker is prepended to the first
   * paragraph; any other block (heading, quote, code, table) is rendered with
   * the regular block renderer instead of being dropped.
   */
  private renderListItem(
    out: (Paragraph | Table)[],
    itemNode: Json,
    prefix: string,
    depth: number,
  ): void {
    const itemContent = Array.isArray(itemNode.content) ? itemNode.content : [];
    const indent = { left: Math.max(1, depth) * DOCUMENT_LIST_INDENT };
    let markerPending = true;
    const marker = (): TextRun =>
      new TextRun({
        text: prefix,
        bold: true,
        color: DOCUMENT_DEFAULT_COLOR,
        size: DOCUMENT_DEFAULT_FONT_SIZE,
      });

    for (const rawChild of itemContent) {
      const child = asObject(rawChild);
      const childType = asString(child.type);

      if (childType === "paragraph") {
        const attrs = asObject(child.attrs);
        const alignment = this.getAlignment(attrs, AlignmentType.JUSTIFIED);
        const runs = this.convertInlineNodesToTextRuns(
          Array.isArray(child.content) ? child.content : [],
          {
            size: DOCUMENT_DEFAULT_FONT_SIZE,
            defaultColor: DOCUMENT_DEFAULT_COLOR,
          },
        );
        out.push(
          new Paragraph({
            alignment,
            indent,
            spacing: documentLineSpacing(attrs, { after: 100, line: 260 }),
            children: markerPending ? [marker(), ...runs] : runs,
          }),
        );
        markerPending = false;
        continue;
      }

      if (markerPending) {
        out.push(new Paragraph({ indent, children: [marker()] }));
        markerPending = false;
      }
      if (childType === "bulletList" || childType === "orderedList") {
        // The list branch adds one level itself; passing `depth` avoids doubling.
        this.renderTiptapNodes(out, [child], { type: "bullet", depth });
      } else {
        this.renderTiptapNodes(out, [child]);
      }
    }
  }

  private renderBlockquote(out: (Paragraph | Table)[], quoteNode: Json): void {
    const content = Array.isArray(quoteNode.content) ? quoteNode.content : [];
    for (const rawChild of content) {
      const child = asObject(rawChild);
      const childType = asString(child.type);
      if (childType === "paragraph") {
        const attrs = asObject(child.attrs);
        const alignment = this.getAlignment(attrs, AlignmentType.JUSTIFIED);
        const runs = this.convertInlineNodesToTextRuns(
          Array.isArray(child.content) ? child.content : [],
          { size: 22, defaultColor: "000000", defaultItalic: true },
        );
        out.push(
          new Paragraph({
            alignment,
            indent: { left: 360, right: 360 },
            shading: { fill: "F5F5F5" },
            border: {
              left: { color: "000000", style: BorderStyle.SINGLE, size: 24 },
            },
            spacing: documentLineSpacing(attrs, {
              before: 140,
              after: 140,
              line: 260,
            }),
            children: runs,
          }),
        );
      } else {
        const runs = this.convertInlineNodesToTextRuns([child], {
          size: 22,
          defaultColor: "000000",
          defaultItalic: true,
        });
        if (runs.length) {
          out.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              indent: { left: 360, right: 360 },
              shading: { fill: "F5F5F5" },
              border: {
                left: { color: "000000", style: BorderStyle.SINGLE, size: 24 },
              },
              spacing: { before: 140, after: 140, line: 260 },
              children: runs,
            }),
          );
        }
      }
    }
  }

  /** Arte fixa do ministério (logo "Foi por você", "7 passos da salvação"), centralizada e embutida no código. */
  private brandImageParagraph(name: BrandImageName): Paragraph {
    const image = BRAND_IMAGES[name];
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 160 },
      keepNext: true,
      children: [
        new ImageRun({
          type: "png",
          data: Buffer.from(image.base64, "base64"),
          transformation: {
            width: image.widthPx,
            height: Math.round(image.widthPx / image.aspect),
          },
        }),
      ],
    });
  }

  /** Faixa de cinco cores, sem bordas, que abre e fecha o título "Meditando e organizando". */
  private colorBarsTable(): Table {
    const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: none,
        bottom: none,
        left: none,
        right: none,
        insideHorizontal: none,
        insideVertical: none,
      },
      rows: [
        new TableRow({
          height: { value: 260, rule: "exact" },
          children: COLOR_BARS.map(
            (fill) =>
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { fill },
                borders: { top: none, bottom: none, left: none, right: none },
                children: [new Paragraph({ children: [] })],
              }),
          ),
        }),
      ],
    });
  }

  private renderTable(out: (Paragraph | Table)[], tableNode: Json): void {
    const tableContent = Array.isArray(tableNode.content)
      ? tableNode.content
      : [];
    const rows: TableRow[] = [];

    for (const rawRow of tableContent) {
      const rowNode = asObject(rawRow);
      if (asString(rowNode.type) !== "tableRow") continue;

      const rowContent = Array.isArray(rowNode.content) ? rowNode.content : [];
      const cells: TableCell[] = [];

      for (const rawCell of rowContent) {
        const cellNode = asObject(rawCell);
        const cellType = asString(cellNode.type);
        if (cellType !== "tableCell" && cellType !== "tableHeader") continue;

        const cellContent = Array.isArray(cellNode.content)
          ? cellNode.content
          : [];
        const cellParagraphs: (Paragraph | Table)[] = [];

        for (const rawPara of cellContent) {
          const paraNode = asObject(rawPara);
          if (asString(paraNode.type) === "paragraph") {
            const attrs = asObject(paraNode.attrs);
            const alignment = this.getAlignment(attrs, AlignmentType.LEFT);
            const runs = this.convertInlineNodesToTextRuns(
              Array.isArray(paraNode.content) ? paraNode.content : [],
              {
                size: 22,
                defaultColor: "000000",
                defaultBold: cellType === "tableHeader",
              },
            );
            cellParagraphs.push(
              new Paragraph({
                alignment,
                spacing: documentLineSpacing(attrs, { after: 60, line: 240 }),
                children: runs.length
                  ? runs
                  : [new TextRun({ text: "", size: 22 })],
              }),
            );
          } else {
            this.renderTiptapNodes(cellParagraphs, [paraNode]);
          }
        }

        if (!cellParagraphs.length) {
          cellParagraphs.push(
            new Paragraph({ children: [new TextRun({ text: "", size: 22 })] }),
          );
        }

        const cellWidth = documentCellWidth(asObject(cellNode.attrs).colwidth);
        cells.push(
          new TableCell({
            children: cellParagraphs,
            columnSpan: documentTableSpan(asObject(cellNode.attrs).colspan),
            rowSpan: documentTableSpan(asObject(cellNode.attrs).rowspan),
            width: cellWidth
              ? { size: cellWidth, type: WidthType.DXA }
              : undefined,
            shading:
              cellType === "tableHeader"
                ? { fill: TABLE_HEADER_FILL }
                : undefined,
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
          }),
        );
      }

      rows.push(new TableRow({ children: cells }));
    }

    if (rows.length) {
      out.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: TABLE_BORDERS,
          rows,
        }),
        new Paragraph({ spacing: { after: 120 }, children: [] }),
      );
    }
  }

  private convertInlineNodesToTextRuns(
    nodes: unknown[],
    options: DocxInlineOptions = {},
  ): ParagraphChild[] {
    if (!Array.isArray(nodes)) return [];
    const defaultSize = options.size ?? DOCUMENT_DEFAULT_FONT_SIZE;
    const defaultColor = options.defaultColor ?? DOCUMENT_DEFAULT_COLOR;
    const defaultBold = options.defaultBold ?? false;
    const defaultItalic = options.defaultItalic ?? false;

    const runs: ParagraphChild[] = [];

    for (const raw of nodes) {
      const node = asObject(raw);
      const type = asString(node.type);

      if (type === "hardBreak") {
        runs.push(new TextRun({ break: 1 }));
        continue;
      }

      if (type === "text") {
        const rawText = typeof node.text === "string" ? node.text : "";
        const text = sanitizeDocxText(rawText);
        if (!text) continue;

        const marks = Array.isArray(node.marks) ? node.marks : [];
        let isBold = defaultBold;
        let isItalic = defaultItalic;
        let isUnderline = false;
        let isStrike = false;
        let isSubScript = false;
        let isSuperScript = false;
        let textColor = defaultColor;
        let font = options.defaultFont;
        let size = defaultSize;
        let href: string | undefined;
        let highlightFill: string | undefined = undefined;

        for (const rawMark of marks) {
          const mark = asObject(rawMark);
          const mType = asString(mark.type);
          if (mType === "link") href = documentLink(asObject(mark.attrs).href);
          if (mType === "code") font = DOCUMENT_CODE_FONT;
          if (mType === "bold") isBold = true;
          if (mType === "italic") isItalic = true;
          if (mType === "underline") isUnderline = true;
          if (mType === "strike") isStrike = true;
          if (mType === "subscript") isSubScript = true;
          if (mType === "superscript") isSuperScript = true;
          if (mType === "textStyle" || mType === "color") {
            const attrs = asObject(mark.attrs);
            font = documentFontFamily(attrs.fontFamily) ?? font;
            size = documentFontSize(attrs.fontSize, defaultSize) ?? size;
            // Pasted content may carry rgb()/named colours; an unparseable
            // value keeps the default instead of breaking the whole document.
            textColor = normalizeDocxColor(attrs.color) ?? textColor;
          }
          if (mType === "highlight") {
            highlightFill =
              normalizeDocxColor(asObject(mark.attrs).color) ??
              DOCUMENT_DEFAULT_HIGHLIGHT;
          }
        }

        const run = new TextRun({
          text,
          bold: isBold,
          italics: isItalic,
          underline: isUnderline || href ? {} : undefined,
          strike: isStrike,
          subScript: isSubScript,
          superScript: isSuperScript,
          color:
            href && textColor === defaultColor
              ? DOCUMENT_LINK_COLOR
              : textColor,
          shading: highlightFill ? { fill: highlightFill } : undefined,
          size,
          font,
        });
        runs.push(
          href ? new ExternalHyperlink({ link: href, children: [run] }) : run,
        );
      } else if (Array.isArray(node.content)) {
        runs.push(...this.convertInlineNodesToTextRuns(node.content, options));
      }
    }

    return runs;
  }

  /** One sanitised run per line, so `\n` in structured text becomes a real break. */
  private plainRuns(
    value: string,
    options: {
      bold?: boolean;
      italics?: boolean;
      size?: number;
      color?: string;
    } = {},
  ): TextRun[] {
    return docxTextLines(value).map(
      (line, index) =>
        new TextRun({
          text: line,
          ...(index ? { break: 1 } : {}),
          bold: options.bold,
          italics: options.italics,
          color: options.color ?? DOCUMENT_DEFAULT_COLOR,
          size: options.size ?? DOCUMENT_DEFAULT_FONT_SIZE,
        }),
    );
  }

  private getAlignment(
    nodeAttrs: Json,
    defaultAlignment: Alignment = AlignmentType.JUSTIFIED,
  ): Alignment {
    const align = asString(nodeAttrs.textAlign).toLowerCase();
    if (align === "center") return AlignmentType.CENTER;
    if (align === "right") return AlignmentType.RIGHT;
    if (align === "left") return AlignmentType.LEFT;
    if (align === "justify") return AlignmentType.JUSTIFIED;
    return defaultAlignment;
  }
}
