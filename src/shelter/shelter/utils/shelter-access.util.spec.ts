import { AuthenticatedRequest, UserRole } from "src/core/auth/auth.types";
import { AccessDeniedException } from "src/common/exceptions";
import {
  assertCanManageShelters,
  isUnscopedActor,
  toShelterAccessContext,
} from "./shelter-access.util";
import {
  buildAdminContext,
  buildAnonymousContext,
  buildLeaderContext,
  buildMemberContext,
} from "../shelter.fixtures";

const requestWith = (user?: unknown): AuthenticatedRequest =>
  ({ user }) as AuthenticatedRequest;

describe("toShelterAccessContext", () => {
  it("reads the actor from the JWT payload attached to the request", () => {
    const context = toShelterAccessContext(
      requestWith({ userId: "user-1", role: UserRole.LEADER }),
    );

    expect(context).toEqual({ userId: "user-1", role: UserRole.LEADER });
  });

  it("normalizes the role regardless of the casing stored in the token", () => {
    const context = toShelterAccessContext(
      requestWith({ userId: "user-1", role: "ADMIN" }),
    );

    expect(context.role).toBe(UserRole.ADMIN);
  });

  it("yields a null actor when the request carries no user", () => {
    expect(toShelterAccessContext(requestWith())).toEqual({
      userId: null,
      role: null,
    });
  });

  it("discards a role the application does not know", () => {
    const context = toShelterAccessContext(
      requestWith({ userId: "user-1", role: "superuser" }),
    );

    expect(context.role).toBeNull();
  });
});

describe("isUnscopedActor", () => {
  it("treats an admin as unscoped", () => {
    expect(isUnscopedActor(buildAdminContext())).toBe(true);
  });

  it("treats an actor without role or id as unscoped", () => {
    expect(isUnscopedActor(buildAnonymousContext())).toBe(true);
    expect(isUnscopedActor(buildLeaderContext({ userId: null }))).toBe(true);
  });

  it("scopes a leader to the shelters they lead", () => {
    expect(isUnscopedActor(buildLeaderContext())).toBe(false);
  });
});

describe("assertCanManageShelters", () => {
  it.each([
    ["admin", buildAdminContext()],
    ["leader", buildLeaderContext()],
  ])("lets a %s through", (_role, actor) => {
    expect(() => assertCanManageShelters(actor)).not.toThrow();
  });

  it.each([
    ["member", buildMemberContext()],
    ["actor without role", buildAnonymousContext()],
  ])("denies a %s", (_role, actor) => {
    expect(() => assertCanManageShelters(actor)).toThrow(AccessDeniedException);
  });
});
