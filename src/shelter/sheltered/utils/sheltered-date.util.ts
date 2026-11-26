import { DATE_ONLY_LENGTH, DATE_ONLY_PATTERN } from "../constants";

/**
 * Normalizes any accepted date input into the `YYYY-MM-DD` form stored by the
 * `date` columns. Returns `null` when the value is absent or unparseable.
 */
export const toDateOnly = (
  value: string | Date | null | undefined,
): string | null => {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value.toISOString().slice(0, DATE_ONLY_LENGTH);
  }

  const raw = value.trim();
  if (!raw) return null;
  if (DATE_ONLY_PATTERN.test(raw)) return raw;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, DATE_ONLY_LENGTH);
};

/**
 * Normalizes a timestamp column into an ISO-8601 string for response DTOs.
 */
export const toIsoDateTime = (value: Date | string): string => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? new Date().toISOString()
      : value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
};

/**
 * True when the value is already a calendar date the database can accept.
 */
export const isDateOnly = (value: string): boolean =>
  DATE_ONLY_PATTERN.test(value);
