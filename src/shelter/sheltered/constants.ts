import { ShelteredOrderBy } from "./enums/sheltered-order-by.enum";
import { SortOrder } from "src/shared/enums/sort-order.enum";

export const SHELTERED_PAGE_DEFAULT = 1;
export const SHELTERED_LIMIT_DEFAULT = 20;
export const SHELTERED_LIMIT_MAX = 100;

export const SHELTERED_ORDER_BY_DEFAULT = ShelteredOrderBy.NAME;
export const SHELTERED_ORDER_DEFAULT = SortOrder.ASC;

export const SHELTERED_ALIAS = "sheltered";
export const SHELTER_ALIAS = "shelter";
export const SHELTERED_ADDRESS_ALIAS = "shelteredAddress";
export const SHELTER_ADDRESS_ALIAS = "shelterAddress";
export const ACCEPTED_CHRISTS_ALIAS = "acceptedChrists";

/**
 * Allowlist that maps a public `orderBy` value to its qualified column.
 * Sorting MUST never interpolate a client-provided field into SQL.
 */
export const SHELTERED_ORDER_BY_COLUMNS: Readonly<
  Record<ShelteredOrderBy, string>
> = {
  [ShelteredOrderBy.NAME]: `${SHELTERED_ALIAS}.name`,
  [ShelteredOrderBy.BIRTH_DATE]: `${SHELTERED_ALIAS}.birthDate`,
  [ShelteredOrderBy.JOINED_AT]: `${SHELTERED_ALIAS}.joinedAt`,
  [ShelteredOrderBy.CREATED_AT]: `${SHELTERED_ALIAS}.createdAt`,
  [ShelteredOrderBy.UPDATED_AT]: `${SHELTERED_ALIAS}.updatedAt`,
};

export const SHELTERED_NAME_MIN_LENGTH = 2;
export const SHELTERED_NAME_MAX_LENGTH = 255;
export const GUARDIAN_NAME_MIN_LENGTH = 2;
export const GUARDIAN_NAME_MAX_LENGTH = 255;
export const GUARDIAN_PHONE_MIN_LENGTH = 5;
export const GUARDIAN_PHONE_MAX_LENGTH = 32;

export const DATE_ONLY_LENGTH = 10;
export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const SHELTERED_MESSAGES = {
  NOT_FOUND: "Acolhido não encontrado ou fora do seu acesso.",
  SHELTER_NOT_FOUND: "Abrigo não encontrado ou fora do seu acesso.",
  SHELTER_REQUIRED:
    "Informe o abrigo do acolhido: sem abrigo ele ficaria fora do seu acesso.",
  INVALID_BIRTH_DATE: "Data de nascimento inválida. Use o formato AAAA-MM-DD.",
  INVALID_JOINED_AT:
    "Data de entrada no abrigo inválida. Use o formato AAAA-MM-DD.",
} as const;
