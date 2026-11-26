import { UserRole } from "src/core/auth/auth.types";
import { AuthenticatedRequest } from "src/core/auth/auth.types";
import {
  isUnscopedActor,
  toShelteredAccessContext,
} from "./sheltered-access.util";

const buildRequest = (
  user?: AuthenticatedRequest["user"],
): AuthenticatedRequest => ({ user }) as AuthenticatedRequest;

describe("sheltered-access.util", () => {
  describe("toShelteredAccessContext", () => {
    it("reads the actor from the request populated by the guard", () => {
      const context = toShelteredAccessContext(
        buildRequest({ userId: "user-1", role: UserRole.LEADER }),
      );

      expect(context).toEqual({ userId: "user-1", role: UserRole.LEADER });
    });

    it("normalizes a role that arrives with a different casing", () => {
      const context = toShelteredAccessContext(
        buildRequest({ userId: "user-1", role: "ADMIN" }),
      );

      expect(context.role).toBe(UserRole.ADMIN);
    });

    it("falls back to a null actor when the request carries no user", () => {
      expect(toShelteredAccessContext(buildRequest(undefined))).toEqual({
        userId: null,
        role: null,
      });
    });

    it("discards an unknown role instead of trusting it", () => {
      const context = toShelteredAccessContext(
        buildRequest({ userId: "user-1", role: "superuser" }),
      );

      expect(context.role).toBeNull();
    });
  });

  describe("isUnscopedActor", () => {
    it("treats admins, missing roles and missing users as unscoped", () => {
      expect(isUnscopedActor({ userId: "u", role: UserRole.ADMIN })).toBe(true);
      expect(isUnscopedActor({ userId: "u", role: null })).toBe(true);
      expect(isUnscopedActor({ userId: null, role: UserRole.LEADER })).toBe(
        true,
      );
    });

    it("scopes leaders and members that carry a user id", () => {
      expect(isUnscopedActor({ userId: "u", role: UserRole.LEADER })).toBe(
        false,
      );
      expect(isUnscopedActor({ userId: "u", role: UserRole.MEMBER })).toBe(
        false,
      );
    });
  });
});
