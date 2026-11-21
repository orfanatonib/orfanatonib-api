import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { UserRepository } from "../user.repository";
import { DeleteMemberProfileService } from "src/shelter/member-profile/services/delete-member-profile.service";
import { DeleteLeaderProfileService } from "src/shelter/leader-profile/services/delete-leader-profile.service";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaStorageService } from "src/shared/media/storage/media-storage.service";
import {
  UserErrorMessages,
  UserLogs,
  UserSuccessMessages,
} from "../constants/user.constants";

@Injectable()
export class DeleteUserService {
  private readonly logger = new Logger(DeleteUserService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly deleteMemberService: DeleteMemberProfileService,
    private readonly deleteLeaderService: DeleteLeaderProfileService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  async remove(id: string): Promise<{ message: string }> {
    if (!(await this.userRepo.findById(id))) {
      throw new NotFoundException(UserErrorMessages.USER_NOT_FOUND);
    }
    await this.deleteMemberService.removeByUserId(id);
    await this.deleteLeaderService.removeByUserId(id);
    await this.userRepo.delete(id);

    // A foto só sai depois que o usuário foi apagado: se algo acima falha, a mídia continua referenciada.
    // Falha aqui NÃO desfaz a exclusão (já confirmada): fica registrada e a reconciliação de mídia recolhe a sobra.
    try {
      const userImage = await this.mediaItemProcessor.findMediaItemByTarget(
        id,
        "UserEntity",
      );

      if (userImage) {
        // Linha primeiro; o objeto só sai do bucket depois (falha de remoção vai para a fila de limpeza).
        const urls = await this.mediaItemProcessor.removeMediaItemsKeepingFiles(
          [userImage],
        );
        await this.mediaStorage.deleteAfterCommit(urls);
        this.logger.log(`Imagem do usuário deletada: ${userImage.id}`);
      }
    } catch (error) {
      this.logger.error(
        `Usuário ${id} apagado, mas a limpeza da foto falhou`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(UserLogs.DELETED(id));
    return { message: UserSuccessMessages.DELETED };
  }
}
