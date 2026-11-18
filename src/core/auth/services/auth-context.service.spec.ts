import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { UnauthenticatedException } from "src/common/exceptions";
import { AuthContextService } from "./auth-context.service";
import { UserRole } from "../auth.types";
import { AuthErrorMessages } from "../constants/auth.constants";

const requestWith = (headers: Record<string, string> = {}): Request =>
  ({ headers }) as unknown as Request;

const authenticated = (token = "token") =>
  requestWith({ authorization: `Bearer ${token}` });

describe("AuthContextService", () => {
  const jwt = { verifyAsync: jest.fn(), decode: jest.fn() };
  const config = { get: jest.fn() };

  let service: AuthContextService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthContextService,
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = moduleRef.get(AuthContextService);

    config.get.mockReturnValue("jwt-secret");
    jwt.verifyAsync.mockResolvedValue({
      sub: "user-id",
      email: "maria@orfanatonib.test",
      role: "ADMIN",
    });
    jwt.decode.mockReturnValue({ sub: "user-id", role: "leader" });
  });

  it("verifies the token with the configured secret", async () => {
    await service.verifyToken("abc");

    expect(jwt.verifyAsync).toHaveBeenCalledWith("abc", {
      secret: "jwt-secret",
    });
  });

  it("normalizes the role coming out of the token", async () => {
    await expect(service.verifyToken("abc")).resolves.toMatchObject({
      role: UserRole.ADMIN,
    });
  });

  it("drops a role the application does not know", async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: "user-id", role: "auditor" });

    await expect(service.verifyToken("abc")).resolves.toMatchObject({
      role: undefined,
    });
  });

  it("refuses to verify when no secret is configured", async () => {
    config.get.mockReturnValue(undefined);

    await expect(service.verifyToken("abc")).rejects.toThrow(
      new UnauthenticatedException(AuthErrorMessages.JWT_SECRET_MISSING),
    );

  });

  it("decodes without verifying, normalizing the role", () => {
    expect(service.decodeToken("abc")).toMatchObject({
      role: UserRole.LEADER,
    });
  });

  it("returns null when there is nothing to decode", () => {
    jwt.decode.mockReturnValue(null);

    expect(service.decodeToken("abc")).toBeNull();
  });

  it("refuses a request that carries no token", async () => {
    await expect(service.getPayloadFromRequest(requestWith())).rejects.toThrow(
      new UnauthenticatedException(AuthErrorMessages.TOKEN_MISSING),
    );
  });

  it("tryGetPayload swallows the failure and answers null", async () => {
    jwt.verifyAsync.mockRejectedValue(new Error("expired"));

    await expect(service.tryGetPayload(authenticated())).resolves.toBeNull();
  });

  it("reads the user id and the email of the token", async () => {
    await expect(service.getUserId(authenticated())).resolves.toBe("user-id");
    await expect(service.getEmail(authenticated())).resolves.toBe(
      "maria@orfanatonib.test",
    );
  });

  it("answers null for identity questions when there is no token", async () => {
    const anonymous = requestWith();

    await expect(service.getUserId(anonymous)).resolves.toBeNull();
    await expect(service.getEmail(anonymous)).resolves.toBeNull();
    await expect(service.getRole(anonymous)).resolves.toBeNull();
  });

  it.each([
    [UserRole.ADMIN, { admin: true, member: false }],
    [UserRole.MEMBER, { admin: false, member: true }],
    [UserRole.LEADER, { admin: false, member: false }],
  ])("answers the role questions for %s", async (role, expected) => {
    jwt.verifyAsync.mockResolvedValue({ sub: "user-id", role });
    const request = authenticated();

    await expect(service.isAdmin(request)).resolves.toBe(expected.admin);
    await expect(service.isMember(request)).resolves.toBe(expected.member);
  });

  it("isLoggedIn follows whether the token verifies", async () => {
    await expect(service.isLoggedIn(authenticated())).resolves.toBe(true);

    jwt.verifyAsync.mockRejectedValue(new Error("expired"));
    await expect(service.isLoggedIn(authenticated())).resolves.toBe(false);

    await expect(service.isLoggedIn(requestWith())).resolves.toBe(false);
  });
});
