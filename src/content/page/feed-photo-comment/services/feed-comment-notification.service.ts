import { Injectable, Logger } from "@nestjs/common";
import { NotificationService } from "src/communication/notification/services/notification.service";
import { toSectionAuthorDto } from "src/content/page/image-section/utils";
import { GetImageSectionService } from "src/content/page/image-section/services/get-image-section.service";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { FEED_COMMENT_UNKNOWN_AUTHOR_LABEL } from "../constants";
import { ImageSectionCommentEntity } from "../entities/image-section-comment.entity";
import { toEmailExcerpt } from "../utils";

const UNTITLED_POST = "Publicação do feed";

/**
 * Avisos por e-mail da moderação. Cada um passa pela flag própria do template
 * (`NotificationService` → `EmailDispatchService`). Roda depois do commit e nunca
 * derruba a operação: falha de e-mail só vai para o log, com ids (sem texto/e-mail).
 */
@Injectable()
export class FeedCommentNotificationService {
  private readonly logger = new Logger(FeedCommentNotificationService.name);

  constructor(
    private readonly notifications: NotificationService,
    private readonly users: GetUsersService,
    private readonly sections: GetImageSectionService,
  ) {}

  /** Comentário pendente: avisa a coordenação (sem o texto do comentário). */
  async notifyPending(comment: ImageSectionCommentEntity): Promise<void> {
    try {
      const adminEmails = await this.users.findAdminEmails();
      if (adminEmails.length === 0) return;
      await this.notifications.sendFeedCommentPendingNotification(
        {
          authorName:
            toSectionAuthorDto(comment.author)?.displayName ??
            FEED_COMMENT_UNKNOWN_AUTHOR_LABEL,
          postCaption: await this.captionOf(comment.sectionId),
        },
        adminEmails,
      );
    } catch (error: unknown) {
      this.logFailure("pendente", comment.id, error);
    }
  }

  /** Aprovado: avisa o autor. */
  async notifyApproved(comment: ImageSectionCommentEntity): Promise<void> {
    try {
      const author = comment.author;
      if (!author?.email) return;
      await this.notifications.sendFeedCommentApprovedEmail(
        {
          userName: author.name,
          commentExcerpt: toEmailExcerpt(comment.content),
          postCaption: await this.captionOf(comment.sectionId),
        },
        author.email,
      );
    } catch (error: unknown) {
      this.logFailure("aprovado", comment.id, error);
    }
  }

  /** Reprovado: avisa o autor, com o motivo. */
  async notifyRejected(comment: ImageSectionCommentEntity): Promise<void> {
    try {
      const author = comment.author;
      if (!author?.email || !comment.moderationReason) return;
      await this.notifications.sendFeedCommentRejectedEmail(
        {
          userName: author.name,
          commentExcerpt: toEmailExcerpt(comment.content),
          postCaption: await this.captionOf(comment.sectionId),
          reason: comment.moderationReason,
        },
        author.email,
      );
    } catch (error: unknown) {
      this.logFailure("reprovado", comment.id, error);
    }
  }

  private async captionOf(sectionId: string): Promise<string> {
    const contexts = await this.sections.findFeedContexts([sectionId]);
    return contexts.get(sectionId)?.caption?.trim() || UNTITLED_POST;
  }

  private logFailure(kind: string, commentId: string, error: unknown): void {
    const reason = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `Falha no aviso de comentário ${kind} (${commentId}): ${reason}`,
    );
  }
}
