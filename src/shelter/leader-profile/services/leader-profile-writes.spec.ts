import { CreateLeaderProfileService } from "./create-leader-profile.service";
import { DeleteLeaderProfileService } from "./delete-leader-profile.service";

describe("CreateLeaderProfileService / DeleteLeaderProfileService", () => {
  const repo = {
    createForUser: jest.fn(),
    removeByUserId: jest.fn(),
  };
  const create = new CreateLeaderProfileService(repo as never);
  const remove = new DeleteLeaderProfileService(repo as never);

  beforeEach(() => jest.resetAllMocks());

  it("create delega ao repositório com o id do usuário e devolve o perfil", async () => {
    repo.createForUser.mockResolvedValue({ id: "lp1" });
    await expect(create.createForUser("u1")).resolves.toEqual({ id: "lp1" });
    expect(repo.createForUser).toHaveBeenCalledWith("u1");
  });

  it("create propaga a falha do repositório (usuário inexistente, banco): nada é engolido", async () => {
    repo.createForUser.mockRejectedValue(new Error("User not found"));
    await expect(create.createForUser("x")).rejects.toThrow("User not found");
  });

  it("remove delega ao repositório com o id do usuário", async () => {
    repo.removeByUserId.mockResolvedValue(undefined);
    await expect(remove.removeByUserId("u1")).resolves.toBeUndefined();
    expect(repo.removeByUserId).toHaveBeenCalledWith("u1");
  });

  it("remove propaga a falha do repositório", async () => {
    repo.removeByUserId.mockRejectedValue(new Error("tx"));
    await expect(remove.removeByUserId("u1")).rejects.toThrow("tx");
  });
});
