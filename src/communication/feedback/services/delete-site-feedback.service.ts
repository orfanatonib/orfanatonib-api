import { Injectable } from "@nestjs/common";
import { SiteFeedbackRepository } from "../repository/site-feedback.repository";
import { GetSiteFeedbackService } from "./get-site-feedback.service";

@Injectable()
export class DeleteSiteFeedbackService {
  constructor(
    private readonly siteFeedbackRepo: SiteFeedbackRepository,
    private readonly getFeedbackService: GetSiteFeedbackService,
  ) {}

  async remove(id: string): Promise<void> {
    const feedback = await this.getFeedbackService.findOne(id);
    await this.siteFeedbackRepo.remove(feedback);
  }
}
