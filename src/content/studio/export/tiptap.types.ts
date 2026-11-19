/** Nó do documento TipTap/ProseMirror (o formato que o editor do Estúdio edita e o exportador lê). */
export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export interface TiptapDocument extends TiptapNode {
  type: "doc";
  content: TiptapNode[];
}
