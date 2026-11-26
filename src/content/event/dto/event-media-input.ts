/** Mídia opcional enviada com o evento (link ou metadados do arquivo anexado). */
export interface EventMediaInput {
  title?: string;
  description?: string;
  /** `null` = o formulário pediu para remover a imagem do evento. */
  url?: string | null;
  isLocalFile?: boolean;
}
