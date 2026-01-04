import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShelteredController } from './sheltered.controller';
import { ShelteredService } from './sheltered.service';
import { ShelterEntity } from '../shelter/entities/shelter.entity/shelter.entity';
import { AddressEntity } from '../address/entities/address.entity/address.entity';
import { ShelteredEntity } from './entities/sheltered.entity';
import { ShelteredRepository } from './repositories/sheltered.repository';
import { AddressesModule } from '../address/addresses.module';
import { SheltersModule } from '../shelter/shelters.module';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShelteredEntity, ShelterEntity, AddressEntity]),
    AddressesModule,
    forwardRef(() => SheltersModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [ShelteredController],
  providers: [ShelteredService, ShelteredRepository],
  exports: [ShelteredService, ShelteredRepository],
})
export class ShelteredModule { }
