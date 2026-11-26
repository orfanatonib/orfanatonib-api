/** Parâmetros de geração por pedido, com padrão e limites. O pedido pode pedir; o teto é sempre nosso. */

export const DEFAULT_MAX_OUTPUT_TOKENS = 4_000;
export const MIN_MAX_OUTPUT_TOKENS = 256;
export const MAX_MAX_OUTPUT_TOKENS = 16_000;

export const IMAGE_SIZES = ["1024x1024", "1024x1536", "1536x1024"] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];
export const IMAGE_QUALITIES = ["low", "medium", "high"] as const;
export type ImageQuality = (typeof IMAGE_QUALITIES)[number];

export const DEFAULT_IMAGE_SIZE: ImageSize = "1024x1024";
export const DEFAULT_IMAGE_QUALITY: ImageQuality = "low";

/** Limita os tokens de saída ao intervalo permitido; valor ausente ou inválido usa o padrão. */
export function resolveMaxOutputTokens(requested?: number | null): number {
  if (
    requested === undefined ||
    requested === null ||
    !Number.isFinite(requested)
  ) {
    return DEFAULT_MAX_OUTPUT_TOKENS;
  }
  return Math.min(
    MAX_MAX_OUTPUT_TOKENS,
    Math.max(MIN_MAX_OUTPUT_TOKENS, Math.floor(requested)),
  );
}

export function resolveImageSize(requested?: string | null): ImageSize {
  return IMAGE_SIZES.find((size) => size === requested) ?? DEFAULT_IMAGE_SIZE;
}

export function resolveImageQuality(requested?: string | null): ImageQuality {
  return (
    IMAGE_QUALITIES.find((quality) => quality === requested) ??
    DEFAULT_IMAGE_QUALITY
  );
}

/** Proporção do Gemini a partir do tamanho pedido. */
export function geminiAspectRatio(size: ImageSize): "1:1" | "2:3" | "3:2" {
  if (size === "1024x1536") return "2:3";
  if (size === "1536x1024") return "3:2";
  return "1:1";
}
