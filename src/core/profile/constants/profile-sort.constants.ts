/** Chaves de ordenação aceitas na listagem de perfis (espelha o `@IsIn` do DTO). */
export enum ProfileSortKey {
  Name = "name",
  Email = "email",
  CreatedAt = "createdAt",
  BirthDate = "birthDate",
}

/**
 * Coluna SQL de cada chave. Só estes literais entram no `ORDER BY`: o texto recebido
 * nunca é interpolado, então a segurança não depende de o DTO ter sido aplicado.
 */
export const PROFILE_SORT_COLUMNS: Readonly<Record<ProfileSortKey, string>> = {
  [ProfileSortKey.Name]: "u.name",
  [ProfileSortKey.Email]: "u.email",
  [ProfileSortKey.CreatedAt]: "u.createdAt",
  [ProfileSortKey.BirthDate]: "pd.birthDate",
};

export const DEFAULT_PROFILE_SORT_KEY = ProfileSortKey.Name;
