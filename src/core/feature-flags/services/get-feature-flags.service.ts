import { Injectable, Logger, Optional } from "@nestjs/common";

import { ResourceNotFoundException } from "src/common/exceptions";
import { UserRole } from "src/core/auth/auth.types";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import { SortOrder } from "src/shared/enums/sort-order.enum";

import {
  FEATURE_FLAGS_CACHE_TTL_MS,
  FEATURE_FLAGS_DEFAULT_LIMIT,
  FEATURE_FLAGS_INTERNAL_CACHE_TTL_MS,
  FEATURE_FLAGS_DEFAULT_PAGE,
  FEATURE_FLAG_MAP_CACHE_SCOPE,
  FEATURE_FLAG_SWITCH_CACHE_SCOPE,
  isInternalFeatureFlag,
} from "../constants";
import { FeatureFlagResponseDto } from "../dto/feature-flag-response.dto";
import { FeatureFlagStatsDto } from "../dto/feature-flag-stats.dto";
import { QueryFeatureFlagsDto } from "../dto/query-feature-flags.dto";
import { FeatureFlagEntity } from "../entities/feature-flag.entity";
import { FeatureFlagsRepository } from "../feature-flags.repository";
import { toFeatureFlagResponse } from "../mappers";
import { FeatureFlagsInvalidationBus } from "./feature-flags-invalidation.bus";
import { FeatureFlagAudience } from "../types";
import {
  audienceOfRoles,
  catalogDefaultFor,
  isTargetedForRole,
  targetRolesOf,
} from "../utils";

@Injectable()
export class GetFeatureFlagsService {
  private readonly logger = new Logger(GetFeatureFlagsService.name);
  private readonly cache = new Map<
    string,
    { enabled: boolean; timestamp: number }
  >();
  /** O mapa é uma resposta inteira, não um booleano: cache separado. */
  private readonly mapCache = new Map<
    string,
    { map: Record<string, boolean>; timestamp: number }
  >();

  constructor(
    private readonly repository: FeatureFlagsRepository,
    @Optional() private readonly bus?: FeatureFlagsInvalidationBus,
  ) {
    // Mudança feita em OUTRA instância: descarta só o cache local (sem eco).
    this.bus?.onRemoteInvalidation((key) => this.clearLocal(key));
  }

  async findEntityOrFail(key: string): Promise<FeatureFlagEntity> {
    const flag = await this.repository.findByKey(key);
    if (!flag) {
      this.logger.warn(`Feature flag não encontrada: ${key}`);
      throw new ResourceNotFoundException(
        `Feature flag "${key}" não encontrada`,
      );
    }
    return flag;
  }

  async findOne(key: string): Promise<FeatureFlagResponseDto> {
    return toFeatureFlagResponse(await this.findEntityOrFail(key));
  }

