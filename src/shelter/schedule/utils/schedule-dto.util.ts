/**
 * Campo opcional que só é validado quando veio preenchido: `undefined`, `null` e texto vazio
 * significam "sem valor" (a tela manda vazio para limpar a data) e não são erro.
 */
export const isFilled = (_dto: unknown, value: unknown): boolean =>
  value !== undefined && value !== null && value !== "";

/** Campo que, se enviado, não pode ser `null` (coluna NOT NULL); omitir é "não mexer". */
export const isProvided = (_dto: unknown, value: unknown): boolean =>
  value !== undefined;

/** Teto das colunas `varchar(255)` da agenda. */
export const SCHEDULE_VARCHAR_MAX = 255;
