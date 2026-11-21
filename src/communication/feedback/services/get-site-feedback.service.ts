import { Injectable, NotFoundException } from "@nestjs/common";
import { SiteFeedbackPendingCountDto } from "../dto/site-feedback-pending-count.dto";
import { SiteFeedbackEntity } from "../entity/site-feedback.entity";
import { SiteFeedbackRepository } from "../repository/site-feedback.repository";

@Injectable()
export class GetSiteFeedbackService {
  constructor(private readonly siteFeedbackRepo: SiteFeedbackRepository) {}

  async findAll(): Promise<SiteFeedbackEntity[]> {
    return this.siteFeedbackRepo.findAll();
  }

  async pendingCount(): Promise<SiteFeedbackPendingCountDto> {
    return { pending: await this.siteFeedbackRepo.countUnread() };
  }

  async findOne(id: string): Promise<SiteFeedbackEntity> {
    const feedback = await this.siteFeedbackRepo.findOneBy({ id });
    if (!feedback) {
      throw new NotFoundException("Site feedback not found");
    }
    return feedback;
  }
}
