import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateShelterDto } from '../dto/create-shelter.dto';
import { UpdateShelterDto } from '../dto/update-shelter.dto';
import { QuerySheltersDto } from '../dto/query-shelters.dto';

import { ShelterEntity } from '../entities/shelter.entity/shelter.entity';
import { AddressEntity } from 'src/shelter/address/entities/address.entity/address.entity';
import { LeaderProfileEntity } from 'src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity';
import { MemberProfileEntity } from 'src/shelter/member-profile/entities/member-profile.entity/member-profile.entity';
import { TeamEntity } from 'src/shelter/team/entities/team.entity';
import { UserEntity } from 'src/core/user/entities/user.entity';
import { ShelterSelectOptionDto, toShelterSelectOption } from '../dto/shelter-select-option.dto';
import { RouteEntity } from 'src/infrastructure/route/route-page.entity';
import { MediaItemEntity } from 'src/shared/media/media-item/media-item.entity';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';

type RoleCtx = { role?: string; userId?: string | null };

@Injectable()
export class SheltersRepository {
  private readonly logger = new Logger(SheltersRepository.name);

  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(ShelterEntity)
    private readonly shelterRepo: Repository<ShelterEntity>,

    @InjectRepository(AddressEntity)
    private readonly addressRepo: Repository<AddressEntity>,

    @InjectRepository(LeaderProfileEntity)
    private readonly leaderRepo: Repository<LeaderProfileEntity>,

    @InjectRepository(MemberProfileEntity)
    private readonly memberProfileRepo: Repository<MemberProfileEntity>,

    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,

    @InjectRepository(RouteEntity)
    private readonly routeRepo: Repository<RouteEntity>,

    @InjectRepository(MediaItemEntity)
    private readonly mediaRepo: Repository<MediaItemEntity>,

