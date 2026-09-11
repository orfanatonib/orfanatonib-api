import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";
import { UserRole } from "src/core/auth/auth.types";
import { RouteEntity } from "src/infrastructure/route/route-page.entity";
import { AddressEntity } from "src/shelter/address/entities/address.entity/address.entity";
import { LeaderProfileEntity } from "src/shelter/leader-profile/entities/leader-profile.entity/leader-profile.entity";
import { MemberProfileEntity } from "src/shelter/member-profile/entities/member-profile.entity/member-profile.entity";
import { TeamEntity } from "src/shelter/team/entities/team.entity";
import { ShelterEntity } from "../entities/shelter.entity/shelter.entity";
import { SheltersRepository } from "./shelters.repository";
import { SHELTER_ROUTE_ENTITY_TYPE } from "../constants";
import {
  buildAdminContext,
  buildAnonymousContext,
  buildCreateShelterDto,
  buildLeaderContext,
  buildMemberContext,
  buildQuerySheltersDto,
  buildRouteEntity,
  buildShelterEntity,
  buildTeamEntity,
  buildUpdateShelterDto,
  FIXED_CREATED_AT,
  FIXED_UPDATED_AT,
} from "../shelter.fixtures";

type WhereCall = [string, Record<string, unknown>?];

const createQueryBuilderMock = () => {
  const builder = {
    leftJoinAndSelect: jest.fn(),
    leftJoin: jest.fn(),
    innerJoin: jest.fn(),
    addSelect: jest.fn(),
    select: jest.fn(),
    andWhere: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    distinct: jest.fn(),
    offset: jest.fn(),
    limit: jest.fn(),
    clone: jest.fn(),
    getCount: jest.fn().mockResolvedValue(0),
    getRawMany: jest.fn().mockResolvedValue([]),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
  };

  for (const key of [
    "leftJoinAndSelect",
    "leftJoin",
    "innerJoin",
    "addSelect",
    "select",
    "andWhere",
    "where",
    "orderBy",
    "addOrderBy",
    "distinct",
    "offset",
    "limit",
  ] as const) {
    builder[key].mockReturnValue(builder);
  }
  builder.clone.mockReturnValue(builder);

  return builder;
};

