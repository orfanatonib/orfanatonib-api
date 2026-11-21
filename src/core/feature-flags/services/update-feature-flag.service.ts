import { Injectable, Logger } from "@nestjs/common";

import {
  ResourceConflictException,
  RuleException,
} from "src/common/exceptions";
import {
  FEATURE_FLAG_PROTECTED_CODE,
  FEATURE_FLAG_VERSION_CONFLICT_CODE,
} from "../constants";
import { FeatureFlagEntity } from "../entities/feature-flag.entity";
import { SetFeatureFlagEnabledDto } from "../dto/set-feature-flag-enabled.dto";

import { UpdateFeatureFlagDto } from "../dto/update-feature-flag.dto";
import { FeatureFlagResponseDto } from "../dto/feature-flag-response.dto";
import { FeatureFlagsRepository } from "../feature-flags.repository";
import { toFeatureFlagResponse } from "../mappers";
import {
  isProtectedFlag,
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
    // `@IsOptional` aceita null; name/enabled/key são NOT NULL no banco (senão seria 500).
    for (const field of ["key", "name", "enabled"] as const) {
      if (dto[field] === null) {
        throw new RuleException(`O campo "${field}" não pode ser nulo`);
      }
    }
    const flag = await this.getService.findEntityOrFail(key);
    this.assertVersion(flag, dto.expectedVersion);

    if (dto.key !== undefined && dto.key !== flag.key) {
      // O boot recria a chave original: renomear só gera flag duplicada e código sem flag.
      if (isProtectedFlag(flag)) {
        throw new ResourceConflictException(
          `A chave da flag de fábrica "${flag.key}" não pode ser renomeada`,
          { code: FEATURE_FLAG_PROTECTED_CODE, key: flag.key },
        );
      }
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

  /**
   * Estado desejado (idempotente): repetir a mesma chamada não muda nada e não
   * incrementa a versão. Com `expectedVersion`, só grava se a flag não mudou
   * desde a leitura — senão 409 `FEATURE_FLAG_VERSION_CONFLICT`.
   */
  async setEnabled(
    key: string,
    dto: SetFeatureFlagEnabledDto,
  ): Promise<FeatureFlagResponseDto> {
    const flag = await this.getService.findEntityOrFail(key);
    if (flag.enabled === dto.enabled) return toFeatureFlagResponse(flag);

    if (dto.expectedVersion !== undefined) {
      const written = await this.repository.setEnabledIfVersion(
        flag.id,
        dto.enabled,
        dto.expectedVersion,
      );
      if (!written) throw this.versionConflict(flag, dto.expectedVersion);
    } else {
      flag.enabled = dto.enabled;
      await this.repository.save(flag);
    }

    this.getService.invalidate(key);
    this.logger.log(
      `Feature flag ${dto.enabled ? "ligada" : "desligada"}: ${key}`,
    );
    return this.getService.findOne(key);
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

  private assertVersion(flag: FeatureFlagEntity, expected?: number): void {
    if (expected !== undefined && expected !== flag.version) {
      throw this.versionConflict(flag, expected);
    }
  }

  private versionConflict(
    flag: FeatureFlagEntity,
    expected: number,
  ): ResourceConflictException {
    return new ResourceConflictException(
      `A flag "${flag.key}" foi alterada por outra pessoa; recarregue e tente de novo`,
      {
        code: FEATURE_FLAG_VERSION_CONFLICT_CODE,
        key: flag.key,
        expectedVersion: expected,
        currentVersion: flag.version,
      },
    );
  }
}
