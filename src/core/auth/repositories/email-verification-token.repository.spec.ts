import { IsNull, Repository } from "typeorm";
import { EmailVerificationTokenEntity } from "../entities/email-verification-token.entity";
import { EmailVerificationTokenRepository } from "./email-verification-token.repository";

describe("EmailVerificationTokenRepository", () => {
  const typeorm = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  let repository: EmailVerificationTokenRepository;

  const entity = (overrides: Partial<EmailVerificationTokenEntity> = {}) =>
    Object.assign(new EmailVerificationTokenEntity(), {
      id: "row",
      token: "tok",
      userId: "user-id",
      usedAt: null,
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      ...overrides,
    });

  beforeEach(() => {
    jest.resetAllMocks();
    typeorm.create.mockImplementation((data: unknown) => data);
    typeorm.save.mockImplementation((data: unknown) => Promise.resolve(data));
    typeorm.findOne.mockResolvedValue(null);
    repository = new EmailVerificationTokenRepository(
      typeorm as unknown as Repository<EmailVerificationTokenEntity>,
    );
  });

  it("creates the token bound to the user", async () => {
    const expiresAt = new Date("2099-01-01T00:00:00.000Z");
    await repository.createToken("user-id", "tok", expiresAt);

    expect(typeorm.save).toHaveBeenCalledWith({
      userId: "user-id",
      token: "tok",
      expiresAt,
    });
  });

  it("looks only for tokens that were not used yet, with the user joined", async () => {
    await repository.findUsableToken("tok");

    expect(typeorm.findOne).toHaveBeenCalledWith({
      where: { token: "tok", usedAt: IsNull() },
      relations: ["user"],
    });
  });

  it("returns a token inside its validity", async () => {
    typeorm.findOne.mockResolvedValue(entity());

    await expect(repository.findUsableToken("tok")).resolves.toMatchObject({
      token: "tok",
    });
  });

  it("answers null for a token past its expiry", async () => {
    typeorm.findOne.mockResolvedValue(
      entity({ expiresAt: new Date("2000-01-01T00:00:00.000Z") }),
    );

    await expect(repository.findUsableToken("tok")).resolves.toBeNull();
  });

  it("answers null for an unknown or already used token", async () => {
    typeorm.findOne.mockResolvedValue(null);

    await expect(repository.findUsableToken("usado")).resolves.toBeNull();
  });

  it("marks the token as used", async () => {
    const usedAt = new Date("2026-11-21T00:00:00.000Z");
    await repository.markUsed("row", usedAt);

    expect(typeorm.update).toHaveBeenCalledWith({ id: "row" }, { usedAt });
  });

  it("invalidates only the pending tokens of the user", async () => {
    await repository.invalidatePendingForUser("user-id");

    expect(typeorm.delete).toHaveBeenCalledWith({
      userId: "user-id",
      usedAt: IsNull(),
    });
  });
});
