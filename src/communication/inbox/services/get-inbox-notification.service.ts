import { Injectable } from "@nestjs/common";

import { ResourceNotFoundException } from "src/common/exceptions";

import { INBOX_NOT_FOUND_MESSAGE } from "../constants/inbox-notification.constants";
import {
  InboxNotificationResponseDto,
  InboxNotificationsPageDto,
  InboxSummaryResponseDto,
} from "../dto/inbox-notification-response.dto";
import { QueryInboxNotificationsDto } from "../dto/query-inbox-notifications.dto";
import { InboxNotificationStatusFilter } from "../enums/inbox-notification-status-filter.enum";
import { InboxNotificationRepository } from "../repositories/inbox-notification.repository";

@Injectable()
export class GetInboxNotificationService {
  constructor(private readonly notifications: InboxNotificationRepository) {}

  async summary(recipientId: string): Promise<InboxSummaryResponseDto> {
    return InboxSummaryResponseDto.fromData(
      await this.notifications.summarize(recipientId),
    );
  }

  async list(
    recipientId: string,
    query: QueryInboxNotificationsDto,
  ): Promise<InboxNotificationsPageDto> {
    const [page, summary] = await Promise.all([
      this.notifications.findPage(recipientId, {
        page: query.page,
        limit: query.limit,
        unreadOnly: query.status === InboxNotificationStatusFilter.UNREAD,
        type: query.type,
      }),
      this.notifications.summarize(recipientId),
    ]);
    return {
      items: page.items.map((item) =>
        InboxNotificationResponseDto.fromEntity(item),
      ),
      total: page.total,
      page: query.page,
      limit: query.limit,
      unreadCount: summary.unreadCount,
    };
  }

  async detail(
    id: string,
    recipientId: string,
  ): Promise<InboxNotificationResponseDto> {
    const found = await this.notifications.findOneFor(id, recipientId);
    if (!found) throw new ResourceNotFoundException(INBOX_NOT_FOUND_MESSAGE);
    return InboxNotificationResponseDto.fromEntity(found);
  }
}
