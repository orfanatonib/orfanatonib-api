import type { TiptapDocument, TiptapNode } from "./tiptap.types";

/** Construtores de nós TipTap: o documento de uma etapa é montado só com estes blocos. */
export const text = (
  value: string,
  marks?: TiptapNode["marks"],
): TiptapNode => ({
  type: "text",
  text: value,
  ...(marks?.length ? { marks } : {}),
});

const inline = (value: string): TiptapNode[] =>
  value
    .split(/\r?\n/)
    .flatMap((line, index) =>
      index === 0 ? [text(line)] : [{ type: "hardBreak" }, text(line)],
    )
    .filter((node) => node.type !== "text" || node.text !== "");

export const heading = (level: 1 | 2 | 3, value: string): TiptapNode => ({
  type: "heading",
  attrs: { level },
  content: inline(value),
});

export const paragraph = (value: string): TiptapNode => ({
  type: "paragraph",
  content: inline(value),
});

/** `Rótulo: valor`, com o rótulo em negrito. */
export const labeled = (label: string, value: string): TiptapNode => ({
  type: "paragraph",
  content: [text(`${label}: `, [{ type: "bold" }]), ...inline(value)],
});

export const bullets = (items: readonly string[]): TiptapNode => ({
  type: "bulletList",
  content: items.map((item) => ({
    type: "listItem",
    content: [paragraph(item)],
  })),
});

export const numbered = (items: readonly string[]): TiptapNode => ({
  type: "orderedList",
  attrs: { start: 1 },
  content: items.map((item) => ({
    type: "listItem",
    content: [paragraph(item)],
  })),
});

export const quote = (value: string): TiptapNode => ({
  type: "blockquote",
  content: [paragraph(value)],
});

export const document = (content: TiptapNode[]): TiptapDocument => ({
  type: "doc",
  content,
});

/** Larguras (px) das colunas das tabelas do documento: a primeira é a dos rótulos. */
export const INFO_LABEL_WIDTH_PX = 130;
export const INFO_VALUE_WIDTH_PX = 520;

const cell = (
  value: string,
  header: boolean,
  widthPx?: number,
): TiptapNode => ({
  type: header ? "tableHeader" : "tableCell",
  attrs: {
    colspan: 1,
    rowspan: 1,
    ...(widthPx ? { colwidth: [widthPx] } : {}),
  },
  content: [richParagraph(value)],
});

/** Tabela de dados: a primeira linha (`headerRow`) e/ou a primeira coluna (`headerColumn`) são cabeçalho (amarelo). */
export const table = (
  rows: ReadonlyArray<readonly string[]>,
  options: {
    headerRow?: boolean;
    headerColumn?: boolean;
    widthsPx?: readonly number[];
  } = {},
): TiptapNode => ({
  type: "table",
  content: rows.map((row, rowIndex) => ({
    type: "tableRow",
    content: row.map((value, columnIndex) =>
      cell(
        value,
        (options.headerRow === true && rowIndex === 0) ||
          (options.headerColumn === true && columnIndex === 0),
        options.widthsPx?.[columnIndex],
      ),
    ),
  })),
});

/** Falas entre aspas curvas em itálico e marcações de ação "(Ação do …: …)" em negrito. */
const RICH_TOKENS = /(“[^”]*”|\(Ação[^)]*\))/g;

export const richParagraph = (value: string): TiptapNode => ({
  type: "paragraph",
  content: value
    .split(RICH_TOKENS)
    .filter((part) => part !== "")
    .map((part) =>
      part.startsWith("“")
        ? text(part, [{ type: "italic" }])
        : part.startsWith("(Ação")
          ? text(part, [{ type: "bold" }])
          : text(part),
    ),
});

/** Texto longo em vários parágrafos (linha em branco separa), cada um com falas e ações destacadas. */
export const paragraphs = (value: string): TiptapNode[] =>
  value
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.replace(/\r?\n/g, " ").trim())
    .filter(Boolean)
    .map(richParagraph);

const centered = (value: string, bold = true): TiptapNode => ({
  type: "paragraph",
  attrs: { textAlign: "center" },
  content: [text(value, bold ? [{ type: "bold" }] : undefined)],
});

/**
 * Caixa de checklist (modelo das lições impressas): faixa amarela com o título (opcional) e, embaixo, uma
 * linha por item com a caixinha de marcar. `boldLast` destaca o último item (a oração final).
 */
export const checklistBox = (
  items: readonly string[],
  options: { title?: string; checkbox: string; boldLast?: boolean },
): TiptapNode => ({
  type: "table",
  content: [
    ...(options.title
      ? [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                attrs: { colspan: 1, rowspan: 1 },
                content: [centered(options.title)],
              },
            ],
          },
        ]
      : []),
    {
      type: "tableRow",
      content: [
        {
          type: "tableCell",
          attrs: { colspan: 1, rowspan: 1 },
          content: items.map((item, index) => ({
            type: "paragraph",
            content: [
              text(
                `${options.checkbox} ${item}`,
                options.boldLast === true && index === items.length - 1
                  ? [{ type: "bold" }]
                  : undefined,
              ),
            ],
          })),
        },
      ],
    },
  ],
});

/** Caixa amarela de destaque (uma célula de cabeçalho com texto central em negrito). */
export const highlightBox = (value: string): TiptapNode => ({
  type: "table",
  content: [
    {
      type: "tableRow",
      content: [
        {
          type: "tableHeader",
          attrs: { colspan: 1, rowspan: 1 },
          content: [centered(value)],
        },
      ],
    },
  ],
});

export const boldParagraph = (value: string): TiptapNode => ({
  type: "paragraph",
  content: [text(value, [{ type: "bold" }])],
});

/** Blocos de identidade do ministério (o editor e o DOCX conhecem estes três nós). */
export const BRAND_LOGO_FOI_POR_VOCE = "foi-por-voce";
export const BRAND_IMAGE_SETE_PASSOS = "sete-passos";
export const brandLogo = (name: string): TiptapNode => ({
  type: "brandLogo",
  attrs: { name },
});
/** Quebra de página: o que vem depois começa sempre em uma página nova. */
export const pageBreak = (): TiptapNode => ({ type: "pageBreak" });
/** Faixa de cinco cores (preto, vermelho, branco, amarelo, verde) que abre e fecha o título da meditação. */
export const colorBars = (): TiptapNode => ({ type: "colorBars" });

export const centeredBold = (value: string): TiptapNode => centered(value);

export const centeredHeading = (
  level: 1 | 2 | 3,
  value: string,
): TiptapNode => ({
  type: "heading",
  attrs: { level, textAlign: "center" },
  content: [text(value)],
});
