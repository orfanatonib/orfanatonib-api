import { MediaItemDto } from "src/shared/dto/media-item-dto";

/** Contexto mínimo de uma publicação do feed (moderação de comentários). */
export class FeedSectionContextDto {
  id: string;
  caption: string;
  /** Primeira mídia da publicação, usada como miniatura; `null` sem mídia. */
  cover: MediaItemDto | null;
  mediaCount: number;
}
