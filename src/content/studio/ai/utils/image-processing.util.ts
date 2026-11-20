import * as sharpModule from "sharp";

/**
 * O projeto compila sem `esModuleInterop`: `import sharp from "sharp"` vira `sharp_1.default(...)` e quebra.
 * Pega o módulo como função, seja qual for a forma de empacotamento.
 */
const sharp = ((sharpModule as unknown as { default?: typeof sharpModule })
  .default ?? sharpModule) as unknown as typeof sharpModule.default;

import { ContentVisualOrientation } from "../../enums/content-visual.enums";

/** Proporção do lado maior sobre o menor de uma folha A4 (297 × 210 mm). */
export const A4_RATIO = Math.SQRT2;

export interface ProcessedImage {
  readonly bytes: Buffer;
  readonly width: number;
  readonly height: number;
  readonly mediaType: "image/png";
}

/**
 * Recorta a imagem ao centro para a proporção do A4 na orientação escolhida (o gerador devolve 2:3 ou 3:2) e
 * normaliza para PNG. Nada é esticado: só some a sobra de uma das bordas.
 */
export async function cropToA4(
  input: Uint8Array,
  orientation: ContentVisualOrientation,
): Promise<ProcessedImage> {
  const image = sharp(Buffer.from(input));
  const { width = 0, height = 0 } = await image.metadata();
  if (!width || !height) throw new Error("Imagem inválida");
  const portrait = orientation === ContentVisualOrientation.PORTRAIT;
  const targetRatio = portrait ? 1 / A4_RATIO : A4_RATIO; // largura / altura
  const ratio = width / height;
  let cropWidth = width;
  let cropHeight = height;
  if (ratio > targetRatio) cropWidth = Math.round(height * targetRatio);
  else cropHeight = Math.round(width / targetRatio);
  const left = Math.floor((width - cropWidth) / 2);
  const top = Math.floor((height - cropHeight) / 2);
  const { data, info } = await image
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .png()
    .toBuffer({ resolveWithObject: true });
  return {
    bytes: data,
    width: info.width,
    height: info.height,
    mediaType: "image/png",
  };
}

/**
 * Ajusta à A4 SEM cortar nada (infográfico compilado, em que título e quadro final ficam nas pontas): quando a
 * imagem é mais "magra" que a A4, estende as laterais repetindo a cor da borda; quando é mais "larga", estende
 * em cima e embaixo do mesmo jeito.
 */
export async function padToA4(
  input: Uint8Array,
  orientation: ContentVisualOrientation,
): Promise<ProcessedImage> {
  const image = sharp(Buffer.from(input));
  const { width = 0, height = 0 } = await image.metadata();
  if (!width || !height) throw new Error("Imagem inválida");
  const portrait = orientation === ContentVisualOrientation.PORTRAIT;
  const targetRatio = portrait ? 1 / A4_RATIO : A4_RATIO;
  const targetWidth = Math.max(width, Math.round(height * targetRatio));
  const targetHeight = Math.max(height, Math.round(width / targetRatio));
  const horizontal = Math.floor((targetWidth - width) / 2);
  const vertical = Math.floor((targetHeight - height) / 2);
  const { data, info } = await image
    .extend({
      left: horizontal,
      right: targetWidth - width - horizontal,
      top: vertical,
      bottom: targetHeight - height - vertical,
      extendWith: "copy",
    })
    .png()
    .toBuffer({ resolveWithObject: true });
  return {
    bytes: data,
    width: info.width,
    height: info.height,
    mediaType: "image/png",
  };
}

/** Largura e altura (px) de uma imagem. */
export async function imageDimensions(
  input: Uint8Array,
): Promise<{ width: number; height: number }> {
  const { width = 0, height = 0 } = await sharp(Buffer.from(input)).metadata();
  if (!width || !height) throw new Error("Imagem inválida");
  return { width, height };
}
