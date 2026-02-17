import { AtendenteEntity } from '../entities/atendente.entity';
import { AttendableType } from '../entities/attendable-type.enum';
import { MediaItemEntity } from 'src/shared/media/media-item/media-item.entity';

export class AtendenteResponseDto {
  id: string;
  name?: string;
  attendableType?: AttendableType | null;
  attendableId?: string | null;
  attendableDisplayName?: string;
  pdf?: {
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

  static fromEntity(
    entity: AtendenteEntity,
    pdfMedia?: MediaItemEntity | null,
    attendableDisplayName?: string,
  ): AtendenteResponseDto {
    const dto = new AtendenteResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.attendableType = entity.attendableType ?? null;
    dto.attendableId = entity.attendableId ?? null;
    dto.attendableDisplayName = attendableDisplayName;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    if (pdfMedia) {
      dto.pdf = {
        id: pdfMedia.id,
        title: pdfMedia.title,
        description: pdfMedia.description,
        url: pdfMedia.url,
        uploadType: pdfMedia.uploadType,
        mediaType: pdfMedia.mediaType,
        isLocalFile: pdfMedia.isLocalFile,
        platformType: pdfMedia.platformType,
        originalName: pdfMedia.originalName,
        size: pdfMedia.size,
      };
    }
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
