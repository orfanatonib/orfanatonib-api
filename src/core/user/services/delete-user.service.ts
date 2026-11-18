import { Injectable, Logger } from "@nestjs/common";
import { UserRepository } from "../user.repository";
import { DeleteMemberProfileService } from "src/shelter/member-profile/services/delete-member-profile.service";
import { DeleteLeaderProfileService } from "src/shelter/leader-profile/services/delete-leader-profile.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { UserLogs, UserSuccessMessages } from "../constants/user.constants";

@Injectable()
export class DeleteUserService {
  private readonly logger = new Logger(DeleteUserService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly deleteMemberService: DeleteMemberProfileService,
    private readonly deleteLeaderService: DeleteLeaderProfileService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly s3Service: AwsS3Service,
  ) {}

  async remove(id: string): Promise<{ message: string }> {
    const userImage = await this.mediaItemProcessor.findMediaItemByTarget(
      id,
      "UserEntity",
    );

    if (userImage) {
      await this.mediaItemProcessor.removeMediaItem(
        userImage,
        this.s3Service.delete.bind(this.s3Service),
      );
      this.logger.log(`Imagem do usuário deletada: ${userImage.id}`);
    }

    await this.deleteMemberService.removeByUserId(id);
    await this.deleteLeaderService.removeByUserId(id);
    await this.userRepo.delete(id);

    this.logger.log(UserLogs.DELETED(id));
    return { message: UserSuccessMessages.DELETED };
  }
}
