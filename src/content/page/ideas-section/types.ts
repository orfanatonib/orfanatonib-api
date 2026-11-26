import { MediaType } from "src/shared/media/media-item/media-item.entity";
import { IdeasSectionMediaType } from "./enums/ideas-section-media-type.enum";

/** Arquivos enviados, indexados pelo nome do campo multipart. */
export type UploadedFilesDict = Record<string, Express.Multer.File>;

/** Campos que a seção grava, sem a mídia e sem o vínculo com a página. */
export interface IdeasSectionData {
  title: string;
  description: string;
  public: boolean;
}

/**
 * O módulo aceita três tipos de mídia; a tabela compartilhada conhece quatro.
 * A conversão é direta porque os nomes coincidem — o mapa existe para o
 * compilador garantir isso, e não uma cadeia de ternários copiada em cada
 * serviço.
 */
export const TO_MEDIA_TYPE: Readonly<Record<IdeasSectionMediaType, MediaType>> =
  {
    [IdeasSectionMediaType.VIDEO]: MediaType.VIDEO,
    [IdeasSectionMediaType.DOCUMENT]: MediaType.DOCUMENT,
    [IdeasSectionMediaType.IMAGE]: MediaType.IMAGE,
  };
