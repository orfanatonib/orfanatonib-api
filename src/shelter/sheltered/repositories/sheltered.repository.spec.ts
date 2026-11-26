import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { UserRole } from "src/core/auth/auth.types";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { ShelteredRepository } from "./sheltered.repository";
import { ShelteredEntity } from "../entities/sheltered.entity";
import { ShelteredOrderBy } from "../enums/sheltered-order-by.enum";
import { ShelteredGender } from "../enums/sheltered-gender.enum";
import { AcceptedJesusFilter } from "../enums/accepted-jesus-filter.enum";
import { ShelteredActiveFilter } from "../enums/sheltered-active-filter.enum";
import { ShelteredSimpleFilters } from "../types";
import {
  buildAdminContext,
  buildLeaderContext,
  buildQueryShelteredDto,
  buildShelteredEntity,
} from "../sheltered.fixtures";

type WhereCall = [string, Record<string, unknown>?];

const createQueryBuilderMock = () => {
  const builder = {
    leftJoinAndSelect: jest.fn(),
    leftJoin: jest.fn(),
    andWhere: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    distinct: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[buildShelteredEntity()], 1]),
    getOne: jest.fn().mockResolvedValue(buildShelteredEntity()),
  };

  for (const key of [
    "leftJoinAndSelect",
    "leftJoin",
    "andWhere",
    "where",
    "orderBy",
    "addOrderBy",
    "distinct",
    "skip",
    "take",
  ] as const) {
    builder[key].mockReturnValue(builder);
  }

  return builder;
};

