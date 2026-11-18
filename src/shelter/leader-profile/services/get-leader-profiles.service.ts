import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from "@nestjs/common";
import { Request } from "express";
import { LeaderProfilesRepository } from "../repositories/leader-profiles.repository";
import {
  LeaderResponseDto,
  toLeaderDto,
} from "../dto/leader-profile.response.dto";
import {
  LeaderSimpleListDto,
  toLeaderSimple,
} from "../dto/leader-simple-list.dto";
import { LeaderProfileEntity } from "../entities/leader-profile.entity/leader-profile.entity";
import {
  LeaderProfilesQueryDto,
  PageDto,
} from "../dto/leader-profiles.query.dto";
import { AuthContextService } from "src/core/auth/services/auth-context.service";
import { GetSheltersService } from "src/shelter/shelter/services/get-shelters.service";
import { ShelterWithLeaderStatusDto } from "src/shelter/shelter/dto/shelter.response.dto";
import { toShelterWithLeaderStatusDto } from "src/shelter/shelter/mappers/shelter.mapper";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { ShelterEntity } from "src/shelter/shelter/entities/shelter.entity/shelter.entity";
import { UserEntity } from "src/core/user/entities/user.entity";

type AccessCtx = { role?: string; userId?: string | null };

@Injectable()
export class GetLeaderProfilesService {
  constructor(
    private readonly repo: LeaderProfilesRepository,
    private readonly authCtx: AuthContextService,
    @Inject(forwardRef(() => GetSheltersService))
    private readonly getSheltersService: GetSheltersService,
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
    query: LeaderProfilesQueryDto,
  ): Promise<PageDto<LeaderResponseDto>> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const { items, total, page, limit } =
      await this.repo.findPageWithFilters(query);

    await this.populateUserImages(items);

    return {
      items: items.map(toLeaderDto),
      total,
      page,
      limit,
    };
  }

  async list(req: Request): Promise<LeaderSimpleListDto[]> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const items = await this.repo.listEntities();
    await this.populateUserImages(items);

    return items.map(toLeaderSimple);
  }

  async findOne(id: string, req: Request): Promise<LeaderResponseDto> {
    const ctx = await this.getCtx(req);
    this.assertAllowed(ctx);

    const leader = await this.repo.findOneWithSheltersAndMembersOrFail(id);
    await this.populateUserImages([leader]);
    return toLeaderDto(leader);
  }

  async findMyShelters(req: Request): Promise<ShelterWithLeaderStatusDto[]> {
    const ctx = await this.getCtx(req);

    if (!ctx.role || ctx.role !== "leader" || !ctx.userId) {
      throw new ForbiddenException("Only leaders can access their shelters");
    }

    const leader = await this.repo.findByUserId(ctx.userId);

    if (!leader) {
      throw new NotFoundException("Leader profile not found");
    }

    const shelterIds = await this.getSheltersService.findShelterIdsForLeader(
      ctx.userId,
    );

    if (shelterIds.length === 0) {
      return [];
    }

    const shelters = await this.repo.findSheltersByIds(shelterIds);
    const sheltersWithMedia = await this.populateMediaItems(shelters);

    return sheltersWithMedia.map((shelter) =>
      toShelterWithLeaderStatusDto(shelter, leader.id),
    );
  }

  private async populateUserImages(
    leaders: LeaderProfileEntity[],
  ): Promise<void> {
    if (!leaders.length) return;

    const userIds = leaders
      .filter(
        (l): l is LeaderProfileEntity & { user: UserEntity } => !!l.user?.id,
      )
      .map((l) => l.user.id);

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

    leaders.forEach((leader) => {
      if (leader.user?.id) {
        leader.user.imageProfile = mediaMap.get(leader.user.id) || null;
      }
    });
  }

  private async populateMediaItems(
    shelters: ShelterEntity[],
  ): Promise<ShelterEntity[]> {
    if (!shelters.length) return shelters;

    const shelterIds = shelters.map((s) => s.id);
    const mediaItems =
      await this.mediaItemProcessor.findManyMediaItemsByTargets(
        shelterIds,
        "ShelterEntity",
      );

    const mediaMap = new Map<string, (typeof mediaItems)[number]>();
    mediaItems.forEach((item) => {
      if (!mediaMap.has(item.targetId)) {
        mediaMap.set(item.targetId, item);
      }
    });

    shelters.forEach((shelter) => {
      shelter.mediaItem = mediaMap.get(shelter.id) || null;
    });

    return shelters;
  }
}
