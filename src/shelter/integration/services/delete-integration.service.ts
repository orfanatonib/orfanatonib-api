import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { IntegrationRepository } from '../integration.repository';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';

@Injectable()
export class DeleteIntegrationService {
    private readonly logger = new Logger(DeleteIntegrationService.name);

    constructor(
        private readonly repository: IntegrationRepository,
        private readonly mediaProcessor: MediaItemProcessor,
        private readonly s3Service: AwsS3Service,
    ) { }

    async execute(id: string): Promise<void> {
        const integration = await this.repository.findById(id);
        if (!integration) {
            throw new NotFoundException(`Integration with ID ${id} not found`);
        }

        try {
            // Buscar e deletar mídias associadas
            const mediaItems = await this.mediaProcessor.findMediaItemsByTarget(
                id,
                MediaTargetType.Integration,
            );

            if (mediaItems.length > 0) {
                await this.mediaProcessor.deleteMediaItems(
                    mediaItems,
                    this.s3Service.delete.bind(this.s3Service),
                );
                this.logger.log(`Deleted ${mediaItems.length} media items for integration ${id}`);
            }

            // Deletar a integração
            await this.repository.remove(id);
            this.logger.log(`Integration ${id} deleted successfully`);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Error deleting integration ${id}`, error.stack);
            throw new InternalServerErrorException('Error deleting integration');
        }
    }
}
