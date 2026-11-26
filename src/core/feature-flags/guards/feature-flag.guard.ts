import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { AccessDeniedException } from "src/common/exceptions";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import { normalizeRole } from "src/core/auth/utils/auth-token.util";

import {
  FEATURE_FLAG_KEY,
  FeatureFlagMetadata,
  isFeatureFlagAnyOf,
} from "../decorators/feature-flag.decorator";
import { FEATURE_DISABLED_CODE } from "../constants";
import { GetFeatureFlagsService } from "../services/get-feature-flags.service";

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlags: GetFeatureFlagsService,
    private readonly authContext: AuthContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Método vence a classe: o decorator vale em qualquer dos dois níveis.
    const metadata = this.reflector.getAllAndOverride<
      FeatureFlagMetadata | undefined
    >(FEATURE_FLAG_KEY, [context.getHandler(), context.getClass()]);
    if (!metadata) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { role?: string } }>();
    // `request.user` só existe depois do JwtAuthGuard; em rota pública (ou se
    // este guard rodar antes) o perfil vem do próprio token, para a decisão não
    // depender da ordem dos guards.
    const role = request?.user
      ? normalizeRole(request.user.role)
      : await this.authContext.getRole(request);

    const anyOf = isFeatureFlagAnyOf(metadata);
    const keys: readonly string[] = anyOf
      ? metadata.anyOf
      : Array.isArray(metadata)
        ? (metadata as readonly string[])
        : [metadata as string];

    // Chave ligada E a audiência (papel) da flag inclui o ator.
    const enabled = await Promise.all(
      keys.map(
        async (key) =>
          (await this.featureFlags.isEnabled(key)) &&
          (await this.featureFlags.isEnabledForRole(key, role ?? null)),
      ),
    );

    if (anyOf ? enabled.some(Boolean) : enabled.every(Boolean)) return true;

    throw new AccessDeniedException(
      `A funcionalidade "${keys.join(", ")}" está temporariamente indisponível`,
      { code: FEATURE_DISABLED_CODE },
    );
  }
}
