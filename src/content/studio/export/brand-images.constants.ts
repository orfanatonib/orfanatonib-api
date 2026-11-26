import {
  FOI_POR_VOCE_LOGO_ASPECT,
  FOI_POR_VOCE_LOGO_PNG_BASE64,
} from "./foi-por-voce-logo.constants";
import {
  SETE_PASSOS_ASPECT,
  SETE_PASSOS_PNG_BASE64,
} from "./sete-passos-image.constants";

/** Artes fixas do ministério usadas no fecho de toda lição (o editor tem as mesmas imagens, pelo mesmo nome). */
export enum BrandImageName {
  FOI_POR_VOCE = "foi-por-voce",
  SETE_PASSOS = "sete-passos",
}

export interface BrandImage {
  readonly base64: string;
  /** Largura / altura. */
  readonly aspect: number;
  /** Largura no documento, em pixels (96 dpi). */
  readonly widthPx: number;
}

export const BRAND_IMAGES: Readonly<Record<BrandImageName, BrandImage>> = {
  [BrandImageName.FOI_POR_VOCE]: {
    base64: FOI_POR_VOCE_LOGO_PNG_BASE64,
    aspect: FOI_POR_VOCE_LOGO_ASPECT,
    widthPx: 130,
  },
  [BrandImageName.SETE_PASSOS]: {
    base64: SETE_PASSOS_PNG_BASE64,
    aspect: SETE_PASSOS_ASPECT,
    widthPx: 600,
  },
};
