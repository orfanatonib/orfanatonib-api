import { IntegrationEntity } from '../entities/integration.entity';
import { MediaItemEntity } from 'src/shared/media/media-item/media-item.entity';

export class IntegrationResponseDto {
    id: string;
    name?: string;
    phone?: string;
    gaLeader?: string;
    baptized?: boolean;
    churchYears?: number;
    previousMinistry?: string;
    integrationYear?: number;
    images?: {
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
    }[];
    createdAt: Date;
    updatedAt: Date;

    static fromEntity(
        entity: IntegrationEntity,
        media?: MediaItemEntity[],
    ): IntegrationResponseDto {
        const dto = new IntegrationResponseDto();
        dto.id = entity.id;
        dto.name = entity.name;
        dto.phone = entity.phone;
        dto.gaLeader = entity.gaLeader;
        dto.baptized = entity.baptized;
        dto.churchYears = entity.churchYears;
        dto.previousMinistry = entity.previousMinistry;
        dto.integrationYear = entity.integrationYear;
        dto.createdAt = entity.createdAt;
        dto.updatedAt = entity.updatedAt;

        if (media && media.length > 0) {
            dto.images = media.map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                url: item.url,
                uploadType: item.uploadType,
                mediaType: item.mediaType,
                isLocalFile: item.isLocalFile,
                platformType: item.platformType,
                originalName: item.originalName,
                size: item.size,
            }));
        } else {
            dto.images = [];
        }

        return dto;
    }
}

export class PaginatedResponseDto<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;

    constructor(data: T[], total: number, page: number, limit: number) {
        this.data = data;
        this.total = total;
        this.page = page;
        this.limit = limit;
        this.totalPages = Math.ceil(total / limit);
    }
}
