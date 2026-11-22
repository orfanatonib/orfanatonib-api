import { QueryFailedError } from "typeorm";

/** O MySQL recusou por chave única (`ER_DUP_ENTRY`, errno 1062)? */
export const isDuplicateEntry = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  (error.driverError as { errno?: number } | undefined)?.errno === 1062;
