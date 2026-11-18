import { GUARDS_METADATA } from "@nestjs/common/constants";

import { AdminOrLeaderRoleGuard } from "src/core/auth/guards/role-guard";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { TeamsController } from "./teams.controller";

const guardsOf = (target: object): unknown[] =>
  (Reflect.getMetadata(GUARDS_METADATA, target) as unknown[] | undefined) ?? [];

describe("TeamsController: guards de papel nas escritas", () => {
  it("a classe exige sessão (JwtAuthGuard)", () => {
    expect(guardsOf(TeamsController)).toContain(JwtAuthGuard);
  });

  it.each(["create", "update", "remove"] as const)(
    "%s exige admin ou líder",
    (handler) => {
      expect(guardsOf(TeamsController.prototype[handler])).toContain(
        AdminOrLeaderRoleGuard,
      );
    },
  );

  it.each(["findAll", "findOne", "findByShelter", "findMyTeams"] as const)(
    "%s segue só com sessão (leitura — escopo pendente, ver plano 14)",
    (handler) => {
      expect(guardsOf(TeamsController.prototype[handler])).not.toContain(
        AdminOrLeaderRoleGuard,
      );
    },
  );
});
