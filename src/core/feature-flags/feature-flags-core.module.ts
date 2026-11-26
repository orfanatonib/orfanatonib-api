import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { FeatureFlagEntity } from "./entities/feature-flag.entity";
import { FeatureFlagsRepository } from "./feature-flags.repository";
import { FeatureFlagsInvalidationBus } from "./services/feature-flags-invalidation.bus";
import { GetFeatureFlagsService } from "./services/get-feature-flags.service";

@Module({
  imports: [TypeOrmModule.forFeature([FeatureFlagEntity])],
  providers: [
    FeatureFlagsRepository,
    FeatureFlagsInvalidationBus,
    GetFeatureFlagsService,
  ],
  exports: [
    FeatureFlagsRepository,
    FeatureFlagsInvalidationBus,
    GetFeatureFlagsService,
  ],
})
export class FeatureFlagsCoreModule {}
