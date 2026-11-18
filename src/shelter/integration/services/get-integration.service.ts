import { Injectable, NotFoundException } from "@nestjs/common";
import { IntegrationRepository } from "../integration.repository";
import {
  IntegrationResponseDto,
  PaginatedResponseDto,
} from "../dto/integration-response.dto";
import { QueryIntegrationDto } from "../dto/query-integration.dto";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";

@Injectable()
export class GetIntegrationService {
  constructor(
    private readonly repository: IntegrationRepository,
    private readonly mediaProcessor: MediaItemProcessor,
  ) {}

  async findAll(): Promise<IntegrationResponseDto[]> {
    const integrations = await this.repository.findAll();

    const ids = integrations.map((i) => i.id);
    const mediaItems = await this.mediaProcessor.findManyMediaItemsByTargets(
      ids,
      MediaTargetType.Integration,
    );

    const mediaMap = new Map<string, MediaItemEntity[]>();
    mediaItems.forEach((item) => {
      if (!mediaMap.has(item.targetId)) {
        mediaMap.set(item.targetId, []);
      }
      mediaMap.get(item.targetId)!.push(item);
    });

    return integrations.map((integration) => {
      const media = mediaMap.get(integration.id) || [];
      return IntegrationResponseDto.fromEntity(integration, media);
    });
  }

  async findAllPaginated(
    query: QueryIntegrationDto,
  ): Promise<PaginatedResponseDto<IntegrationResponseDto>> {
    const { data: integrations, total } =
      await this.repository.findAllPaginated(query);

    const ids = integrations.map((i) => i.id);
    const mediaItems = await this.mediaProcessor.findManyMediaItemsByTargets(
      ids,
      MediaTargetType.Integration,
    );

    const mediaMap = new Map<string, MediaItemEntity[]>();
    mediaItems.forEach((item) => {
      if (!mediaMap.has(item.targetId)) {
        mediaMap.set(item.targetId, []);
      }
      mediaMap.get(item.targetId)!.push(item);
    });

    const responseData = integrations.map((integration) => {
      const media = mediaMap.get(integration.id) || [];
      return IntegrationResponseDto.fromEntity(integration, media);
    });

    return new PaginatedResponseDto(
      responseData,
      total,
      query.page || 1,
      query.limit || 10,
    );
  }

  async findOne(id: string): Promise<IntegrationResponseDto> {
    const integration = await this.repository.findById(id);
    if (!integration) {
      throw new NotFoundException(`Integration with ID ${id} not found`);
    }

    const mediaItems = await this.mediaProcessor.findMediaItemsByTarget(
      id,
      MediaTargetType.Integration,
    );

    return IntegrationResponseDto.fromEntity(integration, mediaItems);
  }
}
