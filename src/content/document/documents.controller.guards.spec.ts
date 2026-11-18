import { GUARDS_METADATA } from "@nestjs/common/constants";

import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import { DocumentsController } from "./documents.controller";

const guardsOf = (name: string): unknown[] =>
  (Reflect.getMetadata(
    GUARDS_METADATA,
    Reflect.get(DocumentsController.prototype, name) as object,
  ) as unknown[] | undefined) ?? [];

describe("DocumentsController: leitura deixou de ser pública", () => {
  it.each(["findAll", "findOne"])("%s exige sessão (não admin)", (handler) => {
    const guards = guardsOf(handler);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).not.toContain(AdminRoleGuard);
  });

  it.each(["create", "update"])("%s segue só de admin", (handler) => {
    expect(guardsOf(handler)).toEqual(
      expect.arrayContaining([JwtAuthGuard, AdminRoleGuard]),
    );
  });
});
