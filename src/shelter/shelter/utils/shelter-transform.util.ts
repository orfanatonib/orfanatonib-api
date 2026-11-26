import { UploadType } from "src/shared/media/media-item/media-item.entity";

/**
 * Helpers de `@Transform` usados pelos DTOs do módulo de abrigos.
 *
 * O `class-transformer` tipa `value` como `any`; encapsular a normalização aqui
 * mantém os DTOs livres de `no-unsafe-return` e concentra a regra em um só lugar.
 */

/**
 * Normaliza o `uploadType` recebido via multipart (texto livre) para o enum.
 * Valores desconhecidos são devolvidos como vieram para que o `@IsEnum` acuse.
 */
export function normalizeUploadType(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const normalized = value.toLowerCase();
  const match = Object.values(UploadType).find(
    (candidate) => String(candidate) === normalized,
  );
  return match ?? value;
}

/** Garante uma lista na saída, mesmo quando a relação não foi carregada. */
export function toArrayOrEmpty(value: unknown): unknown[] {
  return Array.isArray(value) ? (value as unknown[]) : [];
}
