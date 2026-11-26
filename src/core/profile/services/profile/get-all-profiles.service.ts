import { Injectable } from "@nestjs/common";
import { ProfilesQueryRepository } from "../../repositories/profiles-query.repository";
import { UserRepository } from "../../../user/user.repository";
import { PersonalDataRepository } from "../../repositories/personal-data.repository";
import { UserPreferencesRepository } from "../../repositories/user-preferences.repository";
import { UserRole } from "../../../auth/auth.types";
import { QueryProfilesDto } from "../../dto/query-profiles.dto";
import { PaginatedProfilesResponseDto } from "../../dto/paginated-profiles-response.dto";
import { createdRange } from "src/shared/list-query/list-query.util";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import {
  LIKE_ESCAPE,
  likeParam,
  resolveProfileSort,
  type SqlParam,
} from "../../utils/profile-query.util";
import type { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";

/** Linha crua de `users` (+ joins) que esta listagem lê. */
interface UserRow {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  createdAt: Date | string;
}

@Injectable()
export class GetAllProfilesService {
  constructor(
    private readonly profilesQuery: ProfilesQueryRepository,
    private readonly userRepository: UserRepository,
    private readonly personalDataRepository: PersonalDataRepository,
    private readonly userPreferencesRepository: UserPreferencesRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
  ) {}

  async execute(
    requestingUserId: string,
    requestingUserRole: UserRole,
    queryDto: QueryProfilesDto,
  ): Promise<PaginatedProfilesResponseDto> {
    const { page = 1, limit = 10 } = queryDto;

    const offset = (page - 1) * limit;

    const { users, total } = await this.getUsersWithFilters(
      requestingUserId,
      requestingUserRole,
      queryDto,
      limit,
      offset,
    );

    const userIds = users.map((u) => u.id);
    const mediaItems =
      await this.mediaItemProcessor.findManyMediaItemsByTargets(
        userIds,
        "UserEntity",
      );
    const mediaMap = new Map<string, MediaItemEntity>();
    mediaItems.forEach((item) => {
      mediaMap.set(item.targetId, item);
    });

    const profiles = await Promise.all(
      users.map(async (user) => {
        const personalData = await this.personalDataRepository.findByUserId(
          user.id,
        );
        const preferences = await this.userPreferencesRepository.findByUserId(
          user.id,
        );
        const imageMedia = mediaMap.get(user.id);

        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          role: user.role,
          createdAt: new Date(user.createdAt).toISOString(),
          personalData: personalData
            ? {
                birthDate: personalData.birthDate
                  ? personalData.birthDate instanceof Date
                    ? personalData.birthDate.toISOString().split("T")[0]
                    : String(personalData.birthDate).split("T")[0]
                  : undefined,
                gender: personalData.gender,
                gaLeaderName: personalData.gaLeaderName,
                gaLeaderContact: personalData.gaLeaderContact,
              }
            : undefined,
          preferences: preferences
            ? {
                loveLanguages: preferences.loveLanguages,
                temperaments: preferences.temperaments,
                favoriteColor: preferences.favoriteColor,
                favoriteFood: preferences.favoriteFood,
                favoriteMusic: preferences.favoriteMusic,
                whatMakesYouSmile: preferences.whatMakesYouSmile,
                skillsAndTalents: preferences.skillsAndTalents,
              }
            : undefined,
          image: imageMedia
            ? {
                id: imageMedia.id,
                title: imageMedia.title,
                description: imageMedia.description,
                url: imageMedia.url,
                uploadType: imageMedia.uploadType,
                mediaType: imageMedia.mediaType,
                isLocalFile: imageMedia.isLocalFile,
              }
            : null,
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);

    return {
      items: profiles,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  private async getUsersWithFilters(
    requestingUserId: string,
    requestingUserRole: UserRole,
    queryDto: QueryProfilesDto,
    limit: number,
    offset: number,
  ): Promise<{ users: UserRow[]; total: number }> {
    const {
      search,
      name,
      email,
      role,
      loveLanguages,
      temperaments,
      favoriteColor,
      gender,
      birthMonth,
      sortBy = "name",
      order = "ASC",
    } = queryDto;

    const q = queryDto.q || search;

    let baseQuery = "";
    let countQuery = "";
    const params: SqlParam[] = [];
    const countParams: SqlParam[] = [];

    if (requestingUserRole === UserRole.ADMIN) {
      baseQuery = `
        SELECT DISTINCT u.*, pd.birthDate, up.loveLanguages, up.temperaments, up.favoriteColor
        FROM users u
        LEFT JOIN personal_data pd ON pd.userId = u.id
        LEFT JOIN user_preferences up ON up.userId = u.id
        WHERE 1=1
      `;

      countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        LEFT JOIN personal_data pd ON pd.userId = u.id
        LEFT JOIN user_preferences up ON up.userId = u.id
        WHERE 1=1
      `;
    } else if (requestingUserRole === UserRole.LEADER) {
      baseQuery = `
        SELECT DISTINCT u.*, pd.birthDate, up.loveLanguages, up.temperaments, up.favoriteColor
        FROM users u
        INNER JOIN member_profiles tp ON tp.user_id = u.id
        INNER JOIN teams t ON t.id = tp.team_id
        INNER JOIN leader_teams lt ON lt.team_id = t.id
        INNER JOIN leader_profiles lp ON lp.id = lt.leader_id
        LEFT JOIN personal_data pd ON pd.userId = u.id
        LEFT JOIN user_preferences up ON up.userId = u.id
        WHERE lp.user_id = ?
      `;

      countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        INNER JOIN member_profiles tp ON tp.user_id = u.id
        INNER JOIN teams t ON t.id = tp.team_id
        INNER JOIN leader_teams lt ON lt.team_id = t.id
        INNER JOIN leader_profiles lp ON lp.id = lt.leader_id
        LEFT JOIN personal_data pd ON pd.userId = u.id
        LEFT JOIN user_preferences up ON up.userId = u.id
        WHERE lp.user_id = ?
      `;

      params.push(requestingUserId);
      countParams.push(requestingUserId);
    } else {
      return { users: [], total: 0 };
    }

    if (q) {
      baseQuery += ` AND (u.name LIKE ? ${LIKE_ESCAPE} OR u.email LIKE ? ${LIKE_ESCAPE})`;
      countQuery += ` AND (u.name LIKE ? ${LIKE_ESCAPE} OR u.email LIKE ? ${LIKE_ESCAPE})`;
      params.push(likeParam(q), likeParam(q));
      countParams.push(likeParam(q), likeParam(q));
    }

    if (name) {
      baseQuery += ` AND u.name LIKE ? ${LIKE_ESCAPE}`;
      countQuery += ` AND u.name LIKE ? ${LIKE_ESCAPE}`;
      params.push(likeParam(name));
      countParams.push(likeParam(name));
    }

    if (email) {
      baseQuery += ` AND u.email LIKE ? ${LIKE_ESCAPE}`;
      countQuery += ` AND u.email LIKE ? ${LIKE_ESCAPE}`;
      params.push(likeParam(email));
      countParams.push(likeParam(email));
    }

    if (role) {
      baseQuery += ` AND u.role = ?`;
      countQuery += ` AND u.role = ?`;
      params.push(role);
      countParams.push(role);
    }

    if (loveLanguages) {
      baseQuery += ` AND up.loveLanguages LIKE ? ${LIKE_ESCAPE}`;
      countQuery += ` AND up.loveLanguages LIKE ? ${LIKE_ESCAPE}`;
      params.push(likeParam(loveLanguages));
      countParams.push(likeParam(loveLanguages));
    }

    if (temperaments) {
      baseQuery += ` AND up.temperaments LIKE ? ${LIKE_ESCAPE}`;
      countQuery += ` AND up.temperaments LIKE ? ${LIKE_ESCAPE}`;
      params.push(likeParam(temperaments));
      countParams.push(likeParam(temperaments));
    }

    if (favoriteColor) {
      baseQuery += ` AND up.favoriteColor LIKE ? ${LIKE_ESCAPE}`;
      countQuery += ` AND up.favoriteColor LIKE ? ${LIKE_ESCAPE}`;
      params.push(likeParam(favoriteColor));
      countParams.push(likeParam(favoriteColor));
    }

    if (gender) {
      baseQuery += ` AND pd.gender = ?`;
      countQuery += ` AND pd.gender = ?`;
      params.push(gender);
      countParams.push(gender);
    }

    if (birthMonth !== undefined) {
      baseQuery += ` AND MONTH(pd.birthDate) = ?`;
      countQuery += ` AND MONTH(pd.birthDate) = ?`;
      params.push(birthMonth);
      countParams.push(birthMonth);
    }

    const { from, to } = createdRange({
      createdFrom: queryDto.createdFrom,
      createdTo: queryDto.createdTo,
    });
    if (from) {
      baseQuery += ` AND u.createdAt >= ?`;
      countQuery += ` AND u.createdAt >= ?`;
      params.push(from);
      countParams.push(from);
    }
    if (to) {
      baseQuery += ` AND u.createdAt <= ?`;
      countQuery += ` AND u.createdAt <= ?`;
      params.push(to);
      countParams.push(to);
    }

    // Coluna e direção vêm de listas fixas (nunca do texto recebido).
    const { column, direction } = resolveProfileSort(sortBy, order);
    baseQuery += ` ORDER BY ${column} ${direction}`;

    baseQuery += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const users = await this.profilesQuery.query<UserRow[]>(baseQuery, params);
    const countResult = await this.profilesQuery.query<
      Array<{ total?: string }>
    >(countQuery, countParams);
    const total = parseInt(countResult[0]?.total ?? "0", 10);

    return { users, total };
  }
}
