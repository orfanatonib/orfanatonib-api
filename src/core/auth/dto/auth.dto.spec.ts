import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { UserRole } from "../auth.types";
import { LoginDto } from "./login.dto";
import { RegisterUserDto } from "./register.dto";
import { CompleteUserDto } from "./complete-register.dto";
import { GoogleLoginDto } from "./google-login.dto";
import { RefreshTokenDto } from "./refresh-token.dto";
import { ResetPasswordDto } from "./reset-password.dto";

const validate = <TDto extends object>(
  dtoClass: new () => TDto,
  payload: Record<string, unknown>,
): { dto: TDto; fields: string[] } => {
  const dto = plainToInstance(dtoClass, payload);
  return {
    dto,
    fields: validateSync(dto).map((error) => error.property),
  };
};

describe("RegisterUserDto", () => {
  it("trims the name and the phone and lowercases the email", () => {
    const { dto, fields } = validate(RegisterUserDto, {
      name: "  Maria Souza  ",
      email: "  MARIA@Orfanatonib.TEST ",
      phone: " 92999990000 ",
      password: "E2e@12345",
      role: UserRole.MEMBER,
    });

    expect(fields).toEqual([]);
    expect(dto).toMatchObject({
      name: "Maria Souza",
      email: "maria@orfanatonib.test",
      phone: "92999990000",
    });
  });

  it("accepts an optional team", () => {
    const { dto, fields } = validate(RegisterUserDto, {
      name: "Maria",
      email: "maria@orfanatonib.test",
      phone: "92999990000",
      password: "E2e@12345",
      role: UserRole.MEMBER,
      teamId: "team-id",
    });

    expect(fields).toEqual([]);
    expect(dto.teamId).toBe("team-id");
  });

  it("refuses a short password, a bad email and an unknown role", () => {
    const { fields } = validate(RegisterUserDto, {
      name: "Maria",
      email: "nao-e-email",
      phone: "92999990000",
      password: "123",
      role: "superuser",
    });

    expect(fields.sort()).toEqual(["email", "password", "role"]);
  });
});

describe("RegisterUserDto: papel admin", () => {
  const base = {
    name: "Maria",
    email: "maria@orfanatonib.test",
    phone: "92999990000",
    password: "E2e@12345",
  };

  it("[auth.post.auth-register#role-admin-recusado] refuses admin and any value outside member/leader", () => {
    for (const role of [UserRole.ADMIN, "Admin", "superuser", "", undefined]) {
      expect(validate(RegisterUserDto, { ...base, role }).fields).toEqual([
        "role",
      ]);
    }
    for (const role of [UserRole.MEMBER, UserRole.LEADER]) {
      expect(validate(RegisterUserDto, { ...base, role }).fields).toEqual([]);
    }
  });

  it("[auth.post.auth-complete-register#role-admin-recusado] complete-register refuses admin too", () => {
    const complete = {
      completionToken: "t",
      name: "Maria",
      phone: "92999990000",
    };
    expect(
      validate(CompleteUserDto, { ...complete, role: UserRole.ADMIN }).fields,
    ).toEqual(["role"]);
  });
});

describe("CompleteUserDto", () => {
  it("requires the completion token; the e-mail is no longer accepted as identity", () => {
    expect(
      validate(CompleteUserDto, { name: "Maria", phone: "92999990000" }).fields,
    ).toEqual(["completionToken"]);
  });

  it("keeps password and role optional: Google fills them in later", () => {
    const { fields } = validate(CompleteUserDto, {
      completionToken: "t",
      name: "Maria",
      phone: "92999990000",
    });

    expect(fields).toEqual([]);
  });

  it("still refuses a short password when one is sent", () => {
    const { fields } = validate(CompleteUserDto, {
      completionToken: "t",
      name: "Maria",
      phone: "92999990000",
      password: "123",
    });

    expect(fields).toEqual(["password"]);
  });
});

describe("LoginDto", () => {
  it("requires an email and a password", () => {
    expect(validate(LoginDto, {}).fields.sort()).toEqual(["email", "password"]);
    expect(
      validate(LoginDto, {
        email: "maria@orfanatonib.test",
        password: "E2e@12345",
      }).fields,
    ).toEqual([]);
  });
});

describe("ResetPasswordDto", () => {
  it("requires the token and a password of at least six characters", () => {
    expect(
      validate(ResetPasswordDto, { token: "t", newPassword: "123" }).fields,
    ).toEqual(["newPassword"]);
    expect(
      validate(ResetPasswordDto, { token: "t", newPassword: "Nova@12345" })
        .fields,
    ).toEqual([]);
  });
});

describe("GoogleLoginDto e RefreshTokenDto", () => {
  it("accept an empty body, so the service answers 401 instead of 400", () => {
    expect(validate(GoogleLoginDto, {}).fields).toEqual([]);
    expect(validate(RefreshTokenDto, {}).fields).toEqual([]);
  });

  it("still refuse a value of the wrong type", () => {
    expect(validate(GoogleLoginDto, { token: 42 }).fields).toEqual(["token"]);
    expect(validate(RefreshTokenDto, { refreshToken: 42 }).fields).toEqual([
      "refreshToken",
    ]);
  });
});
