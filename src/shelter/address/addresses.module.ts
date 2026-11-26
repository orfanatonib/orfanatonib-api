import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AddressesService } from "./services/addresses.service";
import { CreateAddressService } from "./services/create-address.service";
import { GetAddressService } from "./services/get-address.service";
import { UpdateAddressService } from "./services/update-address.service";
import { AddressEntity } from "./entities/address.entity/address.entity";
import { AddressesRepository } from "./repositories/addresses.repository";

@Module({
  imports: [TypeOrmModule.forFeature([AddressEntity])],
  providers: [
    AddressesRepository,
    AddressesService,
    CreateAddressService,
    GetAddressService,
    UpdateAddressService,
  ],
  exports: [
    AddressesService,
    AddressesRepository,
    CreateAddressService,
    GetAddressService,
    UpdateAddressService,
  ],
})
export class AddressesModule {}
