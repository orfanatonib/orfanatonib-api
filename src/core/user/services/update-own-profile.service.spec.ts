import { BadRequestException, NotFoundException } from "@nestjs/common";

import { UpdateOwnProfileService } from "./update-own-profile.service";

describe("UpdateOwnProfileService", () => {
  let repo: { findById: jest.Mock; findByEmail: jest.Mock; update: jest.Mock };
  let service: UpdateOwnProfileService;
  const current = { id: "u1", name: "Ana", email: "ana@x.com", phone: "1" };

  beforeEach(() => {
    repo = {
      findById: jest.fn().mockResolvedValue(current),
      findByEmail: jest.fn(),
      update: jest.fn(),
    };
    service = new UpdateOwnProfileService(repo as never);
  });

  it("404 quando o usuário não existe", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(
      service.updateOwnProfile("u1", { name: "B" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("e-mail de outro usuário: 400 e nada gravado", async () => {
    repo.findByEmail.mockResolvedValue({ id: "u2" });
    await expect(
      service.updateOwnProfile("u1", { email: "outro@x.com" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("atualização parcial: só os campos enviados vão ao repositório", async () => {
    repo.update.mockResolvedValue({ ...current, name: "Bia" });
    await service.updateOwnProfile("u1", { name: "Bia" });
    expect(repo.update).toHaveBeenCalledWith("u1", { name: "Bia" });
  });

  it("mesmo e-mail não consulta duplicidade; corpo vazio devolve o usuário sem gravar", async () => {
    repo.update.mockResolvedValue(current);
    expect(
      await service.updateOwnProfile("u1", {
        email: "ana@x.com",
        name: undefined,
      }),
    ).toBeDefined();
    expect(repo.findByEmail).not.toHaveBeenCalled();
    repo.update.mockClear();
    expect(await service.updateOwnProfile("u1", {})).toBe(current);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
