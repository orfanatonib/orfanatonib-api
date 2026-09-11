import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

import { ResourceConflictException } from "src/common/exceptions";

import { DEFAULT_FEATURE_FLAGS, RETIRED_FEATURE_FLAGS } from "../constants";
import { CreateFeatureFlagDto } from "../dto/create-feature-flag.dto";
import { FeatureFlagResponseDto } from "../dto/feature-flag-response.dto";
import { FeatureFlagEntity } from "../entities/feature-flag.entity";
import { FeatureFlagsRepository } from "../feature-flags.repository";
import { toFeatureFlagResponse, toFeatureFlagResponseList } from "../mappers";
import { metadataWithTargetRoles } from "../utils";
import { GetFeatureFlagsService } from "./get-feature-flags.service";

@Injectable()
export class CreateFeatureFlagService implements OnModuleInit {
  private readonly logger = new Logger(CreateFeatureFlagService.name);

  constructor(
    private readonly repository: FeatureFlagsRepository,
    private readonly getService: GetFeatureFlagsService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.synchronizeCatalog();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falha ao conferir as feature flags: ${message}`);
    }
  }

  async synchronizeCatalog(): Promise<{
    created: FeatureFlagResponseDto[];
    retired: string[];
  }> {
    return {
      created: await this.seedDefaults(),
      retired: await this.retireLegacyFlags(),
    };
  }

  async create(dto: CreateFeatureFlagDto): Promise<FeatureFlagResponseDto> {
    if (await this.repository.findByKey(dto.key)) {
      throw new ResourceConflictException(
        `Já existe uma feature flag com a chave "${dto.key}"`,
      );
    }

    const flag = this.repository.create({
      key: dto.key,
      name: dto.name,
      description: dto.description ?? null,
      enabled: dto.enabled ?? false,
      environment: dto.environment ?? null,
      metadata: metadataWithTargetRoles(dto.metadata, dto.targetRoles),
    });

    const saved = await this.repository.save(flag);
    this.getService.invalidate(saved.key);
    this.logger.log(`Feature flag criada: ${saved.key}`);
    return toFeatureFlagResponse(saved);
  }

  async seedDefaults(): Promise<FeatureFlagResponseDto[]> {
    const created: FeatureFlagEntity[] = [];

    for (const definition of DEFAULT_FEATURE_FLAGS) {
      if (await this.repository.findByKey(definition.key)) continue;

      const flag = this.repository.create({
        key: definition.key,
        name: definition.name,
        description: definition.description,
        enabled: definition.enabled,
        environment: null,
        metadata: metadataWithTargetRoles(null, definition.targetRoles),
      });
      created.push(await this.repository.save(flag));
      this.logger.log(`Feature flag de fábrica criada: ${definition.key}`);
    }

    if (created.length > 0) this.getService.invalidateAll();
    return toFeatureFlagResponseList(created);
  }

  async retireLegacyFlags(): Promise<string[]> {
    const retired: string[] = [];

    for (const key of RETIRED_FEATURE_FLAGS) {
      const flag = await this.repository.findByKey(key);
      if (!flag) continue;

      await this.repository.remove(flag);
      retired.push(key);
    }

    if (retired.length > 0) this.getService.invalidateAll();
    return retired;
  }
}
