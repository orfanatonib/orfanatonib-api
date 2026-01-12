import { Injectable, Logger } from '@nestjs/common';
import { UserRepository } from '../user.repository';
import { MemberProfilesService } from 'src/shelter/member-profile/services/member-profiles.service';
import { LeaderProfilesService } from 'src/shelter/leader-profile/services/leader-profiles.service';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';

@Injectable()
export class DeleteUserService {
  private readonly logger = new Logger(DeleteUserService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly memberService: MemberProfilesService,
    private readonly leaderService: LeaderProfilesService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly s3Service: AwsS3Service,
  ) {}

  async remove(id: string): Promise<{ message: string }> {
    const userImage = await this.mediaItemProcessor.findMediaItemByTarget(
      id,
      'UserEntity',
    );

    if (userImage) {
      await this.mediaItemProcessor.removeMediaItem(
        userImage,
        this.s3Service.delete.bind(this.s3Service),
      );
      this.logger.log(`Imagem do usuário deletada: ${userImage.id}`);
    }

    await this.memberService.removeByUserId(id);
    await this.leaderService.removeByUserId(id);
    await this.userRepo.delete(id);
    return { message: 'UserEntity deleted' };
  }
}
