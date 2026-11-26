import { CreateMemberProfileService } from "./create-member-profile.service";
import { DeleteMemberProfileService } from "./delete-member-profile.service";

describe("CreateMemberProfileService / DeleteMemberProfileService", () => {
  const repo = {
    createForUser: jest.fn(),
    removeByUserId: jest.fn(),
  };
  const create = new CreateMemberProfileService(repo as never);
  const remove = new DeleteMemberProfileService(repo as never);

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
