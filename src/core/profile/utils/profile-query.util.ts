import {
  DEFAULT_PROFILE_SORT_KEY,
  PROFILE_SORT_COLUMNS,
  ProfileSortKey,
} from "../constants/profile-sort.constants";

export type SqlParam = string | number;
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

/** Termo de busca parcial para `LIKE` (o valor vai como parâmetro, nunca no texto do SQL). */
export const likeParam = (term: string): string => `%${term}%`;
