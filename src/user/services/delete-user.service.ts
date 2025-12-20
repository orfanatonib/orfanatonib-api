import { Injectable, Logger } from '@nestjs/common';
import { UserRepository } from '../user.repository';
import { TeacherProfilesService } from 'src/modules/teacher-profiles/services/teacher-profiles.service';
import { LeaderProfilesService } from 'src/modules/leader-profiles/services/leader-profiles.service';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';
import { AwsS3Service } from 'src/aws/aws-s3.service';

@Injectable()
export class DeleteUserService {
  private readonly logger = new Logger(DeleteUserService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly teacherService: TeacherProfilesService,
    private readonly leaderService: LeaderProfilesService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly s3Service: AwsS3Service,
  ) {}

  async remove(id: string): Promise<{ message: string }> {
    // Deletar imagem do usuário do S3 e do banco se existir
    const userImage = await this.mediaItemProcessor.findMediaItemByTarget(
      id,
      'UserEntity',
    );

    if (userImage) {
      // removeMediaItem já deleta do S3 se isLocalFile for true
      await this.mediaItemProcessor.removeMediaItem(
        userImage,
        this.s3Service.delete.bind(this.s3Service),
      );
      this.logger.log(`Imagem do usuário deletada: ${userImage.id}`);
    }

    await this.teacherService.removeByUserId(id);
    await this.leaderService.removeByUserId(id);
    await this.userRepo.delete(id);
    return { message: 'UserEntity deleted' };
  }
}
