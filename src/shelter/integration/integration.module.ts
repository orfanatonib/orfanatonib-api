import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationEntity } from './entities/integration.entity';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { IntegrationRepository } from './integration.repository';
import { MediaModule } from 'src/shared/media/media.module';
import { AwsModule } from 'src/infrastructure/aws/aws.module';
import { UpdateIntegrationService } from './services/update-integration.service';
import { DeleteIntegrationService } from './services/delete-integration.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([IntegrationEntity]),
        MediaModule,
        AwsModule,
    ],
    controllers: [IntegrationController],
    providers: [
        IntegrationService,
        IntegrationRepository,
        UpdateIntegrationService,
        DeleteIntegrationService,
    ],
    exports: [IntegrationService, IntegrationRepository],
})
export class IntegrationModule { }