  async findAllPaginated(
    query: QueryFeatureFlagsDto,
  ): Promise<PaginatedResponseDto<FeatureFlagResponseDto>> {
    const page = query.page ?? FEATURE_FLAGS_DEFAULT_PAGE;
    const limit = query.limit ?? FEATURE_FLAGS_DEFAULT_LIMIT;

    if (query.audience) {
      const flags = await this.repository.findAllFiltered(query);
      const matching = flags.filter(
        (flag) => audienceOfRoles(targetRolesOf(flag)) === query.audience,
      );
      const start = (page - 1) * limit;

      return {
        data: matching.slice(start, start + limit).map(toFeatureFlagResponse),
        meta: {
          page,
          limit,
          totalItems: matching.length,
          totalPages: Math.ceil(matching.length / limit),
          orderBy: query.sort,
          order: query.order === "DESC" ? SortOrder.DESC : SortOrder.ASC,
        },
      };
    }

    const { items, total } = await this.repository.findAllPaginated(query);
    return {
      data: items.map(toFeatureFlagResponse),
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        orderBy: query.sort,
        order: query.order === "DESC" ? SortOrder.DESC : SortOrder.ASC,
      },
    };
  }

  async getStats(): Promise<FeatureFlagStatsDto> {
    const flags = await this.repository.findAll();
    const byAudience: Record<FeatureFlagAudience, number> = {
      EVERYONE: 0,
      ADMIN: 0,
      LEADER: 0,
      MEMBER: 0,
      ADMIN_LEADER: 0,
      ADMIN_MEMBER: 0,
      LEADER_MEMBER: 0,
      ALL_ROLES: 0,
    };

    let enabled = 0;
    for (const flag of flags) {
      if (flag.enabled) enabled += 1;
      byAudience[audienceOfRoles(targetRolesOf(flag))] += 1;
    }

    return {
      total: flags.length,
      enabled,
      disabled: flags.length - enabled,
      byAudience,
    };
  }

  /**
   * Decisão efetiva de cada flag **de interface** para o papel do ator.
   *
   * As operacionais de e-mail ficam de fora: a rota é pública e devolvia, a
   * qualquer visitante anônimo, o catálogo inteiro de envios do servidor —
   * inclusive que a chave-mestra estava desligada.
   *
   * O resultado é memorizado porque esta é a consulta que toda carga da
   * aplicação dispara, sem autenticação.
   */
  async getFlagsMap(role?: UserRole | null): Promise<Record<string, boolean>> {
    const cacheKey = `${FEATURE_FLAG_MAP_CACHE_SCOPE}:${role ?? "anonymous"}`;
    const cached = this.readMapCache(cacheKey);
    if (cached) return cached;

    const flags = await this.repository.findAll();
    const map = Object.fromEntries(
      flags
        .filter((flag) => !isInternalFeatureFlag(flag.key))
        .map((flag) => [flag.key, isTargetedForRole(flag, role)]),
    );

    this.mapCache.set(cacheKey, { map, timestamp: Date.now() });
    return map;
  }

  async isEnabledForRole(
    key: string,
    role?: UserRole | null,
  ): Promise<boolean> {
    const cacheKey = `${key}:role:${role ?? "anonymous"}`;
    const cached = this.readCache(cacheKey);
    if (cached !== undefined) return cached;

    const flag = await this.repository.findByKey(key);
    return this.writeCache(
      cacheKey,
      flag ? isTargetedForRole(flag, role) : catalogDefaultFor(key, role),
    );
  }

  async isEnabled(key: string): Promise<boolean> {
    return this.isEnabledOrDefault(key, catalogDefaultFor(key));
  }

  async isEnabledOrDefault(
    key: string,
    defaultValue: boolean,
  ): Promise<boolean> {
    const cacheKey = `${key}:${FEATURE_FLAG_SWITCH_CACHE_SCOPE}:${defaultValue}`;
    const cached = this.readCache(cacheKey);
    if (cached !== undefined) return cached;

    const state = await this.repository.findEnabledState(key);
    return this.writeCache(cacheKey, state ?? defaultValue);
  }

  invalidate(key: string): void {
    this.clearLocal(key);
    this.bus?.publish(key);
  }

  invalidateAll(): void {
    this.clearLocal(null);
    this.bus?.publish(null);
  }

  /** `key = null` limpa tudo. Não publica: serve à escrita local e ao eco remoto. */
  private clearLocal(key: string | null): void {
    if (key === null) {
      this.cache.clear();
    } else {
      for (const cacheKey of this.cache.keys()) {
        if (cacheKey.startsWith(`${key}:`)) this.cache.delete(cacheKey);
      }
    }
    // O mapa é por papel, não por chave: qualquer alteração o invalida inteiro.
    this.mapCache.clear();
  }

  /** Flag operacional (`email_*`) vale em segundos em qualquer instância. */
  private ttlFor(cacheKey: string): number {
    const flagKey = cacheKey.slice(0, cacheKey.indexOf(":"));
    return isInternalFeatureFlag(flagKey)
      ? FEATURE_FLAGS_INTERNAL_CACHE_TTL_MS
      : FEATURE_FLAGS_CACHE_TTL_MS;
  }

  private readMapCache(key: string): Record<string, boolean> | undefined {
    const cached = this.mapCache.get(key);
    if (!cached) return undefined;
    if (Date.now() - cached.timestamp >= FEATURE_FLAGS_CACHE_TTL_MS) {
      this.mapCache.delete(key);
      return undefined;
    }
    return cached.map;
  }

  private readCache(key: string): boolean | undefined {
    const cached = this.cache.get(key);
    if (!cached) return undefined;
    if (Date.now() - cached.timestamp >= this.ttlFor(key)) {
      this.cache.delete(key);
      return undefined;
    }
    return cached.enabled;
  }

  private writeCache(key: string, enabled: boolean): boolean {
    this.cache.set(key, { enabled, timestamp: Date.now() });
    return enabled;
  }
}
