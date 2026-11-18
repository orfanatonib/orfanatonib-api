import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import type { UploadBatch } from "src/shared/media/storage/upload-batch";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { AtendenteRepository } from "../atendente.repository";
import { CreateAtendenteDto } from "../dto/create-atendente.dto";
import { AtendenteResponseDto } from "../dto/atendente-response.dto";
import { AttendableType } from "../entities/attendable-type.enum";

export type AtendenteFiles = {
  estadual?: Express.Multer.File;
  federal?: Express.Multer.File;
};

@Injectable()
export class CreateAtendenteService {
  private readonly logger = new Logger(CreateAtendenteService.name);

  constructor(
    private readonly atendenteRepo: AtendenteRepository,
    private readonly mediaProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  async execute(
    dto: CreateAtendenteDto,
    files?: AtendenteFiles,
  ): Promise<AtendenteResponseDto> {
    const hasNoLink = !dto.attendableType && !dto.attendableId;
    if (hasNoLink && !dto.name?.trim()) {
      throw new BadRequestException(
        "Nome é obrigatório quando o antecedente não está vinculado a integração ou usuário.",
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
          "Já existe um antecedente criminal para este vínculo. Edite o existente para adicionar ou trocar PDFs.",
        );
      }
    }

    const hasEstadual = files?.estadual;
    const hasFederal = files?.federal;
    if (!hasEstadual && !hasFederal) {
      throw new BadRequestException(
        'Envie pelo menos um PDF (estadual ou federal) no campo "estadual" ou "federal".',
      );
    }

    const atendente = await this.atendenteRepo.create({
      name: dto.name,
      attendableType: dto.attendableType ?? null,
      attendableId: dto.attendableId ?? null,
    });

    // Criação que falha em qualquer PDF não deixa nada: objetos enviados, linhas e o cadastro.
    const batch = this.mediaStorage.newBatch();
    const savedRows: MediaItemEntity[] = [];
    try {
      if (hasEstadual) {
        savedRows.push(
          await this.uploadAndSavePdf(
            files.estadual!,
            atendente.id,
            MediaTargetType.AtendenteEstadual,
            batch,
            dto.pdfEstadual?.title,
            dto.pdfEstadual?.description,
          ),
        );
      }
      if (hasFederal) {
        savedRows.push(
          await this.uploadAndSavePdf(
            files.federal!,
            atendente.id,
            MediaTargetType.AtendenteFederal,
            batch,
            dto.pdfFederal?.title,
            dto.pdfFederal?.description,
          ),
        );
      }
    } catch (error) {
      await batch.discard();
      await this.mediaProcessor.removeMediaItemsKeepingFiles(savedRows);
      await this.atendenteRepo.remove(atendente.id);
      throw error;
    }
    batch.commit();

    const [pdfEstadual, pdfFederal] = await Promise.all([
      this.mediaProcessor.findMediaItemByTarget(
        atendente.id,
        MediaTargetType.AtendenteEstadual,
      ),
      this.mediaProcessor.findMediaItemByTarget(
        atendente.id,
        MediaTargetType.AtendenteFederal,
      ),
    ]);
    const displayName = await this.resolveAttendableDisplayName(
      atendente.attendableType,
      atendente.attendableId,
    );
    return AtendenteResponseDto.fromEntity(
      atendente,
      pdfEstadual,
      pdfFederal,
      displayName,
    );
  }

  private async uploadAndSavePdf(
    file: Express.Multer.File,
    atendenteId: string,
    targetType: MediaTargetType,
    batch: UploadBatch,
    title?: string,
    description?: string,
  ): Promise<MediaItemEntity> {
    await this.mediaStorage.uploadAll(
      [
        {
          file,
          mediaType: MediaType.DOCUMENT,
          entity: targetType,
          ownerId: atendenteId,
        },
      ],
      batch,
    );
    const uploaded = batch.objects[batch.objects.length - 1];
    const mediaEntity = this.mediaProcessor.buildBaseMediaItem(
      {
        title: title || file.originalname,
        description: description || "",
        mediaType: MediaType.DOCUMENT,
        uploadType: UploadType.UPLOAD,
        url: uploaded.url,
        isLocalFile: true,
        originalName: file.originalname,
        size: file.size,
      },
      atendenteId,
      targetType,
    );
    mediaEntity.storageKey = uploaded.key;
    return this.mediaProcessor.saveMediaItem(mediaEntity);
  }

  private async validateAttendable(
    attendableType?: AttendableType | null,
    attendableId?: string | null,
  ): Promise<void> {
    if (!attendableType && !attendableId) return;
    if (attendableType && !attendableId) {
      throw new BadRequestException(
        "attendableId is required when attendableType is set.",
      );
    }
    if (attendableId && !attendableType) {
      throw new BadRequestException(
        "attendableType is required when attendableId is set.",
      );
    }
    if (attendableType === AttendableType.INTEGRATION) {
      const exists = await this.atendenteRepo.findIntegrationById(
        attendableId!,
      );
      if (!exists)
        throw new NotFoundException(
          `Integration with id ${attendableId} not found.`,
        );
    } else if (attendableType === AttendableType.USER) {
      const exists = await this.atendenteRepo.findUserById(attendableId!);
      if (!exists)
        throw new NotFoundException(`User with id ${attendableId} not found.`);
    }
  }

  private async resolveAttendableDisplayName(
    attendableType?: AttendableType | null,
    attendableId?: string | null,
  ): Promise<string | undefined> {
    if (!attendableType || !attendableId) return undefined;
    if (attendableType === AttendableType.INTEGRATION) {
      const integration =
        await this.atendenteRepo.findIntegrationById(attendableId);
      return integration?.name ?? undefined;
    }
    if (attendableType === AttendableType.USER) {
      const user = await this.atendenteRepo.findUserById(attendableId);
      return user?.name ?? undefined;
    }
    return undefined;
  }
}
