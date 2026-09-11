import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "src/core/auth/auth.module";
import { AddressesModule } from "../address/addresses.module";
import { SheltersModule } from "../shelter/shelters.module";
import { ShelteredController } from "./sheltered.controller";
import { ShelteredEntity } from "./entities/sheltered.entity";
import { ShelteredRepository } from "./repositories/sheltered.repository";
import { CreateShelteredService } from "./services/create-sheltered.service";
import { GetShelteredService } from "./services/get-sheltered.service";
import { UpdateShelteredService } from "./services/update-sheltered.service";
import { DeleteShelteredService } from "./services/delete-sheltered.service";
import { ShelteredShelterAccessService } from "./services/sheltered-shelter-access.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ShelteredEntity]),
    AddressesModule,
    forwardRef(() => SheltersModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [ShelteredController],
  providers: [
    ShelteredRepository,
    ShelteredShelterAccessService,
    CreateShelteredService,
    GetShelteredService,
    UpdateShelteredService,
    DeleteShelteredService,
  ],
  exports: [
    ShelteredRepository,
    CreateShelteredService,
    GetShelteredService,
    UpdateShelteredService,
    DeleteShelteredService,
  ],
})
export class ShelteredModule {}
