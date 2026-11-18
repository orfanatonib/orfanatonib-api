import { BadRequestException } from "@nestjs/common";

const MAX_CONTENT_BYTES = 100 * 1024;
const MAX_DEPTH = 12;
const MAX_ARRAY_ITEMS = 100;
const MAX_STRING_LENGTH = 8_000;
const SENSITIVE_KEYS = new Set([
  "address",
  "diagnosis",
  "document",
  "email",
  "fullname",
  "healthhistory",
  "location",
  "phone",
  "personname",
  "personalname",
  "birthdate",
  "dateofbirth",
  "shelteredperson",
  "shelteredpersonid",
  "personalhistory",
  "beneficiaryname",
  "childname",
  "realname",
]);

function normalizedKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function validateValue(value: unknown, depth: number): void {
  if (depth > MAX_DEPTH) {
    throw new BadRequestException(
      "O conteúdo excede a profundidade máxima permitida",
    );
  }

  if (typeof value === "string") {
    if (value.length > MAX_STRING_LENGTH) {
      throw new BadRequestException(
        "Um campo de texto excede o limite permitido",
      );
    }
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new BadRequestException("O conteúdo contém um número inválido");
    }
    return;
  }

  if (value === null || typeof value === "boolean") return;

  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) {
      throw new BadRequestException(
        "Uma lista excede o limite de itens permitido",
      );
    }
    value.forEach((item) => validateValue(item, depth + 1));
    return;
  }

  if (
    typeof value !== "object" ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new BadRequestException(
      "O conteúdo deve conter apenas valores JSON simples",
    );
  }

  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(normalizedKey(key))) {
      throw new BadRequestException(
        "O conteúdo não pode incluir campos de dados pessoais",
      );
    }
    validateValue(child, depth + 1);
  }
}

export function validateStructuredContent(
  content: Record<string, unknown>,
): string {
  validateValue(content, 0);
  const serialized = JSON.stringify(content);
  if (
    !serialized ||
    Buffer.byteLength(serialized, "utf8") > MAX_CONTENT_BYTES
  ) {
    throw new BadRequestException("O conteúdo excede o limite de 100 KB");
  }
  return serialized;
}
