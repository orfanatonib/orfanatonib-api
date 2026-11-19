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
