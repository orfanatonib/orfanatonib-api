import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

export const MAX_TIPTAP_DOCUMENT_BYTES = 1_500_000;
export const MAX_TIPTAP_DOCUMENT_DEPTH = 32;

function safeDepth(node: unknown, depth = 0): boolean {
  if (depth > MAX_TIPTAP_DOCUMENT_DEPTH) return false;
  if (!node || typeof node !== "object") return true;
  if (Array.isArray(node))
    return node.every((item) => safeDepth(item, depth + 1));
  const record = node as Record<string, unknown>;
  if (record.content === undefined) return true;
  if (!Array.isArray(record.content)) return false;
  return record.content.every(
    (child) =>
      Boolean(child) &&
      typeof child === "object" &&
      !Array.isArray(child) &&
      typeof (child as Record<string, unknown>).type === "string" &&
      safeDepth(child, depth + 1),
  );
}

/** Raiz `{ type: "doc", content: [...] }`, até 1,5 MB e 32 níveis. */
@ValidatorConstraint({ name: "tiptapDocument", async: false })
export class TiptapDocumentValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false;
    const doc = value as Record<string, unknown>;
    if (doc.type !== "doc" || !Array.isArray(doc.content)) return false;
    let bytes: number;
    try {
      bytes = Buffer.byteLength(JSON.stringify(doc), "utf8");
    } catch {
      return false;
    }
    return bytes <= MAX_TIPTAP_DOCUMENT_BYTES && safeDepth(doc);
  }

  defaultMessage(): string {
    return 'O documento deve ter raiz { type: "doc", content: [...] } e respeitar os limites de tamanho (1,5 MB) e profundidade (32 níveis).';
  }
}

/** Texto corrido do documento (para a checagem de dados pessoais e para contagens). */
export function tiptapPlainText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const record = node as { text?: unknown; content?: unknown[] };
  const own = typeof record.text === "string" ? record.text : "";
  const children = Array.isArray(record.content)
    ? record.content.map(tiptapPlainText).join("\n")
    : "";
  return `${own}${children}`;
}
