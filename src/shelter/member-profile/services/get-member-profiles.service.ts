import { ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";
import { MemberProfilesRepository } from "../repositories/member-profiles.repository";
import {
  MemberResponseDto,
  toMemberDto,
} from "../dto/member-profile.response.dto";
import {
  MemberSimpleListDto,
  toMemberSimple,
} from "../dto/member-simple-list.dto";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import {
  PageDto,
  MemberProfilesQueryDto,
} from "../dto/member-profiles.query.dto";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MemberProfileEntity } from "../entities/member-profile.entity/member-profile.entity";
import { UserEntity } from "src/core/user/entities/user.entity";

type AccessCtx = { role?: string; userId?: string | null };

@Injectable()
export class GetMemberProfilesService {
  constructor(
    private readonly repo: MemberProfilesRepository,
    private readonly authCtx: AuthContextService,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  private async getCtx(req: Request): Promise<AccessCtx> {
    const payload = await this.authCtx.tryGetPayload(req);
    return {
      role: payload?.role?.toString().toLowerCase(),
      userId: payload?.sub ?? null,
    };
  }

  private assertAllowed(ctx: AccessCtx): void {
    if (!ctx.role || ctx.role === "member") {
      throw new ForbiddenException("Acesso negado");
    }
  }

  async findPage(
    req: Request,
    query: MemberProfilesQueryDto,
  ): Promise<PageDto<MemberResponseDto>> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const { items, total, page, limit } = await this.repo.findPageWithFilters(
      query,
      ctx,
    );

    await this.populateUserImages(items);

    return {
      items: items.map(toMemberDto),
      total,
      page,
      limit,
    };
  }

  async list(req: Request): Promise<MemberSimpleListDto[]> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const items = await this.repo.listEntities(ctx);
    await this.populateUserImages(items);

    return items.map(toMemberSimple);
  }

  async findOne(id: string, req: Request): Promise<MemberResponseDto> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const member = await this.repo.findOneWithShelterAndLeaderOrFail(id, ctx);
    await this.populateUserImages([member]);
    return toMemberDto(member);
  }

  private async populateUserImages(
    members: MemberProfileEntity[],
  ): Promise<void> {
    if (!members.length) return;

    const userIds = members
      .filter(
        (m): m is MemberProfileEntity & { user: UserEntity } => !!m.user?.id,
      )
      .map((m) => m.user.id);

    if (!userIds.length) return;

    const mediaItems =
      await this.mediaItemProcessor.findManyMediaItemsByTargets(
        userIds,
        "UserEntity",
      );

    const mediaMap = new Map<string, (typeof mediaItems)[number]>();
    mediaItems.forEach((item) => {
      if (!mediaMap.has(item.targetId)) {
        mediaMap.set(item.targetId, item);
      }
    });

    members.forEach((member) => {
      if (member.user?.id) {
        member.user.imageProfile = mediaMap.get(member.user.id) || null;
      }
    });
  }
}
