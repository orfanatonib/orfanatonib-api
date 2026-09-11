import { ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";
import { UserRole } from "../auth.types";

describe("JwtStrategy", () => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue("jwt-secret"),
  } as unknown as ConfigService;

  const strategy = new JwtStrategy(configService);

  it("maps the token claims to the shape the controllers read", () => {
    expect(
      strategy.validate({
        sub: "user-id",
        email: "maria@orfanatonib.test",
        role: UserRole.ADMIN,
      }),
    ).toEqual({
      userId: "user-id",
      email: "maria@orfanatonib.test",
      role: UserRole.ADMIN,
    });
  });

  it("exposes the id as userId, not as id", () => {
    const user = strategy.validate({ sub: "user-id", role: UserRole.MEMBER });

    expect(user.userId).toBe("user-id");
    expect(user).not.toHaveProperty("id");
  });

  it("still authenticates a token with no role, warning about it", () => {
    const warn = jest
      .spyOn(
        (strategy as unknown as { logger: { warn: (m: string) => void } })
          .logger,
        "warn",
      )
      .mockImplementation(() => undefined);

    expect(strategy.validate({ sub: "user-id" })).toMatchObject({
      userId: "user-id",
      role: undefined,
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Missing role in JWT payload"),
    );

    warn.mockRestore();
  });
});
