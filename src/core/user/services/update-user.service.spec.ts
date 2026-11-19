import { UserRole } from "src/core/auth/auth.types";

import { UpdateUserService } from "./update-user.service";

function build(createLeader: jest.Mock = jest.fn().mockResolvedValue({})) {
  const userRepo = {
    findById: jest
      .fn()
      .mockResolvedValue({ id: "u1", role: UserRole.MEMBER, active: true }),
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
