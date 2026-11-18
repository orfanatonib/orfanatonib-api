import { AiGenerationCapability } from "../ai/enums/ai-generation-capability.enum";
import { ContentGenerationJobEntity } from "../entities/content-generation-job.entity";
import { ContentGenerationJobStatus } from "../enums/content-generation-job-status.enum";

export class ContentGenerationJobResponseDto {
  id: string;
  stageId: string;
  idempotencyKey: string;
  capability: AiGenerationCapability;
  status: ContentGenerationJobStatus;
  attempts: number;
  availableAt: Date;
  workerId: string | null;
  leaseExpiresAt: Date | null;
  heartbeatAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  requestedById: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: ContentGenerationJobEntity): ContentGenerationJobResponseDto {
    return {
      id: entity.id,
      stageId: entity.stageId,
      idempotencyKey: entity.idempotencyKey,
      capability: entity.capability,
      status: entity.status,
      attempts: entity.attempts,
      availableAt: entity.availableAt,
      workerId: entity.workerId,
      leaseExpiresAt: entity.leaseExpiresAt,
      heartbeatAt: entity.heartbeatAt,
      errorCode: entity.errorCode,
      errorMessage: entity.errorMessage,
      requestedById: entity.requestedById,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
