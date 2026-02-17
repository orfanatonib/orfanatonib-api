import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { MediaType, UploadType } from 'src/shared/media/media-item/media-item.entity';
import { MediaTargetType } from 'src/shared/media/media-target-type.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationEntity } from 'src/shelter/integration/entities/integration.entity';
import { UserEntity } from 'src/core/user/entities/user.entity';
import { AtendenteRepository } from '../atendente.repository';
import { UpdateAtendenteDto } from '../dto/update-atendente.dto';
import { AtendenteResponseDto } from '../dto/atendente-response.dto';
import { AttendableType } from '../entities/attendable-type.enum';

@Injectable()
export class UpdateAtendenteService {
  private readonly logger = new Logger(UpdateAtendenteService.name);

  constructor(
    private readonly atendenteRepo: AtendenteRepository,
    private readonly mediaProcessor: MediaItemProcessor,
    private readonly s3Service: AwsS3Service,
    @InjectRepository(IntegrationEntity)
    private readonly integrationRepo: Repository<IntegrationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async execute(
    id: string,
    dto: UpdateAtendenteDto,
    file?: Express.Multer.File,
  ): Promise<AtendenteResponseDto> {
    const atendente = await this.atendenteRepo.findById(id);
    if (!atendente) {
      throw new NotFoundException(`Antecedente criminal with id ${id} not found.`);
    }

    await this.validateAttendable(dto.attendableType, dto.attendableId);

    const newType = dto.attendableType !== undefined ? dto.attendableType : atendente.attendableType;
    const newId = dto.attendableId !== undefined ? dto.attendableId : atendente.attendableId;
    if (newType && newId) {
      const existing = await this.atendenteRepo.findByAttendable(newType, newId);
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          'Já existe um antecedente criminal vinculado a este usuário ou integração. Não é permitido criar mais de um por vínculo.',
        );
      }
    }

    const updateData: Partial<typeof atendente> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.attendableType !== undefined) updateData.attendableType = dto.attendableType;
    if (dto.attendableId !== undefined) updateData.attendableId = dto.attendableId;

    const updated = await this.atendenteRepo.update(id, updateData);
    if (!updated) throw new InternalServerErrorException('Failed to update antecedente criminal.');

    const existingPdf = await this.mediaProcessor.findMediaItemByTarget(
      id,
      MediaTargetType.Atendente,
    );

    if (dto.pdf && file) {
      if (existingPdf) {
        await this.mediaProcessor.deleteMediaItems(
          [existingPdf],
          this.s3Service.delete.bind(this.s3Service),
        );
      }
      let mediaUrl: string;
      try {
        mediaUrl = await this.s3Service.upload(file);
      } catch (error) {
        this.logger.error(`Error uploading PDF: ${file.originalname}`, (error as Error).stack);
        throw new BadRequestException('File upload failed.');
      }
      const mediaEntity = this.mediaProcessor.buildBaseMediaItem(
        {
          title: dto.pdf.title || file.originalname,
          description: dto.pdf.description || '',
          mediaType: MediaType.DOCUMENT,
          uploadType: UploadType.UPLOAD,
          url: mediaUrl,
          isLocalFile: true,
          originalName: file.originalname,
          size: file.size,
        },
        id,
        MediaTargetType.Atendente,
      );
      await this.mediaProcessor.saveMediaItem(mediaEntity);
    }

    const pdfMedia = await this.mediaProcessor.findMediaItemByTarget(
      id,
      MediaTargetType.Atendente,
    );
    const displayName = await this.resolveAttendableDisplayName(
      updated!.attendableType,
      updated!.attendableId,
    );
    return AtendenteResponseDto.fromEntity(updated!, pdfMedia, displayName);
  }

  private async validateAttendable(
    attendableType?: AttendableType | null,
    attendableId?: string | null,
  ): Promise<void> {
    if (attendableType === null || attendableType === undefined) return;
    if (!attendableId) {
      throw new BadRequestException('attendableId is required when attendableType is set.');
    }
    if (attendableType === AttendableType.INTEGRATION) {
      const exists = await this.integrationRepo.findOne({ where: { id: attendableId } });
      if (!exists) throw new NotFoundException(`Integration with id ${attendableId} not found.`);
    } else if (attendableType === AttendableType.USER) {
      const exists = await this.userRepo.findOne({ where: { id: attendableId } });
      if (!exists) throw new NotFoundException(`User with id ${attendableId} not found.`);
    }
  }

  private async resolveAttendableDisplayName(
    attendableType?: AttendableType | null,
    attendableId?: string | null,
  ): Promise<string | undefined> {
    if (!attendableType || !attendableId) return undefined;
    if (attendableType === AttendableType.INTEGRATION) {
      const integration = await this.integrationRepo.findOne({
        where: { id: attendableId },
      });
      return integration?.name ?? undefined;
    }
    if (attendableType === AttendableType.USER) {
      const user = await this.userRepo.findOne({ where: { id: attendableId } });
      return user?.name ?? undefined;
    }
    return undefined;
  }
}
