import { Injectable, ServiceUnavailableException } from "@nestjs/common";

import { RequestStageGenerationDto } from "../dto/request-stage-generation.dto";
import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";

@Injectable()
export class RequestStageGenerationService {
  async execute(
    _packageId: string,
    _stageId: string,
    _dto: RequestStageGenerationDto,
    _requestedById: string,
  ): Promise<ContentGenerationJobEntity> {
    throw new ServiceUnavailableException(
      "A geração automática ainda não está operacional. Salve o conteúdo manualmente enquanto o worker e o provedor não estiverem habilitados.",
    );
  }
}
