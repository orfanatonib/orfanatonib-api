import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrivateMediaUrlService } from "src/shared/media/storage/private-media-url.service";
import { AtendentePdfService } from "./atendente-pdf.service";
import { AtendenteEntity } from "../entities/atendente.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
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
    private readonly pdfs: AtendentePdfService,
    private readonly privateUrls: PrivateMediaUrlService,
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

    // Cadastro e PDFs se gravam na MESMA transação; os arquivos sobem antes, num lote descartável. Falhou em qualquer
    // PDF ⇒ nada fica: nem linha, nem cadastro, nem objeto no bucket.
    const batch = this.pdfs.newBatch();
    let atendente: AtendenteEntity;
    try {
      atendente = await this.atendenteRepo.runInTransaction(async (manager) => {
        const unit = { manager, batch, obsoleteUrls: [] };
        const created = await this.atendenteRepo.create(
          {
            name: dto.name,
            attendableType: dto.attendableType ?? null,
            attendableId: dto.attendableId ?? null,
          },
          manager,
        );
        if (hasEstadual) {
          await this.pdfs.store(
            created.id,
            MediaTargetType.AtendenteEstadual,
            {
              file: files.estadual!,
              title: dto.pdfEstadual?.title,
              description: dto.pdfEstadual?.description,
            },
            unit,
          );
        }
        if (hasFederal) {
          await this.pdfs.store(
            created.id,
            MediaTargetType.AtendenteFederal,
            {
              file: files.federal!,
              title: dto.pdfFederal?.title,
              description: dto.pdfFederal?.description,
            },
            unit,
          );
        }
        return created;
      });
    } catch (error) {
      await batch.discard();
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
      await this.privateUrls.withReadableUrl(pdfEstadual),
      await this.privateUrls.withReadableUrl(pdfFederal),
      displayName,
    );
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
