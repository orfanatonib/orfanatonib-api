import { MYSQL_DUPLICATE_ENTRY_CODE } from "./constants";

/** `true` quando o erro do driver é violação de índice único (corrida benigna). */
export const isDuplicateEntryError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as {
    code?: unknown;
    driverError?: { code?: unknown };
  };
  return (
    candidate.code === MYSQL_DUPLICATE_ENTRY_CODE ||
    candidate.driverError?.code === MYSQL_DUPLICATE_ENTRY_CODE
  );
};
