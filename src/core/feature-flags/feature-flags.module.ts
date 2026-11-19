import { Global, Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { FeatureFlagsController } from "./feature-flags.controller";
import { FeatureFlagsCoreModule } from "./feature-flags-core.module";
import { FeatureFlagGuard } from "./guards/feature-flag.guard";
import { CreateFeatureFlagService } from "./services/create-feature-flag.service";
import { DeleteFeatureFlagService } from "./services/delete-feature-flag.service";
import { UpdateFeatureFlagService } from "./services/update-feature-flag.service";

/**
 * Global: o `FeatureFlagGuard` é usado por `@UseGuards` em dezenas de
 * controllers e precisa resolver `GetFeatureFlagsService` e
 * `AuthContextService` no módulo de cada um.
 */
@Global()
@Module({
  imports: [FeatureFlagsCoreModule, AuthModule],
  controllers: [FeatureFlagsController],
  providers: [
    CreateFeatureFlagService,
    UpdateFeatureFlagService,
    DeleteFeatureFlagService,
    FeatureFlagGuard,
  ],
  exports: [FeatureFlagsCoreModule, FeatureFlagGuard, AuthModule],
})
export class FeatureFlagsModule {}