describe("SheltersRepository", () => {
  let queryBuilder: ReturnType<typeof createQueryBuilderMock>;
  let shelterRepo: Record<string, jest.Mock>;
  let addressRepo: Record<string, jest.Mock>;
  let teamRepo: Record<string, jest.Mock>;
  let routeRepo: Record<string, jest.Mock>;
  let leaderRepo: Record<string, jest.Mock>;
  let memberRepo: Record<string, jest.Mock>;
  let manager: Record<string, jest.Mock>;
  let dataSource: { transaction: jest.Mock };
  let repository: SheltersRepository;

  const whereClauses = (): WhereCall[] =>
    queryBuilder.andWhere.mock.calls as WhereCall[];
  const clauseMatching = (fragment: string): WhereCall | undefined =>
    whereClauses().find(([sql]) => sql.includes(fragment));

  beforeEach(async () => {
    jest.clearAllMocks();
    queryBuilder = createQueryBuilderMock();

    const repoFor = (extra: Record<string, jest.Mock> = {}) => ({
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      ...extra,
    });

    shelterRepo = repoFor();
    addressRepo = repoFor();
    teamRepo = repoFor();
    routeRepo = repoFor();
    leaderRepo = repoFor();
    memberRepo = repoFor();

    const byEntity = new Map<unknown, Record<string, jest.Mock>>([
      [shelterRepo, shelterRepo],
      [addressRepo, addressRepo],
      [teamRepo, teamRepo],
      [routeRepo, routeRepo],
    ]);

    manager = {
      withRepository: jest
        .fn()
        .mockImplementation((repo: unknown) => byEntity.get(repo) ?? repo),
      getRepository: jest.fn().mockReturnValue(shelterRepo),
      query: jest.fn().mockResolvedValue([]),
    };

    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation((work: (m: EntityManager) => Promise<unknown>) =>
          work(manager as unknown as EntityManager),
        ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SheltersRepository,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(ShelterEntity), useValue: shelterRepo },
        { provide: getRepositoryToken(AddressEntity), useValue: addressRepo },
        {
          provide: getRepositoryToken(LeaderProfileEntity),
          useValue: leaderRepo,
        },
        {
          provide: getRepositoryToken(MemberProfileEntity),
          useValue: memberRepo,
        },
        { provide: getRepositoryToken(TeamEntity), useValue: teamRepo },
        { provide: getRepositoryToken(RouteEntity), useValue: routeRepo },
      ],
    }).compile();
    moduleRef.useLogger(false);

    repository = moduleRef.get(SheltersRepository);
  });

  describe("findAllPaginated", () => {
    it("returns an empty page without loading any shelter", async () => {
      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getRawMany.mockResolvedValue([]);

      await expect(
        repository.findAllPaginated(buildQuerySheltersDto()),
      ).resolves.toEqual({ items: [], total: 0 });

      expect(queryBuilder.getMany).not.toHaveBeenCalled();
    });

    it("counts before paging and loads only the ids of the page", async () => {
      queryBuilder.getCount.mockResolvedValue(30);
      queryBuilder.getRawMany.mockResolvedValue([{ id: "shelter-1" }]);
      queryBuilder.getMany.mockResolvedValue([buildShelterEntity()]);

      const result = await repository.findAllPaginated(
        buildQuerySheltersDto({ page: 3, limit: 5 }),
      );

      expect(queryBuilder.offset).toHaveBeenCalledWith(10);
      expect(queryBuilder.limit).toHaveBeenCalledWith(5);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        "shelter.id IN (:...ids)",
        { ids: ["shelter-1"] },
      );
      expect(result.total).toBe(30);
      expect(result.items).toHaveLength(1);
    });

    it.each([
      ["city", "address.city"],
      ["createdAt", "shelter.createdAt"],
    ])("orders by %s when asked", async (sort, column) => {
      queryBuilder.getRawMany.mockResolvedValue([{ id: "shelter-1" }]);

      await repository.findAllPaginated(
        buildQuerySheltersDto({
          sort: sort as "city",
          order: "desc",
        }),
      );

      expect(queryBuilder.addSelect).toHaveBeenCalledWith(column, "orderField");
      expect(queryBuilder.orderBy).toHaveBeenCalledWith("orderField", "DESC");
    });

    it("falls back to the shelter name for an unknown sort", async () => {
      await repository.findAllPaginated(
        buildQuerySheltersDto({
          sort: "inexistente" as "name",
          order: undefined,
        }),
      );

      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        "shelter.name",
        "orderField",
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith("orderField", "ASC");
    });

    it("filters by shelter name and ignores the free search when both come", async () => {
      await repository.findAllPaginated(
        buildQuerySheltersDto({
          shelterName: "  Esperança  ",
          searchString: "Manaus",
        }),
      );

      expect(clauseMatching("LOWER(shelter.name) LIKE")).toEqual([
        "LOWER(shelter.name) LIKE LOWER(:shelterName)",
        { shelterName: "%Esperança%" },
      ]);
      expect(clauseMatching("address.city")).toBeUndefined();
    });

    it("searches name, address and people on the free search", async () => {
      await repository.findAllPaginated(
        buildQuerySheltersDto({ searchString: " Maria " }),
      );

      const clause = clauseMatching("address.district");
      expect(clause?.[1]).toEqual({ searchString: "%Maria%" });
      expect(clause?.[0]).toContain("leader_teams");
      expect(clause?.[0]).toContain("member_profiles");
    });

    it("ignores a blank search string", async () => {
      await repository.findAllPaginated(
        buildQuerySheltersDto({ searchString: "   ", shelterName: "  " }),
      );

      expect(whereClauses()).toHaveLength(0);
    });
  });

  describe("role scoping", () => {
    it("does not narrow the query for an admin", async () => {
      await repository.findAllSimple(buildAdminContext());

      expect(whereClauses()).toHaveLength(0);
      expect(queryBuilder.distinct).not.toHaveBeenCalled();
    });

    it("does not narrow the query when there is no actor", async () => {
      await repository.findAllSimple();
      await repository.findAllSimple(buildAnonymousContext());

      expect(whereClauses()).toHaveLength(0);
    });

    it("narrows a leader to the shelters they lead", async () => {
      await repository.findAllSimple(buildLeaderContext());

      expect(clauseMatching("leaderUser.id")).toEqual([
        "leaderUser.id = :uid",
        { uid: "leader-user-id" },
      ]);
      expect(queryBuilder.distinct).toHaveBeenCalledWith(true);
    });

    it("narrows a member to the shelters they belong to", async () => {
      await repository.findAllSimple(buildMemberContext());

      expect(clauseMatching("memberUser.id")).toEqual([
        "memberUser.id = :uid",
        { uid: "member-user-id" },
      ]);
    });

    it("returns nothing for a role it does not know", async () => {
      await repository.findAllSimple({
        userId: "user-id",
        role: "auditor" as UserRole,
      });

      expect(clauseMatching("1 = 0")).toBeDefined();
    });

    it("does not narrow a leader whose id is missing", async () => {
      await repository.findAllSimple(buildLeaderContext({ userId: null }));

      expect(whereClauses()).toHaveLength(0);
    });
  });

  it("findOneOrFailForResponse scopes the lookup to the actor", async () => {
    queryBuilder.getOne.mockResolvedValue(buildShelterEntity());

    await repository.findOneOrFailForResponse(
      "shelter-id",
      buildLeaderContext(),
    );

    expect(queryBuilder.where).toHaveBeenCalledWith("shelter.id = :id", {
      id: "shelter-id",
    });
    expect(clauseMatching("leaderUser.id")).toBeDefined();
  });

  it("findShelterIdsForLeader returns the distinct ids", async () => {
    queryBuilder.getRawMany.mockResolvedValue([
      { id: "shelter-1" },
      { id: "shelter-2" },
    ]);

    await expect(
      repository.findShelterIdsForLeader("leader-user-id"),
    ).resolves.toEqual(["shelter-1", "shelter-2"]);
    expect(queryBuilder.select).toHaveBeenCalledWith(
      "DISTINCT shelter.id",
      "id",
    );
  });

  describe("list and listTeamsForPublic", () => {
    it("maps the shelters to select options honouring the address flag", async () => {
      queryBuilder.getMany.mockResolvedValue([buildShelterEntity()]);

      await expect(
        repository.list(buildAdminContext(), false),
      ).resolves.toEqual([
        { id: "shelter-id", name: "Abrigo Esperança", leader: true },
      ]);
    });

    it("drops teams whose shelter is gone", async () => {
      const orphan = buildTeamEntity({ id: "team-orphan" });
      const linked = buildTeamEntity({ id: "team-linked" });
      linked.shelter = buildShelterEntity();
      teamRepo.find.mockResolvedValue([orphan, linked]);

      const result = await repository.listTeamsForPublic();

      expect(result).toEqual([
        expect.objectContaining({ id: "team-linked", teamNumber: 1 }),
      ]);
    });
  });

  describe("createShelter", () => {
    it("saves the address and the shelter in a single transaction", async () => {
      const dto = buildCreateShelterDto();
      const address = { id: "address-id" };
      const shelter = buildShelterEntity();
      addressRepo.create.mockReturnValue(address);
      shelterRepo.create.mockReturnValue(shelter);

      await expect(repository.createShelter(dto)).resolves.toBe(shelter);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(addressRepo.create).toHaveBeenCalledWith(dto.address);
      expect(addressRepo.save).toHaveBeenCalledWith(address);
      expect(shelterRepo.create).toHaveBeenCalledWith({
        name: dto.name,
        description: dto.description,
        teamsQuantity: dto.teamsQuantity,
        address,
      });
    });

    it.each([["ER_DUP_ENTRY"], ["23505"]])(
      "turns the %s violation into a readable conflict",
      async (code) => {
        shelterRepo.create.mockReturnValue(buildShelterEntity());
        shelterRepo.save.mockRejectedValue(
          Object.assign(new Error(""), { code }),
        );

        await expect(
          repository.createShelter(buildCreateShelterDto()),
        ).rejects.toThrow(ConflictException);
      },
    );

    it("lets any other database failure bubble up", async () => {
      shelterRepo.create.mockReturnValue(buildShelterEntity());
      shelterRepo.save.mockRejectedValue(new Error("conexão perdida"));

      await expect(
        repository.createShelter(buildCreateShelterDto()),
      ).rejects.toThrow("conexão perdida");
    });
  });

  describe("updateShelter", () => {
    const shelterRow = {
      id: "shelter-id",
      name: "Abrigo Esperança",
      description: null,
      teamsQuantity: 1,
      createdAt: FIXED_CREATED_AT,
      updatedAt: FIXED_UPDATED_AT,
      address_id: "address-id",
      street: "Rua das Flores",
      number: "100",
      district: "Centro",
      city: "Manaus",
      state: "AM",
      postalCode: "69000000",
      complement: null,
      address_createdAt: FIXED_CREATED_AT,
      address_updatedAt: FIXED_UPDATED_AT,
    };

    const mockReload = (
      overrides: {
        shelter?: Record<string, unknown>[];
        teams?: Record<string, unknown>[];
        leaders?: Record<string, unknown>[];
        members?: Record<string, unknown>[];
      } = {},
    ) => {
      const responses = [
        overrides.shelter ?? [shelterRow],
        overrides.teams ?? [],
        overrides.leaders ?? [],
        overrides.members ?? [],
      ];
      let call = 0;
      manager.query.mockImplementation(() =>
        Promise.resolve(responses[call++] ?? []),
      );
    };

    it("rejects a shelter that does not exist", async () => {
      shelterRepo.findOne.mockResolvedValue(null);

      await expect(
        repository.updateShelter("shelter-id", buildUpdateShelterDto()),
      ).rejects.toThrow(NotFoundException);
    });

    it("applies only the fields the payload brings", async () => {
      const current = buildShelterEntity({ description: "Antiga" });
      shelterRepo.findOne.mockResolvedValue(current);
      mockReload();

      await repository.updateShelter(
        "shelter-id",
        buildUpdateShelterDto({ name: "Novo nome", description: undefined }),
      );

      expect(current.name).toBe("Novo nome");
      expect(current.description).toBe("Antiga");
      expect(shelterRepo.save).toHaveBeenCalledWith(current);
    });

    it("patches the existing address field by field", async () => {
      const current = buildShelterEntity();
      shelterRepo.findOne.mockResolvedValue(current);
      mockReload();

      await repository.updateShelter(
        "shelter-id",
        buildUpdateShelterDto({
          address: { city: "Belém", number: undefined },
        }),
      );

      expect(current.address.city).toBe("Belém");
      expect(current.address.number).toBe("100");
      expect(addressRepo.save).toHaveBeenCalledWith(current.address);
    });

    it("creates the address when the shelter had none, without copying ids", async () => {
      const current = buildShelterEntity({
        address: undefined as unknown as AddressEntity,
      });
      shelterRepo.findOne.mockResolvedValue(current);
      addressRepo.create.mockImplementation((data: unknown) => data);
      addressRepo.save.mockImplementation((data: unknown) =>
        Promise.resolve(Object.assign({ id: "nova-address-id" }, data)),
      );
      mockReload();

      await repository.updateShelter(
        "shelter-id",
        buildUpdateShelterDto({
          address: {
            id: "id-que-veio-do-cliente",
            city: "Belém",
            state: "PA",
          } as never,
        }),
      );

      expect(addressRepo.create).toHaveBeenCalledWith({
        street: undefined,
        number: undefined,
        district: undefined,
        city: "Belém",
        state: "PA",
        postalCode: undefined,
        complement: undefined,
      });
      expect(current.address).toMatchObject({ id: "nova-address-id" });
    });

    it("rebuilds the shelter from the transaction, with teams and people", async () => {
      shelterRepo.findOne.mockResolvedValue(buildShelterEntity());
      mockReload({
        teams: [
          {
            id: "team-1",
            numberTeam: 1,
            description: null,
            createdAt: FIXED_CREATED_AT,
            updatedAt: FIXED_UPDATED_AT,
          },
        ],
        leaders: [
          {
            id: "leader-1",
            team_id: "team-1",
            active: true,
            createdAt: FIXED_CREATED_AT,
            updatedAt: FIXED_UPDATED_AT,
            user_id: "leader-user-id",
            name: "Maria",
            email: "maria@orfanatonib.test",
            phone: "92999990000",
            user_active: true,
            completed: true,
            commonUser: false,
            role: UserRole.LEADER,
          },
        ],
        members: [
          {
            id: "member-1",
            team_id: "outro-time",
            active: true,
            createdAt: FIXED_CREATED_AT,
            updatedAt: FIXED_UPDATED_AT,
            user_id: "member-user-id",
            name: "João",
            email: "joao@orfanatonib.test",
            phone: "92988880000",
            user_active: true,
            completed: true,
            commonUser: true,
            role: UserRole.MEMBER,
          },
        ],
      });

      const result = await repository.updateShelter(
        "shelter-id",
        buildUpdateShelterDto(),
      );

      expect(result.address.city).toBe("Manaus");
      expect(result.description).toBeUndefined();
      expect(result.teams).toHaveLength(1);
      expect(result.teams[0].leaders[0].user.email).toBe(
        "maria@orfanatonib.test",
      );
      expect(result.teams[0].members).toHaveLength(0);
    });

    it("rebuilds the members of the team they actually belong to", async () => {
      shelterRepo.findOne.mockResolvedValue(buildShelterEntity());
      mockReload({
        teams: [
          {
            id: "team-1",
            numberTeam: 1,
            description: "Equipe 1",
            createdAt: FIXED_CREATED_AT,
            updatedAt: FIXED_UPDATED_AT,
          },
        ],
        members: [
          {
            id: "member-1",
            team_id: "team-1",
            active: true,
            createdAt: FIXED_CREATED_AT,
            updatedAt: FIXED_UPDATED_AT,
            user_id: "member-user-id",
            name: "João",
            email: "joao@orfanatonib.test",
            phone: "92988880000",
            user_active: true,
            completed: true,
            commonUser: true,
            role: UserRole.MEMBER,
          },
        ],
      });

      const result = await repository.updateShelter(
        "shelter-id",
        buildUpdateShelterDto(),
      );

      expect(result.teams[0].description).toBe("Equipe 1");
      expect(result.teams[0].members).toHaveLength(1);
      expect(result.teams[0].members[0].user).toMatchObject({
        id: "member-user-id",
        name: "João",
        commonUser: true,
        role: UserRole.MEMBER,
      });
      expect(result.teams[0].leaders).toHaveLength(0);
    });

    it("patches every address field the payload brings", async () => {
      const current = buildShelterEntity();
      shelterRepo.findOne.mockResolvedValue(current);
      mockReload();

      await repository.updateShelter(
        "shelter-id",
        buildUpdateShelterDto({
          address: {
            street: "Av. Central",
            number: "500",
            district: "Aleixo",
            city: "Belém",
            state: "PA",
            postalCode: "66000000",
            complement: "Casa",
          },
        }),
      );

      expect(current.address).toMatchObject({
        street: "Av. Central",
        number: "500",
        district: "Aleixo",
        city: "Belém",
        state: "PA",
        postalCode: "66000000",
        complement: "Casa",
      });
    });

    it("rebuilds a shelter that has no address", async () => {
      shelterRepo.findOne.mockResolvedValue(buildShelterEntity());
      mockReload({ shelter: [{ ...shelterRow, address_id: null }] });

      const result = await repository.updateShelter(
        "shelter-id",
        buildUpdateShelterDto(),
      );

      expect(result.address).toBeUndefined();
    });

    it("fails when the reload finds nothing", async () => {
      shelterRepo.findOne.mockResolvedValue(buildShelterEntity());
      manager.query.mockResolvedValue([]);

      await expect(
        repository.updateShelter("shelter-id", buildUpdateShelterDto()),
      ).rejects.toThrow(NotFoundException);
    });

    it("tolerates a raw query that does not return rows", async () => {
      shelterRepo.findOne.mockResolvedValue(buildShelterEntity());
      manager.query.mockResolvedValue(undefined);

      await expect(
        repository.updateShelter("shelter-id", buildUpdateShelterDto()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteById", () => {
    it("rejects a shelter that does not exist", async () => {
      shelterRepo.findOne.mockResolvedValue(null);

      await expect(repository.deleteById("shelter-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("unlinks the teams, then drops shelter, route and address", async () => {
      const shelter = buildShelterEntity();
      const teams = [buildTeamEntity({ id: "team-1" })];
      const route = buildRouteEntity();
      shelterRepo.findOne.mockResolvedValue(shelter);
      teamRepo.find.mockResolvedValue(teams);
      routeRepo.findOne.mockResolvedValue(route);

      await repository.deleteById("shelter-id");

      expect(manager.query).toHaveBeenCalledWith(
        "DELETE FROM leader_teams WHERE team_id = ?",
        ["team-1"],
      );
      expect(manager.query).toHaveBeenCalledWith(
        "UPDATE member_profiles SET team_id = NULL WHERE team_id = ?",
        ["team-1"],
      );
      expect(teamRepo.remove).toHaveBeenCalledWith(teams);
      expect(routeRepo.findOne).toHaveBeenCalledWith({
        where: {
          entityType: SHELTER_ROUTE_ENTITY_TYPE,
          entityId: "shelter-id",
        },
      });
      expect(routeRepo.remove).toHaveBeenCalledWith(route);
      expect(shelterRepo.delete).toHaveBeenCalledWith("shelter-id");
      expect(addressRepo.delete).toHaveBeenCalledWith("address-id");
    });

    it("drops the shelter BEFORE the route: the FK cascades the other way", async () => {
      shelterRepo.findOne.mockResolvedValue(buildShelterEntity());
      routeRepo.findOne.mockResolvedValue(buildRouteEntity());

      await repository.deleteById("shelter-id");

      expect(shelterRepo.delete.mock.invocationCallOrder[0]).toBeLessThan(
        routeRepo.remove.mock.invocationCallOrder[0],
      );
    });

    it("drops the address only after the shelter that restricts it", async () => {
      shelterRepo.findOne.mockResolvedValue(buildShelterEntity());

      await repository.deleteById("shelter-id");

      expect(shelterRepo.delete.mock.invocationCallOrder[0]).toBeLessThan(
        addressRepo.delete.mock.invocationCallOrder[0],
      );
    });

    it("skips what the shelter does not have", async () => {
      shelterRepo.findOne.mockResolvedValue(
        buildShelterEntity({ address: undefined as unknown as AddressEntity }),
      );

      await repository.deleteById("shelter-id");

      expect(teamRepo.remove).not.toHaveBeenCalled();
      expect(routeRepo.remove).not.toHaveBeenCalled();
      expect(addressRepo.delete).not.toHaveBeenCalled();
      expect(shelterRepo.delete).toHaveBeenCalledWith("shelter-id");
    });
  });

  describe("userHasAccessToShelter", () => {
    it.each([
      ["no actor", undefined],
      ["an admin", buildAdminContext()],
      ["an actor without role", buildAnonymousContext()],
    ])("is open to %s", async (_name, ctx) => {
      await expect(
        repository.userHasAccessToShelter("shelter-id", ctx),
      ).resolves.toBe(true);
    });

    it("is closed to a member", async () => {
      await expect(
        repository.userHasAccessToShelter("shelter-id", buildMemberContext()),
      ).resolves.toBe(false);
    });

    it("is closed to a leader with no id", async () => {
      await expect(
        repository.userHasAccessToShelter(
          "shelter-id",
          buildLeaderContext({ userId: null }),
        ),
      ).resolves.toBe(false);
    });

    it.each([
      [1, true],
      [0, false],
    ])("answers %s matching rows as %s", async (count, expected) => {
      queryBuilder.getCount.mockResolvedValue(count);

      await expect(
        repository.userHasAccessToShelter("shelter-id", buildLeaderContext()),
      ).resolves.toBe(expected);
    });
  });

  describe("getLeaderProfileIdByUserId", () => {
    it("returns the profile id when the user leads", async () => {
      leaderRepo.findOne.mockResolvedValue({ id: "leader-profile-id" });

      await expect(
        repository.getLeaderProfileIdByUserId("leader-user-id"),
      ).resolves.toBe("leader-profile-id");
    });

    it("returns null when the user has no leader profile", async () => {
      leaderRepo.findOne.mockResolvedValue(null);

      await expect(
        repository.getLeaderProfileIdByUserId("leader-user-id"),
      ).resolves.toBeNull();
    });
  });

  describe("transaction helpers", () => {
    it("runInTransaction hands the manager to the caller", async () => {
      const work = jest.fn().mockResolvedValue("pronto");

      await expect(repository.runInTransaction(work)).resolves.toBe("pronto");
      expect(work).toHaveBeenCalledWith(manager);
    });

    it("save uses the transaction repository when a manager is given", async () => {
      const shelter = buildShelterEntity();
      shelterRepo.save.mockResolvedValue(shelter);

      await repository.save(shelter, manager as unknown as EntityManager);

      expect(manager.withRepository).toHaveBeenCalled();
      expect(shelterRepo.save).toHaveBeenCalledWith(shelter);
    });

    it("save uses the plain repository outside a transaction", async () => {
      const shelter = buildShelterEntity();
      shelterRepo.save.mockResolvedValue(shelter);

      await repository.save(shelter);

      expect(manager.withRepository).not.toHaveBeenCalled();
      expect(shelterRepo.save).toHaveBeenCalledWith(shelter);
    });
  });
});
