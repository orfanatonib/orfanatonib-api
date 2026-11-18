import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";

import { AccessDeniedException } from "src/common/exceptions";
import { normalizeRole } from "src/core/auth/utils/auth-token.util";

import {
  FEATURE_FLAG_KEY,
  FeatureFlagMetadata,
} from "../decorators/feature-flag.decorator";
import { GetFeatureFlagsService } from "../services/get-feature-flags.service";

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlags: GetFeatureFlagsService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Método vence a classe: o decorator vale em qualquer dos dois níveis.
    const metadata = this.reflector.getAllAndOverride<
      FeatureFlagMetadata | undefined
    >(FEATURE_FLAG_KEY, [context.getHandler(), context.getClass()]);
    if (!metadata) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();
    const role = normalizeRole(request?.user?.role);

    const keys = Array.isArray(metadata) ? metadata : [metadata];

    const environment = this.configService.get<string>("ENVIRONMENT");
    // Chave ligada no ambiente E a audiência (papel) da flag inclui o ator.
    const enabled = await Promise.all(
      keys.map(
        async (key) =>
          (await this.featureFlags.isEnabled(key, environment)) &&
          (await this.featureFlags.isEnabledForRole(key, role ?? null)),
      ),
    );

    if (enabled.every(Boolean)) return true;

    throw new AccessDeniedException(
      `A funcionalidade "${keys.join(", ")}" está temporariamente indisponível`,
    );
  }
}
