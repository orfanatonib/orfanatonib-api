import { ExecutionContext } from "@nestjs/common";
import { AccessDeniedException } from "src/common/exceptions";
import { AdminOrLeaderRoleGuard, AdminRoleGuard } from "./role-guard";
import { AuthenticatedUser, UserRole } from "../auth.types";
import { AuthErrorMessages } from "../constants/auth.constants";

const contextWith = (user?: Partial<AuthenticatedUser>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe("AdminRoleGuard", () => {
  const guard = new AdminRoleGuard();

  it("lets an admin through", () => {
    expect(guard.canActivate(contextWith({ role: UserRole.ADMIN }))).toBe(true);
  });

  it("accepts the role regardless of the casing in the token", () => {
    expect(guard.canActivate(contextWith({ role: "ADMIN" }))).toBe(true);
  });

  it.each([[UserRole.LEADER], [UserRole.MEMBER]])("denies a %s", (role) => {
    expect(() => guard.canActivate(contextWith({ role }))).toThrow(
      new AccessDeniedException(AuthErrorMessages.ADMIN_ONLY),
    );
  });

  it("denies a request with no authenticated user", () => {
    expect(() => guard.canActivate(contextWith())).toThrow(
      new AccessDeniedException(AuthErrorMessages.NOT_AUTHENTICATED),
    );
  });

  it("denies a user whose role is missing or unknown", () => {
    expect(() => guard.canActivate(contextWith({ role: undefined }))).toThrow(
      new AccessDeniedException(AuthErrorMessages.INSUFFICIENT_PERMISSIONS),
    );
    expect(() => guard.canActivate(contextWith({ role: "auditor" }))).toThrow(
      new AccessDeniedException(AuthErrorMessages.INSUFFICIENT_PERMISSIONS),
    );
  });
});

describe("AdminOrLeaderRoleGuard", () => {
  const guard = new AdminOrLeaderRoleGuard();

  it.each([[UserRole.ADMIN], [UserRole.LEADER]])(
    "lets a %s through",
    (role) => {
      expect(guard.canActivate(contextWith({ role }))).toBe(true);
    },
  );

  it("denies a member", () => {
    expect(() =>
      guard.canActivate(contextWith({ role: UserRole.MEMBER })),
    ).toThrow(
      new AccessDeniedException(AuthErrorMessages.ADMIN_OR_LEADER_ONLY),
    );
  });

  it("denies a request with no authenticated user", () => {
    expect(() => guard.canActivate(contextWith())).toThrow(
      AccessDeniedException,
    );
  });
});
