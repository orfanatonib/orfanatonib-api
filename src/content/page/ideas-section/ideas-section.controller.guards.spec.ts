import { GUARDS_METADATA } from "@nestjs/common/constants";

import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { IdeasSectionController } from "./ideas-section.controller";

const guardsOf = (target: object): unknown[] =>
  (Reflect.getMetadata(GUARDS_METADATA, target) as unknown[] | undefined) ?? [];

describe("IdeasSectionController: guards de papel", () => {
  it("a classe exige sessão (JwtAuthGuard)", () => {
    expect(guardsOf(IdeasSectionController)).toContain(JwtAuthGuard);
  });

  it.each(["create"] as const)(
    "%s (membro propõe uma ideia) segue só com sessão",
    (handler) => {
      expect(guardsOf(IdeasSectionController.prototype[handler])).not.toContain(
        AdminRoleGuard,
      );
    },
  );

  it.each([
    "findUnattached",
    "pendingCount",
    "findOne",
    "update",
    "attach",
    "remove",
  ] as const)(
    "%s exige admin (a fila de ideias traz nome, e-mail e telefone dos autores)",
    (handler) => {
      expect(guardsOf(IdeasSectionController.prototype[handler])).toContain(
        AdminRoleGuard,
      );
    },
  );
});
