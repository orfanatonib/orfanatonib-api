import { toAuthUserDto } from "./auth-user.mapper";
import { UserRole } from "../auth.types";
import {
  FIXED_CREATED_AT,
  FIXED_UPDATED_AT,
  buildUserEntity,
} from "../auth.fixtures";

describe("toAuthUserDto", () => {
  it("exposes exactly the fields the login response declares", () => {
    expect(toAuthUserDto(buildUserEntity({ role: UserRole.ADMIN }))).toEqual({
      id: "user-id",
      email: "maria@orfanatonib.test",
      name: "Maria Souza",
      active: true,
      completed: true,
      commonUser: false,
      phone: "92999990000",
      role: UserRole.ADMIN,
      createdAt: FIXED_CREATED_AT,
      updatedAt: FIXED_UPDATED_AT,
    });
  });

  it("never leaks the password hash nor the refresh token", () => {
    const dto = toAuthUserDto(
      buildUserEntity({
        password: "$2a$10$segredo",
        refreshToken: "refresh-guardado",
      }),
    );

    expect(dto).not.toHaveProperty("password");
    expect(dto).not.toHaveProperty("refreshToken");
    expect(JSON.stringify(dto)).not.toContain("segredo");
  });
});
