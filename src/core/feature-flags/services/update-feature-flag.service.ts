import { Injectable, Logger } from "@nestjs/common";

import { ResourceConflictException } from "src/common/exceptions";

import { UpdateFeatureFlagDto } from "../dto/update-feature-flag.dto";
import { FeatureFlagResponseDto } from "../dto/feature-flag-response.dto";
import { FeatureFlagsRepository } from "../feature-flags.repository";
import { toFeatureFlagResponse } from "../mappers";
import {
  metadataWithTargetRoles,
  publicMetadataOf,
  targetRolesOf,
} from "../utils";
import { GetFeatureFlagsService } from "./get-feature-flags.service";

@Injectable()
export class UpdateFeatureFlagService {
  private readonly logger = new Logger(UpdateFeatureFlagService.name);

  constructor(
    private readonly repository: FeatureFlagsRepository,
    private readonly getService: GetFeatureFlagsService,
  ) {}

  async update(
    key: string,
    dto: UpdateFeatureFlagDto,
  ): Promise<FeatureFlagResponseDto> {
    const flag = await this.getService.findEntityOrFail(key);

    if (dto.key !== undefined && dto.key !== flag.key) {
      if (await this.repository.findByKey(dto.key)) {
        throw new ResourceConflictException(
          `Já existe uma feature flag com a chave "${dto.key}"`,
        );
      }
      flag.key = dto.key;
    }

    if (dto.name !== undefined) flag.name = dto.name;
    if (dto.description !== undefined) flag.description = dto.description;
    if (dto.enabled !== undefined) flag.enabled = dto.enabled;
    if (dto.environment !== undefined) flag.environment = dto.environment;

    if (dto.metadata !== undefined || dto.targetRoles !== undefined) {
      flag.metadata = metadataWithTargetRoles(
        dto.metadata !== undefined ? dto.metadata : publicMetadataOf(flag),
        dto.targetRoles ?? targetRolesOf(flag),
      );
    }

    const saved = await this.repository.save(flag);
    this.getService.invalidate(key);
    if (saved.key !== key) this.getService.invalidate(saved.key);

    this.logger.log(
      saved.key === key
        ? `Feature flag atualizada: ${key}`
        : `Feature flag renomeada: ${key} -> ${saved.key}`,
    );
    return toFeatureFlagResponse(saved);
  }

  async toggle(key: string): Promise<FeatureFlagResponseDto> {
    const flag = await this.getService.findEntityOrFail(key);
    flag.enabled = !flag.enabled;

    const saved = await this.repository.save(flag);
    this.getService.invalidate(key);
    this.logger.log(
      `Feature flag ${saved.enabled ? "ligada" : "desligada"}: ${key}`,
    );
    return toFeatureFlagResponse(saved);
  }
}
