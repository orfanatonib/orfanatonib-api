import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { FeatureFlagEntity } from "./entities/feature-flag.entity";
import { FeatureFlagsRepository } from "./feature-flags.repository";
import { GetFeatureFlagsService } from "./services/get-feature-flags.service";

@Module({
  imports: [TypeOrmModule.forFeature([FeatureFlagEntity])],
  providers: [FeatureFlagsRepository, GetFeatureFlagsService],
  exports: [FeatureFlagsRepository, GetFeatureFlagsService],
})
export class FeatureFlagsCoreModule {}