    private readonly s3Service: AwsS3Service,
  ) { }

  private buildShelterBaseQB(manager?: EntityManager): SelectQueryBuilder<ShelterEntity> {
    const repo = manager ? manager.getRepository(ShelterEntity) : this.shelterRepo;
    return repo
      .createQueryBuilder('shelter')
      .leftJoinAndSelect('shelter.address', 'address')
      .leftJoinAndSelect('shelter.teams', 'teams')
      .leftJoinAndSelect('teams.leaders', 'leaders')
      .leftJoinAndSelect('teams.members', 'members')
      .leftJoin('leaders.user', 'leaderUser')
      .addSelect([
        'leaderUser.id',
        'leaderUser.name',
        'leaderUser.email',
        'leaderUser.phone',
        'leaderUser.active',
        'leaderUser.completed',
        'leaderUser.commonUser',
      ])
      .leftJoin('members.user', 'memberUser')
      .addSelect([
        'memberUser.id',
        'memberUser.name',
        'memberUser.email',
        'memberUser.phone',
        'memberUser.active',
        'memberUser.completed',
        'memberUser.commonUser',
      ]);
  }

  private applyRoleFilter(qb: SelectQueryBuilder<ShelterEntity>, ctx?: RoleCtx) {
    const role = ctx?.role?.toLowerCase();
    const userId = ctx?.userId;
    if (!role || role === 'admin' || !userId) return;

    if (role === 'leader') {
      qb.andWhere('leaderUser.id = :uid', { uid: userId }).distinct(true);
    } else if (role === 'member') {
      qb.andWhere('memberUser.id = :uid', { uid: userId }).distinct(true);
    } else {
      qb.andWhere('1 = 0');
    }
  }

  async findAllPaginated(
    q: QuerySheltersDto,
    ctx?: RoleCtx,
  ): Promise<{ items: ShelterEntity[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sort = 'name',
      order = 'ASC',
      searchString,
      shelterName,
    } = q;

    // Step 1: Build query to get shelter IDs with pagination
    const sortMap: Record<string, string> = {
      name: 'shelter.name',
      createdAt: 'shelter.createdAt',
      updatedAt: 'shelter.updatedAt',
      city: 'address.city',
      state: 'address.state',
    };

    const orderBy = sortMap[sort] ?? 'shelter.name';
    const orderDir = (order || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const idQb = this.shelterRepo
      .createQueryBuilder('shelter')
      .leftJoin('shelter.address', 'address')
      .leftJoin('shelter.teams', 'teams')
      .leftJoin('teams.leaders', 'leaders')
      .leftJoin('leaders.user', 'leaderUser')
      .leftJoin('teams.members', 'members')
      .leftJoin('members.user', 'memberUser')
      .select('shelter.id', 'id')
      .addSelect(orderBy, 'orderField')
      .distinct(true);

    this.applyRoleFilter(idQb, ctx);

    if (shelterName?.trim()) {
      const like = `%${shelterName.trim()}%`;
      idQb.andWhere('LOWER(shelter.name) LIKE LOWER(:shelterName)', { shelterName: like });
    } else if (searchString?.trim()) {
      const like = `%${searchString.trim()}%`;
      idQb.andWhere(
        `(
          LOWER(shelter.name) LIKE LOWER(:searchString) OR
          LOWER(address.city) LIKE LOWER(:searchString) OR
          LOWER(address.state) LIKE LOWER(:searchString) OR
          LOWER(address.district) LIKE LOWER(:searchString) OR
          EXISTS (
            SELECT 1 FROM teams t
            JOIN leader_teams lt ON lt.team_id = t.id
            JOIN leader_profiles lp ON lp.id = lt.leader_id
            JOIN users lu ON lu.id = lp.user_id
            WHERE t.shelter_id = shelter.id
              AND LOWER(lu.name) LIKE LOWER(:searchString)
        ) OR EXISTS (
            SELECT 1 FROM teams t
            JOIN member_profiles tp ON tp.team_id = t.id
          JOIN users tu ON tu.id = tp.user_id
            WHERE t.shelter_id = shelter.id
              AND LOWER(tu.name) LIKE LOWER(:searchString)
          )
        )`,
        { searchString: like }
      );
    }

    // Get total count
    const totalQb = idQb.clone();
    const total = await totalQb.getCount();

    // Apply sorting and pagination on IDs
    idQb.orderBy('orderField', orderDir as 'ASC' | 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const shelterIds = await idQb.getRawMany();

    if (shelterIds.length === 0) {
      return { items: [], total };
    }

    // Step 2: Load full shelter entities with all relations
    const ids = shelterIds.map(row => row.id);
    const itemsQb = this.buildShelterBaseQB()
      .where('shelter.id IN (:...ids)', { ids })
      .orderBy(orderBy, orderDir as 'ASC' | 'DESC')
      .addOrderBy('teams.numberTeam', 'ASC');

    const items = await itemsQb.getMany();

    return { items, total };
  }

  async findAllSimple(ctx?: RoleCtx): Promise<ShelterEntity[]> {
    const qb = this.buildShelterBaseQB()
      .orderBy('shelter.name', 'ASC')
      .addOrderBy('teams.numberTeam', 'ASC');

    this.applyRoleFilter(qb, ctx);

    return qb.getMany();
  }

  /**
   * Busca os IDs dos abrigos onde o líder está em pelo menos uma equipe
   * Usado para depois buscar todos os abrigos com todas as equipes
   */
  async findShelterIdsForLeader(userId: string): Promise<string[]> {
    const result = await this.shelterRepo
      .createQueryBuilder('shelter')
      .innerJoin('shelter.teams', 'team')
      .innerJoin('team.leaders', 'leader')
      .innerJoin('leader.user', 'leaderUser')
      .where('leaderUser.id = :userId', { userId })
      .select('DISTINCT shelter.id', 'id')
      .getRawMany();

    return result.map((row: any) => row.id);
  }

  async findOneOrFailForResponse(id: string, ctx?: RoleCtx): Promise<ShelterEntity | null> {
    const qb = this.buildShelterBaseQB()
      .where('shelter.id = :id', { id })
      .orderBy('shelter.name', 'ASC')
      .addOrderBy('teams.numberTeam', 'ASC')
      .addOrderBy('members.createdAt', 'ASC');
    this.applyRoleFilter(qb, ctx);

    return qb.getOne();
  }

  private async findOneOrFailForResponseTx(
    manager: EntityManager,
    id: string,
  ): Promise<ShelterEntity> {
    const shelterData = await manager.query(`
      SELECT s.id, s.name, s.description, s.teamsQuantity, s.createdAt, s.updatedAt, s.address_id,
             a.id as address_id, a.street, a.number, a.district, a.city, a.state, a.postalCode, a.complement, a.createdAt as address_createdAt, a.updatedAt as address_updatedAt
      FROM shelters s
      LEFT JOIN addresses a ON a.id = s.address_id
      WHERE s.id = ?
    `, [id]);

    if (!shelterData.length) {
      throw new NotFoundException('Shelter not found');
    }

    const shelter = shelterData[0];

    // Buscar teams do abrigo
    const teamsData = await manager.query(`
      SELECT t.id, t.numberTeam, t.description, t.createdAt, t.updatedAt
      FROM teams t
      WHERE t.shelter_id = ?
      ORDER BY t.numberTeam ASC
    `, [id]);

    const leadersData = await manager.query(`
      SELECT lp.id, lp.active, lp.createdAt, lp.updatedAt, lp.user_id,
             u.id as user_id, u.name, u.email, u.phone, u.active as user_active, u.completed, u.commonUser, u.role,
             t.id as team_id, t.numberTeam as team_numberTeam
      FROM leader_profiles lp
      JOIN users u ON u.id = lp.user_id
      JOIN leader_teams lt ON lt.leader_id = lp.id
      JOIN teams t ON t.id = lt.team_id
      WHERE t.shelter_id = ?
    `, [id]);

    const membersData = await manager.query(`
      SELECT tp.id, tp.active, tp.createdAt, tp.updatedAt, tp.user_id, tp.team_id,
             u.id as user_id, u.name, u.email, u.phone, u.active as user_active, u.completed, u.commonUser, u.role,
             t.id as team_id, t.numberTeam as team_numberTeam
      FROM member_profiles tp
      JOIN users u ON u.id = tp.user_id
      JOIN teams t ON t.id = tp.team_id
      WHERE t.shelter_id = ?
    `, [id]);

    // Construir o objeto ShelterEntity manualmente
    const shelterEntity = new ShelterEntity();
    shelterEntity.id = shelter.id;
    shelterEntity.name = shelter.name;
    shelterEntity.description = shelter.description;
    shelterEntity.teamsQuantity = shelter.teamsQuantity;
    shelterEntity.createdAt = shelter.createdAt;
    shelterEntity.updatedAt = shelter.updatedAt;

    if (shelter.address_id) {
      const addressEntity = new AddressEntity();
      addressEntity.id = shelter.address_id;
      addressEntity.street = shelter.street;
      addressEntity.number = shelter.number;
      addressEntity.district = shelter.district;
      addressEntity.city = shelter.city;
      addressEntity.state = shelter.state;
      addressEntity.postalCode = shelter.postalCode;
      addressEntity.complement = shelter.complement;
      addressEntity.createdAt = shelter.address_createdAt;
      addressEntity.updatedAt = shelter.address_updatedAt;
      shelterEntity.address = addressEntity;
    }

    shelterEntity.teams = teamsData.map((teamData) => {
      const teamEntity = new TeamEntity();
      teamEntity.id = teamData.id;
      teamEntity.numberTeam = teamData.numberTeam;
      teamEntity.description = teamData.description;
      teamEntity.createdAt = teamData.createdAt;
      teamEntity.updatedAt = teamData.updatedAt;
      teamEntity.shelter = shelterEntity;

      const teamLeaders = leadersData
        .filter((ld: any) => ld.team_id === teamData.id)
        .map((leaderData: any) => {
          const leaderEntity = new LeaderProfileEntity();
          leaderEntity.id = leaderData.id;
          leaderEntity.active = leaderData.active;
          leaderEntity.createdAt = leaderData.createdAt;
          leaderEntity.updatedAt = leaderData.updatedAt;

          const userEntity = new UserEntity();
          userEntity.id = leaderData.user_id;
          userEntity.name = leaderData.name;
          userEntity.email = leaderData.email;
          userEntity.phone = leaderData.phone;
          userEntity.active = leaderData.user_active;
          userEntity.completed = leaderData.completed;
          userEntity.commonUser = leaderData.commonUser;
          userEntity.role = leaderData.role;

          leaderEntity.user = userEntity;
          return leaderEntity;
        });

      const teamMembers = membersData
        .filter((td: any) => td.team_id === teamData.id)
        .map((memberData: any) => {
          const memberEntity = new MemberProfileEntity();
          memberEntity.id = memberData.id;
          memberEntity.active = memberData.active;
          memberEntity.createdAt = memberData.createdAt;
          memberEntity.updatedAt = memberData.updatedAt;

          const userEntity = new UserEntity();
          userEntity.id = memberData.user_id;
          userEntity.name = memberData.name;
          userEntity.email = memberData.email;
          userEntity.phone = memberData.phone;
          userEntity.active = memberData.user_active;
          userEntity.completed = memberData.completed;
          userEntity.commonUser = memberData.commonUser;
          userEntity.role = memberData.role;

          memberEntity.user = userEntity;
          return memberEntity;
        });

      teamEntity.leaders = teamLeaders;
      teamEntity.members = teamMembers;
      return teamEntity;
    });

    return shelterEntity;
  }

  async list(ctx?: RoleCtx, showAddress = true): Promise<ShelterSelectOptionDto[]> {
    const qb = this.buildShelterBaseQB().orderBy('shelter.name', 'ASC');
    this.applyRoleFilter(qb, ctx);
    const items = await qb.getMany();
    return items.map(s => toShelterSelectOption(s, showAddress));
  }

  async createShelter(dto: CreateShelterDto): Promise<ShelterEntity> {
    return this.dataSource.transaction(async (manager) => {
      const shelterRepo = manager.withRepository(this.shelterRepo);
      const addressRepo = manager.withRepository(this.addressRepo);

      const address = addressRepo.create(dto.address);
      await addressRepo.save(address);

      const shelter = shelterRepo.create({
        name: dto.name,
        description: dto.description,
        teamsQuantity: dto.teamsQuantity,
        address,
      });

      try {
        await shelterRepo.save(shelter);
      } catch (e: any) {
        if (e?.code === 'ER_DUP_ENTRY' || e?.code === '23505') {
          throw new ConflictException('A Shelter with this name already exists');
        }
        throw e;
      }

      return shelter;
    });
  }

  async updateShelter(id: string, dto: UpdateShelterDto): Promise<ShelterEntity> {
    return this.dataSource.transaction(async (manager) => {
      const shelterRepo = manager.withRepository(this.shelterRepo);
      const addressRepo = manager.withRepository(this.addressRepo);

      const shelter = await shelterRepo.findOne({
        where: { id },
        relations: { address: true },
      });
      if (!shelter) throw new NotFoundException('Shelter not found');

      if (dto.name !== undefined) shelter.name = dto.name as any;
      if (dto.description !== undefined) shelter.description = dto.description;
      if (dto.teamsQuantity !== undefined) shelter.teamsQuantity = dto.teamsQuantity;

      if (dto.address) {
        if (shelter.address) {
          const addressUpdate: any = {};
          if (dto.address.street !== undefined) addressUpdate.street = dto.address.street;
          if (dto.address.number !== undefined) addressUpdate.number = dto.address.number;
          if (dto.address.district !== undefined) addressUpdate.district = dto.address.district;
          if (dto.address.city !== undefined) addressUpdate.city = dto.address.city;
          if (dto.address.state !== undefined) addressUpdate.state = dto.address.state;
          if (dto.address.postalCode !== undefined) addressUpdate.postalCode = dto.address.postalCode;
          if (dto.address.complement !== undefined) addressUpdate.complement = dto.address.complement;

          Object.assign(shelter.address, addressUpdate);
          await addressRepo.save(shelter.address);
        } else {
          const { id, createdAt, updatedAt, ...addressData } = dto.address as any;
          const newAddress = addressRepo.create(addressData);
          const savedAddress = await addressRepo.save(newAddress);
          shelter.address = Array.isArray(savedAddress) ? savedAddress[0] : savedAddress;
        }
      }

      await shelterRepo.save(shelter);


      return this.findOneOrFailForResponseTx(manager, shelter.id);
    });
  }


  async deleteById(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const txShelter = manager.withRepository(this.shelterRepo);
      const txMember = manager.withRepository(this.memberProfileRepo);
      const txLeader = manager.withRepository(this.leaderRepo);
      const txAddress = manager.withRepository(this.addressRepo);
      const txTeam = manager.withRepository(this.teamRepo);

      const shelter = await txShelter.findOne({
        where: { id },
        relations: { address: true },
      });
      if (!shelter) throw new NotFoundException('Shelter not found');

      const teams = await txTeam.find({
        where: { shelter: { id } },
      });

      for (const team of teams) {
        await manager.query(
          `DELETE FROM leader_teams WHERE team_id = ?`,
          [team.id]
        );

        await manager.query(
          `UPDATE member_profiles SET team_id = NULL WHERE team_id = ?`,
          [team.id]
        );
      }

      if (teams.length > 0) {
        await txTeam.remove(teams);
      }

      const txMedia = manager.withRepository(this.mediaRepo);
      const mediaItems = await txMedia.find({
        where: { targetId: id, targetType: 'ShelterEntity' },
      });
      if (mediaItems.length > 0) {
        for (const media of mediaItems) {
          if (media.isLocalFile && media.url) {
            try {
              await this.s3Service.delete(media.url);
            } catch (error: any) {
              this.logger.warn(`Error deleting file from S3: ${error.message}`);
            }
          }
        }
        await txMedia.remove(mediaItems);
      }

      const txRoute = manager.withRepository(this.routeRepo);
      const route = await txRoute.findOne({
        where: { entityType: 'shelterPage', entityId: id },
      });
      if (route) {
        await txRoute.remove(route);
      }

      const addressId = shelter.address?.id;
      await txShelter.delete(shelter.id);

      if (addressId) {
        await txAddress.delete(addressId);
      }
    });
  }


  async userHasAccessToShelter(shelterId: string, ctx?: RoleCtx): Promise<boolean> {
    const role = ctx?.role?.toLowerCase();
    const userId = ctx?.userId;
    if (!role || role === 'admin') return true;
    if (!userId) return false;

    if (role !== 'leader') return false;

    const qb = this.shelterRepo
      .createQueryBuilder('shelter')
      .leftJoin('shelter.teams', 'teams')
      .leftJoin('teams.leaders', 'leaders')
      .leftJoin('leaders.user', 'leaderUser')
      .where('shelter.id = :shelterId', { shelterId })
      .andWhere('leaderUser.id = :uid', { uid: userId });

    const hasGetExists = typeof (qb as any).getExists === 'function';
    return hasGetExists ? !!(await (qb as any).getExists()) : (await qb.getCount()) > 0;
  }

  async getLeaderProfileIdByUserId(userId: string): Promise<string | null> {
    const leader = await this.leaderRepo.findOne({
      where: { user: { id: userId } as any },
      select: { id: true },
    });
    return leader?.id ?? null;
  }

}