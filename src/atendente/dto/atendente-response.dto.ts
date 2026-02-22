import { AtendenteEntity } from '../entities/atendente.entity';
import { AttendableType } from '../entities/attendable-type.enum';
import { MediaItemEntity } from 'src/shared/media/media-item/media-item.entity';

function toPdfDto(media?: MediaItemEntity | null) {
  if (!media) return undefined;
  return {
    id: media.id,
    title: media.title,
    description: media.description,
    url: media.url,
    uploadType: media.uploadType,
    mediaType: media.mediaType,
    isLocalFile: media.isLocalFile,
    platformType: media.platformType,
    originalName: media.originalName,
    size: media.size,
  };
}

export class AtendenteResponseDto {
  id: string;
  name?: string;
  attendableType?: AttendableType | null;
  attendableId?: string | null;
  attendableDisplayName?: string;
  pdfEstadual?: {
    id: string;
    title: string;
    description: string;
    url: string;
    uploadType: string;
    mediaType: string;
    isLocalFile: boolean;
    platformType?: string;
    originalName?: string;
    size?: number;
  };
  pdfFederal?: {
    id: string;
    title: string;
    description: string;
    url: string;
    uploadType: string;
    mediaType: string;
    isLocalFile: boolean;
    platformType?: string;
    originalName?: string;
    size?: number;
  };
  createdAt: Date;
  updatedAt: Date;

  /** Sempre preenche pdfEstadual e pdfFederal quando existirem (os 2 no mesmo response). */
  static fromEntity(
    entity: AtendenteEntity,
    pdfEstadual?: MediaItemEntity | null,
    pdfFederal?: MediaItemEntity | null,
    attendableDisplayName?: string,
  ): AtendenteResponseDto {
    const dto = new AtendenteResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.attendableType = entity.attendableType ?? null;
    dto.attendableId = entity.attendableId ?? null;
    dto.attendableDisplayName = attendableDisplayName;
    dto.pdfEstadual = toPdfDto(pdfEstadual);
    dto.pdfFederal = toPdfDto(pdfFederal);
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

export class PaginatedAtendenteResponseDto {
  data: AtendenteResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  constructor(data: AtendenteResponseDto[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
  }
}
