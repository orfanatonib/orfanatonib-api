import { GUARDS_METADATA } from "@nestjs/common/constants";

import { AdminOrLeaderRoleGuard } from "src/core/auth/guards/role-guard";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { TeamsController } from "./teams.controller";

const guardsOf = (target: object): unknown[] =>
  (Reflect.getMetadata(GUARDS_METADATA, target) as unknown[] | undefined) ?? [];

describe("TeamsController: guards de papel (escritas e leituras administrativas)", () => {
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

  it.each(["findAll", "findOne", "findByShelter"] as const)(
    "%s exige admin ou líder (a leitura expõe nome, e-mail e telefone dos integrantes)",
    (handler) => {
      expect(guardsOf(TeamsController.prototype[handler])).toContain(
        AdminOrLeaderRoleGuard,
      );
    },
  );

  it.each(["findMyTeams"] as const)(
    "%s (my-teams) segue só com sessão: cada um lê as PRÓPRIAS equipes",
    (handler) => {
      expect(guardsOf(TeamsController.prototype[handler])).not.toContain(
        AdminOrLeaderRoleGuard,
      );
    },
  );
});
