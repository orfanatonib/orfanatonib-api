import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrivateMediaUrlService } from "src/shared/media/storage/private-media-url.service";
import { AtendentePdfService } from "./atendente-pdf.service";
import { AtendenteEntity } from "../entities/atendente.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
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
    private readonly pdfs: AtendentePdfService,
    private readonly privateUrls: PrivateMediaUrlService,
  ) {}

  async execute(
    id: string,
    dto: UpdateAtendenteDto,
    files?: AtendenteFiles,
  ): Promise<AtendenteResponseDto> {
    // Tudo numa transação com a linha travada (edições simultâneas se enfileiram): cadastro, remoções e trocas de PDF
    // valem juntos ou não valem. Os arquivos novos sobem antes, num lote descartável; os antigos só saem do bucket
    // depois do commit.
    const batch = this.pdfs.newBatch();
    const obsoleteUrls: string[] = [];
    let updated: AtendenteEntity;
    try {
      updated = await this.atendenteRepo.runInTransaction(async (manager) => {
        const atendente = await this.atendenteRepo.lockById(id, manager);
        if (!atendente) {
          throw new NotFoundException(
            `Antecedente criminal with id ${id} not found.`,
          );
        }
        await this.validateAttendable(dto.attendableType, dto.attendableId);
        await this.assertAttendableFree(id, dto);

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

        const updateData: Partial<AtendenteEntity> = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.attendableType !== undefined)
          updateData.attendableType = dto.attendableType;
        if (dto.attendableId !== undefined)
          updateData.attendableId = dto.attendableId;
        const row = await this.atendenteRepo.update(id, updateData, manager);
        if (!row) {
          throw new InternalServerErrorException(
            "Failed to update antecedente criminal.",
          );
        }

        const unit = { manager, batch, obsoleteUrls };
        const slots = [
          {
            target: MediaTargetType.AtendenteEstadual,
            had: hadEstadual,
            remove: dto.removePdfEstadual,
            file: files?.estadual,
            meta: dto.pdfEstadual,
          },
          {
            target: MediaTargetType.AtendenteFederal,
            had: hadFederal,
            remove: dto.removePdfFederal,
            file: files?.federal,
            meta: dto.pdfFederal,
          },
        ];
        for (const slot of slots) {
          if (slot.file) {
            await this.pdfs.store(
              id,
              slot.target,
              {
                file: slot.file,
                title: slot.meta?.title,
                description: slot.meta?.description,
              },
              unit,
              slot.had,
            );
          } else if (slot.remove && slot.had) {
            await this.pdfs.discard([slot.had], unit);
          }
        }
        return row;
      });
    } catch (error) {
      // Falhou: os arquivos novos saem do bucket e os antigos seguem referenciados.
      await batch.discard();
      throw error;
    }
    await this.pdfs.finish({ batch, obsoleteUrls });

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
      await this.privateUrls.withReadableUrl(pdfEstadual),
      await this.privateUrls.withReadableUrl(pdfFederal),
      displayName,
    );
  }

  /** Um antecedente por pessoa: religar este cadastro a quem já tem outro é recusado. */
  private async assertAttendableFree(
    id: string,
    dto: UpdateAtendenteDto,
  ): Promise<void> {
    if (!dto.attendableType || !dto.attendableId) return;
    const existing = await this.atendenteRepo.findByAttendable(
      dto.attendableType,
      dto.attendableId,
    );
    if (existing && existing.id !== id) {
      throw new BadRequestException(
        "Já existe um antecedente criminal para este vínculo. Edite o existente para adicionar ou trocar PDFs.",
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