describe("ShelteredRepository", () => {
  let queryBuilder: ReturnType<typeof createQueryBuilderMock>;
  let typeOrmRepository: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let repository: ShelteredRepository;

  const whereClauses = (): WhereCall[] =>
    queryBuilder.andWhere.mock.calls as WhereCall[];
  const clauseMatching = (fragment: string): WhereCall | undefined =>
    whereClauses().find(([sql]) => sql.includes(fragment));

  const simpleFilters = (
    overrides: Partial<ShelteredSimpleFilters> = {},
  ): ShelteredSimpleFilters => ({
    page: 1,
    limit: 20,
    acceptedJesus: AcceptedJesusFilter.ALL,
    active: ShelteredActiveFilter.ALL,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    queryBuilder = createQueryBuilderMock();
    typeOrmRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1, raw: [] }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ShelteredRepository,
        {
          provide: getRepositoryToken(ShelteredEntity),
          useValue: typeOrmRepository as unknown as Repository<ShelteredEntity>,
        },
      ],
    }).compile();

    repository = moduleRef.get(ShelteredRepository);
  });

  describe("findAllPaginated", () => {
    it("sorts through the allowlist and paginates deterministically", async () => {
      const query = buildQueryShelteredDto({
        page: 3,
        limit: 10,
        orderBy: ShelteredOrderBy.JOINED_AT,
        order: SortOrder.DESC,
      });

      const result = await repository.findAllPaginated(
        query,
        buildAdminContext(),
      );

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        "sheltered.joinedAt",
        SortOrder.DESC,
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        "sheltered.id",
        SortOrder.ASC,
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({ items: [buildShelteredEntity()], total: 1 });
    });

    it("falls back to ascending order for anything other than DESC", async () => {
      await repository.findAllPaginated(
        buildQueryShelteredDto({ order: SortOrder.ASC }),
        buildAdminContext(),
      );

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        "sheltered.name",
        SortOrder.ASC,
      );
    });

    it("does not narrow the query for an admin", async () => {
      await repository.findAllPaginated(
        buildQueryShelteredDto(),
        buildAdminContext(),
      );

      expect(queryBuilder.leftJoin).not.toHaveBeenCalled();
      expect(clauseMatching("leaderUser.id")).toBeUndefined();
    });

    it("narrows the query to the shelters of a leader", async () => {
      await repository.findAllPaginated(
        buildQueryShelteredDto(),
        buildLeaderContext(),
      );

      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        "shelter.teams",
        "team",
      );
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        "team.leaders",
        "leader",
      );
      expect(clauseMatching("leaderUser.id")).toEqual([
        "leaderUser.id = :actorId",
        { actorId: "leader-user-id" },
      ]);
    });

    it("narrows the query to the shelters of a member", async () => {
      await repository.findAllPaginated(buildQueryShelteredDto(), {
        userId: "member-user-id",
        role: UserRole.MEMBER,
      });

      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        "team.members",
        "members",
      );
      expect(clauseMatching("memberUser.id")).toEqual([
        "memberUser.id = :actorId",
        { actorId: "member-user-id" },
      ]);
    });

    it("parameterizes the free-text search and ignores blank input", async () => {
      await repository.findAllPaginated(
        buildQueryShelteredDto({ searchString: "  Maria  " }),
        buildAdminContext(),
      );

      expect(clauseMatching("sheltered.name")?.[1]).toEqual({
        searchString: "%Maria%",
      });

      jest.clearAllMocks();
      await repository.findAllPaginated(
        buildQueryShelteredDto({ searchString: "   " }),
        buildAdminContext(),
      );

      expect(clauseMatching("sheltered.name")).toBeUndefined();
    });

    it("applies the shelter, address, gender and date-range filters", async () => {
      await repository.findAllPaginated(
        buildQueryShelteredDto({
          shelterSearchingString: "Esperança",
          addressFilter: "Centro",
          shelterId: "shelter-id",
          gender: ShelteredGender.FEMALE,
          birthDateFrom: "2010-01-01",
          birthDateTo: "2020-12-31",
          joinedFrom: "2024-01-01",
          joinedTo: "2024-12-31",
        }),
        buildAdminContext(),
      );

      expect(clauseMatching("shelter.name")?.[1]).toEqual({
        shelterSearchingString: "%Esperança%",
      });
      expect(clauseMatching("shelteredAddress.street")?.[1]).toEqual({
        addressFilter: "%Centro%",
      });
      expect(clauseMatching("shelter.id = :shelterId")?.[1]).toEqual({
        shelterId: "shelter-id",
      });
      expect(clauseMatching("sheltered.gender")?.[1]).toEqual({
        gender: ShelteredGender.FEMALE,
      });
      expect(clauseMatching("birthDate >= :birthDateFrom")?.[1]).toEqual({
        birthDateFrom: "2010-01-01",
      });
      expect(clauseMatching("birthDate <= :birthDateTo")?.[1]).toEqual({
        birthDateTo: "2020-12-31",
      });
      expect(clauseMatching("joinedAt >= :joinedFrom")?.[1]).toEqual({
        joinedFrom: "2024-01-01",
      });
      expect(clauseMatching("joinedAt <= :joinedTo")?.[1]).toEqual({
        joinedTo: "2024-12-31",
      });
    });

    it("adds no filter clause when the query carries only pagination", async () => {
      await repository.findAllPaginated(
        buildQueryShelteredDto(),
        buildAdminContext(),
      );

      expect(whereClauses()).toHaveLength(0);
    });
  });

  describe("findAllSimple", () => {
    it("filters on the acceptance decisions with bound parameters", async () => {
      await repository.findAllSimple(
        simpleFilters({ acceptedJesus: AcceptedJesusFilter.ACCEPTED }),
        buildAdminContext(),
      );

      const clause = clauseMatching("accepted_christs");
      expect(clause?.[0]).toContain("EXISTS");
      expect(clause?.[0]).not.toContain("NOT EXISTS");
      expect(clause?.[1]).toEqual({ decisions: ["ACCEPTED", "RECONCILED"] });
    });

    it("inverts the subquery for the not-accepted filter", async () => {
      await repository.findAllSimple(
        simpleFilters({ acceptedJesus: AcceptedJesusFilter.NOT_ACCEPTED }),
        buildAdminContext(),
      );

      expect(clauseMatching("accepted_christs")?.[0]).toContain("NOT EXISTS");
    });

    it('skips the acceptance subquery entirely for the "all" filter', async () => {
      await repository.findAllSimple(simpleFilters(), buildAdminContext());

      expect(clauseMatching("accepted_christs")).toBeUndefined();
    });

    it("maps the active filter onto a boolean parameter", async () => {
      await repository.findAllSimple(
        simpleFilters({ active: ShelteredActiveFilter.INACTIVE }),
        buildAdminContext(),
      );

      expect(clauseMatching("sheltered.active")?.[1]).toEqual({
        active: false,
      });
    });

    it("searches the acolhido name too, so the selector finds a child by name", async () => {
      await repository.findAllSimple(
        simpleFilters({ searchString: "Maria" }),
        buildAdminContext(),
      );

      const clause = clauseMatching("searchString");
      expect(clause?.[0]).toContain("LOWER(sheltered.name) LIKE");
      expect(clause?.[1]).toEqual({ searchString: "%Maria%" });
    });

    it("lists active records first and paginates", async () => {
      await repository.findAllSimple(
        simpleFilters({ page: 2, limit: 5 }),
        buildAdminContext(),
      );

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        "sheltered.active",
        SortOrder.DESC,
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(5);
      expect(queryBuilder.take).toHaveBeenCalledWith(5);
    });
  });

  describe("findOneForResponse", () => {
    it("applies the actor scope to the detail lookup", async () => {
      await repository.findOneForResponse("sheltered-id", buildLeaderContext());

      expect(queryBuilder.where).toHaveBeenCalledWith("sheltered.id = :id", {
        id: "sheltered-id",
      });
      expect(clauseMatching("leaderUser.id")).toBeDefined();
    });
  });

  describe("writes", () => {
    it("delegates create to the TypeORM repository", () => {
      const entity = buildShelteredEntity();
      typeOrmRepository.create.mockReturnValue(entity);

      expect(repository.create({ name: "Maria" })).toBe(entity);
      expect(typeOrmRepository.create).toHaveBeenCalledWith({ name: "Maria" });
    });

    it("saves through the default repository when no manager is given", async () => {
      const entity = buildShelteredEntity();
      typeOrmRepository.save.mockResolvedValue(entity);

      await expect(repository.save(entity)).resolves.toBe(entity);
      expect(typeOrmRepository.save).toHaveBeenCalledWith(entity);
    });

    it("saves through the transactional manager when one is given", async () => {
      const entity = buildShelteredEntity();
      const transactionalRepository = {
        save: jest.fn().mockResolvedValue(entity),
      };
      const getRepository = jest.fn().mockReturnValue(transactionalRepository);
      const manager = { getRepository } as unknown as EntityManager;

      await repository.save(entity, manager);

      expect(getRepository).toHaveBeenCalledWith(ShelteredEntity);
      expect(transactionalRepository.save).toHaveBeenCalledWith(entity);
      expect(typeOrmRepository.save).not.toHaveBeenCalled();
    });

    it("deletes by id and resolves to void", async () => {
      await expect(
        repository.deleteById("sheltered-id"),
      ).resolves.toBeUndefined();
      expect(typeOrmRepository.delete).toHaveBeenCalledWith("sheltered-id");
    });
  });
});
