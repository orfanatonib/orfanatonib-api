import { Injectable, Logger } from "@nestjs/common";
import { SiteFeedbackEntity } from "../entity/site-feedback.entity";
import { SiteFeedbackRepository } from "../repository/site-feedback.repository";
import { CreateSiteFeedbackDto } from "../dto/create-site-feedback.dto";
import { NotificationService } from "../../notification/services/notification.service";
import { GetUsersService } from "src/core/user/services/get-user.service";

@Injectable()
export class CreateSiteFeedbackService {
  private readonly logger = new Logger(CreateSiteFeedbackService.name);

  constructor(
    private readonly siteFeedbackRepo: SiteFeedbackRepository,
    private readonly notificationService: NotificationService,
    private readonly getUsersService: GetUsersService,
  ) {}

  async execute(dto: CreateSiteFeedbackDto): Promise<SiteFeedbackEntity> {
    const feedback = this.siteFeedbackRepo.create(dto);
    const saved = await this.siteFeedbackRepo.save(feedback);

    void this.notifyAdmins(saved);

    return saved;
  }

  private async notifyAdmins(feedback: SiteFeedbackEntity): Promise<void> {
    try {
      const adminEmails = await this.getUsersService.findAdminEmails();
      if (adminEmails.length === 0) return;

      await this.notificationService.sendFeedbackNotification(
        {
          name: feedback.name,
          email: feedback.email,
          rating: feedback.rating,
          comment: feedback.comment,
        },
        adminEmails,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to notify admins about site feedback: ${reason}`,
      );
    }
  }
}
