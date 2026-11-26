import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { AuthenticatedRequest } from "src/core/auth/auth.types";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";

import {
  InboxNotificationResponseDto,
  InboxNotificationsPageDto,
  InboxReadAllResponseDto,
  InboxSummaryResponseDto,
} from "./dto/inbox-notification-response.dto";
import { QueryInboxNotificationsDto } from "./dto/query-inbox-notifications.dto";
import { GetInboxNotificationService } from "./services/get-inbox-notification.service";
import { UpdateInboxNotificationService } from "./services/update-inbox-notification.service";

/** Caixa de entrada do sininho. O destinatário vem SEMPRE da sessão, nunca de parâmetro. */
@Controller("notifications/me")
@UseGuards(JwtAuthGuard, FeatureFlagGuard)
@FeatureFlag(FeatureFlagKeys.NOTIFICATION_CENTER)
export class InboxNotificationController {
  constructor(
    private readonly getService: GetInboxNotificationService,
    private readonly updateService: UpdateInboxNotificationService,
  ) {}

  @Get("summary")
  summary(
    @Req() request: AuthenticatedRequest,
  ): Promise<InboxSummaryResponseDto> {
    return this.getService.summary(this.recipientId(request));
  }

  @Get()
  list(
    @Query() query: QueryInboxNotificationsDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<InboxNotificationsPageDto> {
    return this.getService.list(this.recipientId(request), query);
  }

  /** Antes das rotas com `:id`, para não ser capturada por elas. */
  @Patch("read-all")
  readAll(
    @Req() request: AuthenticatedRequest,
  ): Promise<InboxReadAllResponseDto> {
    return this.updateService.markAllRead(this.recipientId(request));
  }

  @Get(":id")
  detail(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<InboxNotificationResponseDto> {
    return this.getService.detail(id, this.recipientId(request));
  }

  @Patch(":id/read")
  read(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<InboxNotificationResponseDto> {
    return this.updateService.markRead(id, this.recipientId(request));
  }

  private recipientId(request: AuthenticatedRequest): string {
    const userId = request.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return userId;
  }
}
