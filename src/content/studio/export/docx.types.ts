import type { ISpacingProperties, Paragraph, Table } from "docx";

export interface DocxInlineOptions {
  size?: number;
  defaultColor?: string;
  defaultBold?: boolean;
  defaultItalic?: boolean;
  defaultFont?: string;
}

export type DocxSpacing = ISpacingProperties;

export type DocxBlock = Paragraph | Table;

export interface DocxListContext {
  type: "bullet" | "ordered";
  depth: number;
  /** Primeiro número de uma lista ordenada. */
  start?: number;
}
