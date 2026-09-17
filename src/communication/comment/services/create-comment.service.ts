import { Injectable, Logger } from "@nestjs/common";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { NotificationService } from "src/communication/notification/services/notification.service";
import { CreateCommentDto } from "../dto/create-comment.dto";
import { CommentEntity } from "../entities/comment.entity";
import { CommentRepository } from "../repositories/comment.repository";

@Injectable()
export class CreateCommentService {
  private readonly logger = new Logger(CreateCommentService.name);

  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly notificationService: NotificationService,
    private readonly getUsersService: GetUsersService,
  ) {}

  async execute(dto: CreateCommentDto): Promise<CommentEntity> {
    const saved = await this.commentRepository.createAndSave(dto);

    void this.notifyAdmins(saved);

    return saved;
  }

  private async notifyAdmins(comment: CommentEntity): Promise<void> {
    try {
      const adminEmails = await this.getUsersService.findAdminEmails();
      if (adminEmails.length === 0) return;

      await this.notificationService.sendCommentNotification(
        {
          authorName: comment.name,
          clubinho: comment.shelter,
          neighborhood: comment.neighborhood,
          comment: comment.comment,
        },
        adminEmails,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to notify admins about comment: ${reason}`);
    }
  }
}
