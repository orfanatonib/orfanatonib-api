import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AtendenteEntity } from './entities/atendente.entity';
import { IntegrationEntity } from 'src/shelter/integration/entities/integration.entity';
import { UserEntity } from 'src/core/user/entities/user.entity';
import { MediaModule } from 'src/shared/media/media.module';
import { AwsModule } from 'src/infrastructure/aws/aws.module';
import { AtendenteController } from './atendente.controller';
import { AtendenteRepository } from './atendente.repository';
import { CreateAtendenteService } from './services/create-atendente.service';
import { UpdateAtendenteService } from './services/update-atendente.service';
import { DeleteAtendenteService } from './services/delete-atendente.service';
import { GetAtendenteService } from './services/get-atendente.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AtendenteEntity, IntegrationEntity, UserEntity]),
    MediaModule,
    AwsModule,
  ],
  controllers: [AtendenteController],
  providers: [
    AtendenteRepository,
    CreateAtendenteService,
    UpdateAtendenteService,
    DeleteAtendenteService,
    GetAtendenteService,
  ],
  exports: [AtendenteRepository, GetAtendenteService],
})
export class AtendenteModule {}
