import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
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
import { CreateAtendenteDto } from '../dto/create-atendente.dto';
import { AtendenteResponseDto } from '../dto/atendente-response.dto';
import { AtendenteEntity } from '../entities/atendente.entity';
import { AttendableType } from '../entities/attendable-type.enum';

@Injectable()
export class CreateAtendenteService {
  private readonly logger = new Logger(CreateAtendenteService.name);

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
    dto: CreateAtendenteDto,
    file?: Express.Multer.File,
  ): Promise<AtendenteResponseDto> {
    const hasNoLink = !dto.attendableType && !dto.attendableId;
    if (hasNoLink && !dto.name?.trim()) {
      throw new BadRequestException(
        'Nome é obrigatório quando o antecedente não está vinculado a integração ou usuário.',
      );
    }
    await this.validateAttendable(dto.attendableType, dto.attendableId);

    if (dto.attendableType && dto.attendableId) {
      const existing = await this.atendenteRepo.findByAttendable(
        dto.attendableType,
        dto.attendableId,
      );
      if (existing) {
        throw new BadRequestException(
          'Já existe um antecedente criminal vinculado a este usuário ou integração. Não é permitido criar mais de um por vínculo.',
        );
      }
    }

    const atendente = await this.atendenteRepo.create({
      name: dto.name,
      attendableType: dto.attendableType ?? null,
      attendableId: dto.attendableId ?? null,
    });

    if (!dto.pdf?.isLocalFile || !file) {
      throw new BadRequestException('PDF file is required for antecedente criminal.');
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
      atendente.id,
      MediaTargetType.Atendente,
    );
    const savedMedia = await this.mediaProcessor.saveMediaItem(mediaEntity);

    const displayName = await this.resolveAttendableDisplayName(
      atendente.attendableType,
      atendente.attendableId,
    );
    return AtendenteResponseDto.fromEntity(atendente, savedMedia, displayName);
  }

  private async validateAttendable(
    attendableType?: AttendableType | null,
    attendableId?: string | null,
  ): Promise<void> {
    if (!attendableType && !attendableId) return;
    if (attendableType && !attendableId) {
      throw new BadRequestException('attendableId is required when attendableType is set.');
    }
    if (attendableId && !attendableType) {
      throw new BadRequestException('attendableType is required when attendableId is set.');
    }
    if (attendableType === AttendableType.INTEGRATION) {
      const exists = await this.integrationRepo.findOne({ where: { id: attendableId! } });
      if (!exists) throw new NotFoundException(`Integration with id ${attendableId} not found.`);
    } else if (attendableType === AttendableType.USER) {
      const exists = await this.userRepo.findOne({ where: { id: attendableId! } });
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
