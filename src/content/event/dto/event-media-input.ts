/** Mídia opcional enviada com o evento (link ou metadados do arquivo anexado). */
export interface EventMediaInput {
  title?: string;
  description?: string;
  url?: string;
  isLocalFile?: boolean;
}
