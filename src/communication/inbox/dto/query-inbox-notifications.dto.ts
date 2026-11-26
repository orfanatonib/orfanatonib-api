import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

import {
  INBOX_DEFAULT_LIMIT,
  INBOX_DEFAULT_PAGE,
  INBOX_MAX_LIMIT,
} from "../constants/inbox-notification.constants";
import { InboxNotificationStatusFilter } from "../enums/inbox-notification-status-filter.enum";
import { InboxNotificationType } from "../enums/inbox-notification-type.enum";

export class QueryInboxNotificationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = INBOX_DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(INBOX_MAX_LIMIT)
  limit: number = INBOX_DEFAULT_LIMIT;

  @IsOptional()
  @IsEnum(InboxNotificationStatusFilter)
  status: InboxNotificationStatusFilter = InboxNotificationStatusFilter.ALL;

  @IsOptional()
  @IsEnum(InboxNotificationType)
  type?: InboxNotificationType;
}
