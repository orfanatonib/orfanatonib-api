import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

import { ResourceConflictException } from "src/common/exceptions";

import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_RENAMES,
  RETIRED_FEATURE_FLAGS,
} from "../constants";
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
    // Ordem fixa: copiar o estado das chaves antigas ANTES de semear o que
    // falta (senão a nova nasceria com o padrão e ignoraria o que o admin
    // configurou) e só depois aposentar.
    await this.copyRenamedFlags();
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
      try {
        created.push(await this.repository.save(flag));
        this.logger.log(`Feature flag de fábrica criada: ${definition.key}`);
      } catch (error: unknown) {
        // Outra instância pode ter semeado a mesma chave entre o find e o save
        // (ER_DUP_ENTRY); uma falha não pode impedir as flags seguintes.
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Não foi possível semear a flag ${definition.key}: ${message}`,
        );
      }
    }

    if (created.length > 0) this.getService.invalidateAll();
    return toFeatureFlagResponseList(created);
  }

  /**
   * Cria a chave nova **copiando `enabled` e `targetRoles` da antiga** quando a
   * nova ainda não existe. Idempotente; falha de uma chave não impede as demais.
   * A antiga é mantida (rollout em dois passos — ver `FEATURE_FLAG_RENAMES`).
   */
  async copyRenamedFlags(): Promise<string[]> {
    const copied: string[] = [];

    for (const rename of FEATURE_FLAG_RENAMES) {
      const source = await this.repository.findByKey(rename.from);
      if (!source) continue;

      for (const targetKey of rename.to) {
        try {
          if (await this.repository.findByKey(targetKey)) continue;
          const definition = DEFAULT_FEATURE_FLAGS.find(
            (flag) => flag.key === targetKey,
          );
          await this.repository.save(
            this.repository.create({
              key: targetKey,
              name: definition?.name ?? source.name,
              description: definition?.description ?? source.description,
              enabled: source.enabled,
              environment: source.environment,
              metadata: source.metadata,
            }),
          );
          copied.push(targetKey);
          this.logger.log(
            `Flag ${targetKey} criada copiando o estado de ${rename.from}`,
          );
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Não foi possível copiar ${rename.from} → ${targetKey}: ${message}`,
          );
        }
      }
    }

    if (copied.length > 0) this.getService.invalidateAll();
    return copied;
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
