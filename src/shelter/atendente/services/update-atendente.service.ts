import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import {
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { AtendenteRepository } from "../atendente.repository";
import { UpdateAtendenteDto } from "../dto/update-atendente.dto";
import { AtendenteResponseDto } from "../dto/atendente-response.dto";
import type { AtendenteFiles } from "./create-atendente.service";
import { AttendableType } from "../entities/attendable-type.enum";

@Injectable()
export class UpdateAtendenteService {
  private readonly logger = new Logger(UpdateAtendenteService.name);

  constructor(
    private readonly atendenteRepo: AtendenteRepository,
    private readonly mediaProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  async execute(
    id: string,
    dto: UpdateAtendenteDto,
    files?: AtendenteFiles,
  ): Promise<AtendenteResponseDto> {
    const atendente = await this.atendenteRepo.findById(id);
    if (!atendente) {
      throw new NotFoundException(
        `Antecedente criminal with id ${id} not found.`,
      );
    }

    await this.validateAttendable(dto.attendableType, dto.attendableId);

    const updateData: Partial<typeof atendente> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.attendableType !== undefined)
      updateData.attendableType = dto.attendableType;
    if (dto.attendableId !== undefined)
      updateData.attendableId = dto.attendableId;

    const updated = await this.atendenteRepo.update(id, updateData);
    if (!updated)
      throw new InternalServerErrorException(
        "Failed to update antecedente criminal.",
      );

    const [hadEstadual, hadFederal] = await Promise.all([
      this.mediaProcessor.findMediaItemByTarget(
        id,
        MediaTargetType.AtendenteEstadual,
      ),
      this.mediaProcessor.findMediaItemByTarget(
        id,
        MediaTargetType.AtendenteFederal,
      ),
    ]);

    const estadualRemains =
      (!!hadEstadual && !dto.removePdfEstadual) || !!files?.estadual;
    const federalRemains =
      (!!hadFederal && !dto.removePdfFederal) || !!files?.federal;
    if (!estadualRemains && !federalRemains) {
      throw new BadRequestException(
        "É obrigatório manter pelo menos um PDF (Estadual ou Federal). Remova apenas um para trocar por outro.",
      );
    }

    if (dto.removePdfEstadual && hadEstadual) {
      await this.removePdf(id, MediaTargetType.AtendenteEstadual, hadEstadual);
    }
    if (dto.removePdfFederal && hadFederal) {
      await this.removePdf(id, MediaTargetType.AtendenteFederal, hadFederal);
    }

    if (files?.estadual) {
      await this.replacePdf(
        id,
        MediaTargetType.AtendenteEstadual,
        files.estadual,
        dto.pdfEstadual?.title,
        dto.pdfEstadual?.description,
      );
    }
    if (files?.federal) {
      await this.replacePdf(
        id,
        MediaTargetType.AtendenteFederal,
        files.federal,
        dto.pdfFederal?.title,
        dto.pdfFederal?.description,
      );
    }

    const [pdfEstadual, pdfFederal] = await Promise.all([
      this.mediaProcessor.findMediaItemByTarget(
        id,
        MediaTargetType.AtendenteEstadual,
      ),
      this.mediaProcessor.findMediaItemByTarget(
        id,
        MediaTargetType.AtendenteFederal,
      ),
    ]);
    const displayName = await this.resolveAttendableDisplayName(
      updated.attendableType,
      updated.attendableId,
    );
    return AtendenteResponseDto.fromEntity(
      updated,
      pdfEstadual,
      pdfFederal,
      displayName,
    );
  }

  private async removePdf(
    atendenteId: string,
    targetType: MediaTargetType,
    existing: Awaited<ReturnType<MediaItemProcessor["findMediaItemByTarget"]>>,
  ): Promise<void> {
    if (!existing) return;
    const urls = await this.mediaProcessor.removeMediaItemsKeepingFiles([
      existing,
    ]);
    await this.mediaStorage.deleteAfterCommit(urls);
  }
  private async replacePdf(
    atendenteId: string,
    targetType: MediaTargetType,
    file: Express.Multer.File,
    title?: string,
    description?: string,
  ): Promise<void> {
    const existing = await this.mediaProcessor.findMediaItemByTarget(
      atendenteId,
      targetType,
    );

    // novo → banco → só então apaga o antigo; falha descarta o novo e mantém o antigo.
    const batch = this.mediaStorage.newBatch();
    try {
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
      await this.mediaProcessor.saveMediaItem(mediaEntity);
    } catch (error) {
      await batch.discard();
      throw error;
    }
    batch.commit();

    if (existing) {
      const urls = await this.mediaProcessor.removeMediaItemsKeepingFiles([
        existing,
      ]);
      await this.mediaStorage.deleteAfterCommit(urls);
      this.logger.log(
        `Replaced PDF for antecedente ${atendenteId} (${targetType}); old object queued for removal`,
      );
    }
  }

  private async validateAttendable(
    attendableType?: AttendableType | null,
    attendableId?: string | null,
  ): Promise<void> {
    if (attendableType === null || attendableType === undefined) return;
    if (!attendableId) {
      throw new BadRequestException(
        "attendableId is required when attendableType is set.",
      );
    }
    if (attendableType === AttendableType.INTEGRATION) {
      const exists = await this.atendenteRepo.findIntegrationById(attendableId);
      if (!exists)
        throw new NotFoundException(
          `Integration with id ${attendableId} not found.`,
        );
    } else if (attendableType === AttendableType.USER) {
      const exists = await this.atendenteRepo.findUserById(attendableId);
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
