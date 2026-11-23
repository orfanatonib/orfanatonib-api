import {
  DEFAULT_PROFILE_SORT_KEY,
  PROFILE_SORT_COLUMNS,
  ProfileSortKey,
} from "../constants/profile-sort.constants";
import { escapeLike } from "src/shared/list-query/list-query.util";

export type SqlParam = string | number | Date;
export type SortDirection = "ASC" | "DESC";

const SORT_KEYS: readonly string[] = Object.values(ProfileSortKey);

const isProfileSortKey = (value: string): value is ProfileSortKey =>
  SORT_KEYS.includes(value);

/**
 * Coluna e direção seguras para o `ORDER BY`. Chave fora da lista cai no padrão
 * (nome); direção só é `DESC` quando exatamente `"DESC"` (qualquer outra coisa vira `ASC`).
 */
export const resolveProfileSort = (
  sortBy?: string,
  order?: string,
): { column: string; direction: SortDirection } => ({
  column:
    PROFILE_SORT_COLUMNS[
      sortBy && isProfileSortKey(sortBy) ? sortBy : DEFAULT_PROFILE_SORT_KEY
    ],
  direction: order === "DESC" ? "DESC" : "ASC",
});

/** Cláusula que acompanha todo `LIKE ?`: a barra invertida escapa `%` e `_` digitados pelo usuário. */
export const LIKE_ESCAPE = "ESCAPE '\\\\'";

/** Termo de busca parcial para `LIKE` (o valor vai como parâmetro, nunca no texto do SQL); `%`, `_` e `\` viram literais. */
export const likeParam = (term: string): string => `%${escapeLike(term)}%`;
