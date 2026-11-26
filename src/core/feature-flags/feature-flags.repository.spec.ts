import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";

import { FeatureFlagsRepository } from "./feature-flags.repository";
import { FeatureFlagEntity } from "./entities/feature-flag.entity";
import { QueryFeatureFlagsDto } from "./dto/query-feature-flags.dto";
import {
  FEATURE_FLAGS_DEFAULT_LIMIT,
  FEATURE_FLAG_SORT_COLUMNS,
} from "./constants";

type WhereCall = [string, Record<string, unknown>?];

const createQueryBuilderMock = () => {
  const builder = {
    andWhere: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
  };

  for (const key of ["andWhere", "where", "orderBy", "skip", "take"] as const) {
    builder[key].mockReturnValue(builder);
  }
  return builder;
};

const buildFlag = (
  overrides: Partial<FeatureFlagEntity> = {},
): FeatureFlagEntity =>
  Object.assign(new FeatureFlagEntity(), {
    id: "flag-id",
    key: "shelter-address",
    name: "Endereço",
    description: null,
    enabled: true,
    metadata: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  });

const query = (overrides: Partial<QueryFeatureFlagsDto> = {}) =>
  Object.assign(new QueryFeatureFlagsDto(), overrides);

describe("FeatureFlagsRepository", () => {
  let queryBuilder: ReturnType<typeof createQueryBuilderMock>;
  let typeOrmRepository: Record<string, jest.Mock>;
  let repository: FeatureFlagsRepository;

  const whereClauses = (): WhereCall[] =>
    queryBuilder.andWhere.mock.calls as WhereCall[];
  const clauseMatching = (fragment: string): WhereCall | undefined =>
    whereClauses().find(([sql]) => sql.includes(fragment));

  beforeEach(async () => {
    jest.clearAllMocks();
    queryBuilder = createQueryBuilderMock();

    typeOrmRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FeatureFlagsRepository,
        {
          provide: getRepositoryToken(FeatureFlagEntity),
          useValue: typeOrmRepository,
        },
      ],
    }).compile();

    repository = moduleRef.get(FeatureFlagsRepository);
  });

  describe("findAllPaginated", () => {
    it("usa página, limite e ordenação padrão quando a consulta não traz", async () => {
      await repository.findAllPaginated(query());

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        FEATURE_FLAG_SORT_COLUMNS.name,
        "ASC",
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(
        FEATURE_FLAGS_DEFAULT_LIMIT,
      );
    });

    it("calcula o deslocamento da página pedida", async () => {
      await repository.findAllPaginated(query({ page: 3, limit: 5 }));

      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(5);
    });

    it("ordena pelo campo e sentido pedidos", async () => {
      await repository.findAllPaginated(query({ sort: "key", order: "DESC" }));

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        FEATURE_FLAG_SORT_COLUMNS.key,
        "DESC",
      );
    });

    it("devolve itens e total", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[buildFlag()], 7]);

      await expect(repository.findAllPaginated(query())).resolves.toEqual({
        items: [expect.objectContaining({ key: "shelter-address" })],
        total: 7,
      });
    });
  });

  describe("filtros", () => {
    it("busca em chave, nome e descrição, sem diferenciar maiúsculas", async () => {
      await repository.findAllPaginated(query({ searchString: "  abrigo " }));

      const clause = clauseMatching("flag.key");
      expect(clause?.[0]).toContain("flag.name");
      expect(clause?.[0]).toContain("flag.description");
      expect(clause?.[1]).toEqual({ search: "%abrigo%" });
    });

    it("ignora uma busca em branco", async () => {
      await repository.findAllPaginated(query({ searchString: "   " }));

      expect(clauseMatching("flag.key")).toBeUndefined();
    });

    it("filtra por situação, inclusive desligada", async () => {
      await repository.findAllPaginated(query({ enabled: false }));

      expect(clauseMatching("flag.enabled")).toEqual([
        "flag.enabled = :enabled",
        { enabled: false },
      ]);
    });

    it("não filtra por situação quando ela não foi informada", async () => {
      await repository.findAllPaginated(query());

      expect(clauseMatching("flag.enabled")).toBeUndefined();
    });
  });

  describe("findAllFiltered", () => {
    it("aplica os mesmos filtros, sem paginar", async () => {
      await repository.findAllFiltered(query({ searchString: "abrigo" }));

      expect(clauseMatching("flag.key")).toBeDefined();
      expect(queryBuilder.skip).not.toHaveBeenCalled();
      expect(queryBuilder.take).not.toHaveBeenCalled();
    });
  });

  describe("findEnabledState", () => {
    it("devolve null para chave que não existe", async () => {
      typeOrmRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.findEnabledState("nao-existe"),
      ).resolves.toBeNull();
    });

    it("distingue desligada de inexistente", async () => {
      typeOrmRepository.findOne.mockResolvedValue(
        buildFlag({ enabled: false }),
      );

      await expect(repository.findEnabledState("email-delivery")).resolves.toBe(
        false,
      );
    });

    it("devolve o estado ligado/desligado pela chave", async () => {
      typeOrmRepository.findOne.mockResolvedValue(buildFlag({ enabled: true }));

      await expect(
        repository.findEnabledState("shelter_address"),
      ).resolves.toBe(true);
      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { key: "shelter_address" },
      });
    });
  });

  describe("consultas simples", () => {
    it("findAll ordena por nome", async () => {
      await repository.findAll();

      expect(typeOrmRepository.find).toHaveBeenCalledWith({
        order: { name: "ASC" },
      });
    });

    it("findByKey busca pela chave", async () => {
      await repository.findByKey("shelter-address");

      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { key: "shelter-address" },
      });
    });
  });

  describe("escrita", () => {
    it("create delega ao TypeORM sem gravar", async () => {
      const data = { key: "nova" };
      typeOrmRepository.create.mockReturnValue(buildFlag(data));

      repository.create(data);

      expect(typeOrmRepository.create).toHaveBeenCalledWith(data);
      expect(typeOrmRepository.save).not.toHaveBeenCalled();
      await Promise.resolve();
    });

    it("save persiste e devolve o registro", async () => {
      const flag = buildFlag();
      typeOrmRepository.save.mockResolvedValue(flag);

      await expect(repository.save(flag)).resolves.toBe(flag);
    });

    it("remove apaga o registro", async () => {
      const flag = buildFlag();

      await repository.remove(flag);

      expect(typeOrmRepository.remove).toHaveBeenCalledWith(flag);
    });
  });
});
