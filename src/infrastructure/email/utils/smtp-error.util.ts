import { RETRYABLE_SMTP_ERROR_CODES } from "../email.constants";
import { SmtpErrorMetadata } from "../email.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function readNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}

export function getSmtpErrorMetadata(error: unknown): SmtpErrorMetadata {
  if (!isRecord(error)) {
    return { name: "UnknownSmtpError" };
  }

  return {
    name: readString(error, "name") ?? "SmtpError",
    code: readString(error, "code"),
    responseCode: readNumber(error, "responseCode"),
    command: readString(error, "command"),
  };
}

export function isRetryableSmtpError(error: unknown): boolean {
  const metadata = getSmtpErrorMetadata(error);

  if (
    metadata.responseCode !== undefined &&
    metadata.responseCode >= 400 &&
    metadata.responseCode < 500
  ) {
    return true;
  }

  return (
    metadata.code !== undefined &&
    RETRYABLE_SMTP_ERROR_CODES.includes(metadata.code)
  );
}
