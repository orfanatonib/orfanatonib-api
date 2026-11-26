import { Injectable, Logger } from "@nestjs/common";

import { GetUsersService } from "src/core/user/services/get-user.service";

import { InboxNoticeInput } from "../types";
import { InboxNotificationRepository } from "../repositories/inbox-notification.repository";
import { buildNoticeRows } from "../utils/inbox-notice.utils";

@Injectable()
export class CreateInboxNotificationService {
  private readonly logger = new Logger(CreateInboxNotificationService.name);

  constructor(
    private readonly notifications: InboxNotificationRepository,
    private readonly users: GetUsersService,
  ) {}

  /**
   * Avisa TODOS os administradores ativos. Nunca lança: o aviso é auxiliar, e uma falha aqui (banco, lista de
   * admins) não pode desfazer nem travar a operação que o originou. Devolve quantos avisos novos nasceram.
   */
  async notifyAdmins(input: InboxNoticeInput): Promise<number> {
    try {
      const adminIds = await this.users.findAdminIds();
      return await this.notifications.createMany(
        buildNoticeRows(input, adminIds),
      );
    } catch (error) {
      this.logger.error(
        `Falha ao criar aviso ${input.type} (${input.dedupeKey})`,
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }
}
