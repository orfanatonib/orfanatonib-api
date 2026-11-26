import { UserRole } from "src/core/auth/auth.types";

import { UpdateUserService } from "./update-user.service";

function build(
  createLeader: jest.Mock = jest.fn().mockResolvedValue({}),
  currentRole: UserRole = UserRole.MEMBER,
) {
  const userRepo = {
    findById: jest
      .fn()
      .mockResolvedValue({ id: "u1", role: currentRole, active: true }),
    update: jest.fn().mockResolvedValue({ id: "u1", active: true }),
  };
  const noop = { removeByUserId: jest.fn().mockResolvedValue(undefined) };
  const svc = new UpdateUserService(
    userRepo as never,
    { createForUser: jest.fn().mockResolvedValue({}) } as never,
    noop as never,
    { createForUser: createLeader } as never,
    noop as never,
    { sendAccountApproved: jest.fn() } as never,
  );
  return { svc, userRepo };
}

describe("UpdateUserService: troca de papel", () => {
  it("se criar o perfil de líder falha, a falha PROPAGA e o usuário não é atualizado", async () => {
    const { svc, userRepo } = build(
      jest.fn().mockRejectedValue(new Error("perfil")),
    );
    await expect(svc.update("u1", { role: UserRole.LEADER })).rejects.toThrow(
      "perfil",
    );
    expect(userRepo.update).not.toHaveBeenCalled();
  });

  it("troca de papel concluída grava o usuário", async () => {
    const { svc, userRepo } = build();
    await svc.update("u1", { role: UserRole.LEADER });
    expect(userRepo.update).toHaveBeenCalled();
  });
});

describe("UpdateUserService: ninguém vira admin pela API", () => {
  it("[auth.post.auth-register#role-admin-recusado] promover membro ou líder a admin é recusado com 400 e nada é gravado", async () => {
    for (const current of [UserRole.MEMBER, UserRole.LEADER]) {
      const { svc, userRepo } = build(undefined, current);
      await expect(
        svc.update("u1", { role: UserRole.ADMIN }),
      ).rejects.toMatchObject({ status: 400 });
      expect(userRepo.update).not.toHaveBeenCalled();
    }
  });

  it("um admin existente segue editável (mesmo papel e outros campos) e pode ser rebaixado", async () => {
    const { svc, userRepo } = build(undefined, UserRole.ADMIN);
    await svc.update("u1", { role: UserRole.ADMIN, name: "Novo nome" });
    await svc.update("u1", { role: UserRole.MEMBER });
    expect(userRepo.update).toHaveBeenCalledTimes(2);
  });
});
