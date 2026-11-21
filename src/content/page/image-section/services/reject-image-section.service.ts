import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { NotificationService } from "src/communication/notification/services/notification.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { IMAGE_SECTION_REVIEW_MESSAGES } from "../constants";
import { ImageSectionResponseDto } from "../dto/image-section-response.dto";
import { ImageSectionReviewStatus } from "../enums/image-section-review-status.enum";
import { ImageSectionRepository } from "../repositories/image-section.repository";

const UNTITLED_POST = "Publicação sem título";

/** Reprovação de uma publicação pendente, com motivo obrigatório. */
@Injectable()
export class RejectImageSectionService {
  private readonly logger = new Logger(RejectImageSectionService.name);

  constructor(
    private readonly sectionRepository: ImageSectionRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * Só `PENDING` pode ser reprovada (aprovada → 409). Repetir o pedido numa já
   * reprovada devolve o estado atual, sem alterar o motivo nem reenviar o e-mail.
   */
  async reject(
    id: string,
    reason: string,
    reviewerId: string | null,
  ): Promise<ImageSectionResponseDto> {
    const section = await this.sectionRepository.findOne({
      where: { id },
      relations: ["author"],
    });
    if (!section) {
      throw new NotFoundException(IMAGE_SECTION_REVIEW_MESSAGES.NOT_FOUND);
    }
    if (section.reviewStatus === ImageSectionReviewStatus.APPROVED) {
      throw new ConflictException(
        IMAGE_SECTION_REVIEW_MESSAGES.ALREADY_APPROVED,
      );
    }

    const alreadyRejected =
      section.reviewStatus === ImageSectionReviewStatus.REJECTED;
    if (!alreadyRejected) {
      section.reviewStatus = ImageSectionReviewStatus.REJECTED;
      section.rejectionReason = reason;
      section.reviewedBy = reviewerId ? ({ id: reviewerId } as never) : null;
      section.reviewedAt = new Date();
      await this.sectionRepository.save(section);
    }

    const media = await this.mediaItemProcessor.findManyMediaItemsByTargets(
      [section.id],
      MediaTargetType.ImagesPage,
    );
    if (!alreadyRejected) void this.notifyAuthor(section.id);
    return ImageSectionResponseDto.fromEntity(section, media);
  }

  /** Depois de gravar; falha de e-mail só é logada (com o id, nunca com texto ou endereço). */
  private async notifyAuthor(sectionId: string): Promise<void> {
    try {
      const section = await this.sectionRepository.findOne({
        where: { id: sectionId },
        relations: ["author"],
      });
      const author = section?.author;
      if (!section || !author?.email || !section.rejectionReason) return;
      await this.notifications.sendImageRejectedEmail(
        {
          userName: author.name,
          postCaption: section.caption?.trim() || UNTITLED_POST,
          reason: section.rejectionReason,
        },
        author.email,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Falha no aviso de publicação reprovada (${sectionId}): ${message}`,
      );
    }
  }
}
