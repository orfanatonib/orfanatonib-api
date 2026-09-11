import { DataSource } from "typeorm";
import { PasswordResetTokenEntity } from "../entities/password-reset-token.entity";
import { PasswordResetTokenRepository } from "./password-reset-token.repository";
import { FIXED_CREATED_AT } from "../auth.fixtures";

/**
 * O repositório estende `Repository` do TypeORM, então os métodos herdados
 * (`create`, `save`, `findOne`, `delete`) são espiados na instância.
 */
describe("PasswordResetTokenRepository", () => {
  const dataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as unknown as DataSource;

  let repository: PasswordResetTokenRepository;
  let create: jest.SpyInstance;
  let save: jest.SpyInstance;
  let findOne: jest.SpyInstance;
  let remove: jest.SpyInstance;

  const buildToken = (
    overrides: Partial<PasswordResetTokenEntity> = {},
  ): PasswordResetTokenEntity =>
    Object.assign(new PasswordResetTokenEntity(), {
      id: "token-row-id",
      token: "reset-token",
      userId: "user-id",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      createdAt: FIXED_CREATED_AT,
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PasswordResetTokenRepository(dataSource);

    create = jest
      .spyOn(repository, "create")
      .mockImplementation((data: unknown) => data as PasswordResetTokenEntity);
    save = jest
      .spyOn(repository, "save")
      .mockImplementation((entity: unknown) =>
        Promise.resolve(entity as PasswordResetTokenEntity),
      );
    findOne = jest.spyOn(repository, "findOne").mockResolvedValue(null);
    remove = jest.spyOn(repository, "delete").mockResolvedValue({} as never);
  });

  it("creates the token row bound to the user", async () => {
    const expiresAt = new Date("2099-01-01T00:00:00.000Z");

    await repository.createToken("user-id", "reset-token", expiresAt);

    expect(create).toHaveBeenCalledWith({
      userId: "user-id",
      token: "reset-token",
      expiresAt,
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("finds a token that has not expired, with its user joined", async () => {
    const row = buildToken();
    findOne.mockResolvedValue(row);

    await expect(repository.findValidToken("reset-token")).resolves.toBe(row);
    expect(findOne).toHaveBeenCalledWith({
      where: { token: "reset-token" },
      relations: ["user"],
    });
  });

  it("answers null for a token that does not exist", async () => {
    findOne.mockResolvedValue(null);

    await expect(repository.findValidToken("lixo")).resolves.toBeNull();
  });

  it("answers null for a token that is past its expiry", async () => {
    findOne.mockResolvedValue(
      buildToken({ expiresAt: new Date("2020-01-01T00:00:00.000Z") }),
    );

    await expect(repository.findValidToken("expirado")).resolves.toBeNull();
  });

  it("deletes one token by its value", async () => {
    await repository.deleteToken("reset-token");

    expect(remove).toHaveBeenCalledWith({ token: "reset-token" });
  });

  it("invalidates every token of a user at once", async () => {
    await repository.invalidateTokensForUser("user-id");

    expect(remove).toHaveBeenCalledWith({ userId: "user-id" });
  });
});
