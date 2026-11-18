import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { UserRepository } from "../../../user/user.repository";
import { PersonalDataRepository } from "../../repositories/personal-data.repository";
import { UserPreferencesRepository } from "../../repositories/user-preferences.repository";
import { UserRole } from "../../../auth/auth.types";
import { QueryProfilesDto } from "../../dto/query-profiles.dto";
import { PaginatedProfilesResponseDto } from "../../dto/paginated-profiles-response.dto";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import {
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
}

@Injectable()
export class GetAllProfilesService {
  constructor(
    private readonly dataSource: DataSource,
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
      q,
      name,
      email,
      role,
      loveLanguages,
      temperaments,
      favoriteColor,
      sortBy = "name",
      order = "ASC",
    } = queryDto;

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
        WHERE lp.user_id = ?
      `;

      params.push(requestingUserId);
      countParams.push(requestingUserId);
    } else {
      return { users: [], total: 0 };
    }

    if (q) {
      baseQuery += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      countQuery += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      params.push(likeParam(q), likeParam(q));
      countParams.push(likeParam(q), likeParam(q));
    }

    if (name) {
      baseQuery += ` AND u.name LIKE ?`;
      countQuery += ` AND u.name LIKE ?`;
      params.push(likeParam(name));
      countParams.push(likeParam(name));
    }

    if (email) {
      baseQuery += ` AND u.email LIKE ?`;
      countQuery += ` AND u.email LIKE ?`;
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
      baseQuery += ` AND up.loveLanguages LIKE ?`;
      countQuery += ` AND up.loveLanguages LIKE ?`;
      params.push(likeParam(loveLanguages));
      countParams.push(likeParam(loveLanguages));
    }

    if (temperaments) {
      baseQuery += ` AND up.temperaments LIKE ?`;
      countQuery += ` AND up.temperaments LIKE ?`;
      params.push(likeParam(temperaments));
      countParams.push(likeParam(temperaments));
    }

    if (favoriteColor) {
      baseQuery += ` AND up.favoriteColor LIKE ?`;
      countQuery += ` AND up.favoriteColor LIKE ?`;
      params.push(likeParam(favoriteColor));
      countParams.push(likeParam(favoriteColor));
    }

    // Coluna e direção vêm de listas fixas (nunca do texto recebido).
    const { column, direction } = resolveProfileSort(sortBy, order);
    baseQuery += ` ORDER BY ${column} ${direction}`;

    baseQuery += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const users = await this.dataSource.query<UserRow[]>(baseQuery, params);
    const countResult = await this.dataSource.query<Array<{ total?: string }>>(
      countQuery,
      countParams,
    );
    const total = parseInt(countResult[0]?.total ?? "0", 10);

    return { users, total };
  }
}
