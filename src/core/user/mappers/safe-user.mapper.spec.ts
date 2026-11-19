import { UserEntity } from "../entities/user.entity";
import { toSafeUser } from "./safe-user.mapper";

describe("toSafeUser", () => {
  const user = Object.assign(new UserEntity(), {
    id: "u1",
    email: "a@x.com",
    name: "Ana",
    password: "$2b$10$hash",
    refreshToken: "eyJ.token",
  });

  it("remove o hash da senha e o refresh token", () => {
    const safe = toSafeUser(user);
    expect(safe).not.toHaveProperty("password");
    expect(safe).not.toHaveProperty("refreshToken");
    expect(JSON.stringify(safe)).not.toContain("$2b$");
    expect(JSON.stringify(safe)).not.toContain("eyJ.token");
  });

  it("mantém o restante e não altera a entidade original", () => {
    const safe = toSafeUser(user);
    expect(safe).toMatchObject({ id: "u1", email: "a@x.com", name: "Ana" });
    expect(user.password).toBe("$2b$10$hash");
  });
});
