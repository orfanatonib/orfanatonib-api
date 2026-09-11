import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";
import { VisitMaterialsPageRepository } from "./visit-material-page.repository";
import { VisitMaterialsPageEntity } from "../entities/visit-material-page.entity";
import { TestamentType } from "../enums/testament-type.enum";
import { buildPageEntity } from "../visit-material-page.fixtures";

type WhereCall = [string, Record<string, unknown>?];

const createQueryBuilderMock = () => {
  const builder = {
    leftJoinAndSelect: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    getMany: jest.fn().mockResolvedValue([buildPageEntity()]),
  };
  builder.leftJoinAndSelect.mockReturnValue(builder);
  builder.andWhere.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  return builder;
};

describe("VisitMaterialsPageRepository", () => {
  let queryBuilder: ReturnType<typeof createQueryBuilderMock>;
  let typeOrmRepository: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let repository: VisitMaterialsPageRepository;

  const whereClauses = (): WhereCall[] =>
    queryBuilder.andWhere.mock.calls as WhereCall[];
  const clauseMatching = (fragment: string): WhereCall | undefined =>
    whereClauses().find(([sql]) => sql.includes(fragment));

  beforeEach(async () => {
    jest.clearAllMocks();
    queryBuilder = createQueryBuilderMock();
    typeOrmRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn().mockResolvedValue(buildPageEntity()),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    dataSource = { transaction: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VisitMaterialsPageRepository,
        {
          provide: getRepositoryToken(VisitMaterialsPageEntity),
          useValue: typeOrmRepository,
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = moduleRef.get(VisitMaterialsPageRepository);
  });

  describe("findAll", () => {
    it("joins the route and orders by creation, newest first", async () => {
      await repository.findAll();

      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        "page.route",
        "route",
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        "page.createdAt",
        "DESC",
      );
      expect(whereClauses()).toHaveLength(0);
    });

    it("filters by testament", async () => {
      await repository.findAll({ testament: TestamentType.NEW_TESTAMENT });

      expect(clauseMatching("page.testament")?.[1]).toEqual({
        testament: TestamentType.NEW_TESTAMENT,
      });
    });

    it("parameterizes the free-text search over title, subtitle and description", async () => {
      await repository.findAll({ searchString: "  visita  " });

      const clause = clauseMatching("page.title");
      expect(clause?.[0]).toContain("page.subtitle");
      expect(clause?.[0]).toContain("page.description");
      expect(clause?.[1]).toEqual({ searchString: "%visita%" });
    });

    it("ignores a blank search", async () => {
      await repository.findAll({ searchString: "   " });

      expect(clauseMatching("page.title")).toBeUndefined();
    });
  });

  describe("findById", () => {
    it("loads the route relation", async () => {
      await repository.findById("page-id");

      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: "page-id" },
        relations: ["route"],
      });
    });

    it("uses the transactional manager when given one", async () => {
      const scoped = { findOne: jest.fn().mockResolvedValue(null) };
      const getRepository = jest.fn().mockReturnValue(scoped);
      const manager = { getRepository } as unknown as EntityManager;

      await repository.findById("page-id", manager);

      expect(getRepository).toHaveBeenCalledWith(VisitMaterialsPageEntity);
      expect(scoped.findOne).toHaveBeenCalled();
      expect(typeOrmRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe("findCurrentWeek", () => {
    it("looks up the flagged page with its route", async () => {
      await repository.findCurrentWeek();

      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { currentWeek: true },
        relations: ["route"],
      });
    });
  });

  describe("writes", () => {
    it("delegates create and save to the default repository", async () => {
      const page = buildPageEntity();
      typeOrmRepository.create.mockReturnValue(page);
      typeOrmRepository.save.mockResolvedValue(page);

      expect(repository.create({ title: "Nova" })).toBe(page);
      await expect(repository.save(page)).resolves.toBe(page);
    });

    it("routes save through the transactional manager when given one", async () => {
      const page = buildPageEntity();
      const scoped = { save: jest.fn().mockResolvedValue(page) };
      const manager = {
        getRepository: jest.fn().mockReturnValue(scoped),
      } as unknown as EntityManager;

      await repository.save(page, manager);

      expect(scoped.save).toHaveBeenCalledWith(page);
      expect(typeOrmRepository.save).not.toHaveBeenCalled();
    });

    it("removes a page and resolves to void", async () => {
      const page = buildPageEntity();

      await expect(repository.remove(page)).resolves.toBeUndefined();
      expect(typeOrmRepository.remove).toHaveBeenCalledWith(page);
    });
  });

  describe("runInTransaction", () => {
    it("delegates to the DataSource transaction", async () => {
      dataSource.transaction.mockImplementation(
        (work: (manager: EntityManager) => Promise<string>) =>
          work({} as EntityManager),
      );

      await expect(
        repository.runInTransaction(() => Promise.resolve("done")),
      ).resolves.toBe("done");
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });
});
