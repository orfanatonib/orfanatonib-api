import { Injectable } from "@nestjs/common";

import { ResourceNotFoundException } from "src/common/exceptions";

import { INBOX_NOT_FOUND_MESSAGE } from "../constants/inbox-notification.constants";
import {
  InboxNotificationResponseDto,
  InboxReadAllResponseDto,
  InboxSummaryResponseDto,
} from "../dto/inbox-notification-response.dto";
import { InboxNotificationRepository } from "../repositories/inbox-notification.repository";

@Injectable()
export class UpdateInboxNotificationService {
  constructor(private readonly notifications: InboxNotificationRepository) {}

  /** Idempotente; um aviso de outra pessoa é tratado como inexistente (não vaza que existe). */
  async markRead(
    id: string,
    recipientId: string,
  ): Promise<InboxNotificationResponseDto> {
    const found = await this.notifications.markRead(id, recipientId);
    if (!found) throw new ResourceNotFoundException(INBOX_NOT_FOUND_MESSAGE);
    const notice = await this.notifications.findOneFor(id, recipientId);
    if (!notice) throw new ResourceNotFoundException(INBOX_NOT_FOUND_MESSAGE);
    return InboxNotificationResponseDto.fromEntity(notice);
  }

  async markAllRead(recipientId: string): Promise<InboxReadAllResponseDto> {
    const updatedCount = await this.notifications.markAllRead(recipientId);
    return {
      updatedCount,
      summary: InboxSummaryResponseDto.fromData(
        await this.notifications.summarize(recipientId),
      ),
    };
  }
}
