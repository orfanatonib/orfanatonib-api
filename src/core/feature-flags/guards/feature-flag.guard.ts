import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";

import { AccessDeniedException } from "src/common/exceptions";

import { FEATURE_FLAG_KEY } from "../decorators/feature-flag.decorator";
import { GetFeatureFlagsService } from "../services/get-feature-flags.service";

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlags: GetFeatureFlagsService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.get<string>(
      FEATURE_FLAG_KEY,
      context.getHandler(),
    );
    if (!key) return true;

    const environment = this.configService.get<string>("ENVIRONMENT");
    if (await this.featureFlags.isEnabled(key, environment)) return true;

    throw new AccessDeniedException(
      `A funcionalidade "${key}" está temporariamente indisponível`,
    );
  }
}
