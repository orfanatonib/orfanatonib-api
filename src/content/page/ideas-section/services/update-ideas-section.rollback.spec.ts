import { RuleException } from "src/common/exceptions";
import { UpdateIdeasSectionService } from "./update-ideas-section.service";

const existing = {
  id: "s1",
  title: "Antigo",
  description: "d0",
  public: false,
};

function setup() {
  const repository = {
    findById: jest.fn().mockResolvedValue(existing),
    updateData: jest.fn().mockResolvedValue({ ...existing, title: "Novo" }),
  };
  const media = {
    assertUploadsResolvable: jest.fn(),
    replaceAll: jest.fn().mockResolvedValue([]),
  };
  return {
    repository,
    media,
    svc: new UpdateIdeasSectionService(repository as never, media as never),
  };
}

describe("UpdateIdeasSectionService: seção e mídia não ficam pela metade", () => {
  it("upload declarado sem arquivo é recusado ANTES de gravar o texto novo", async () => {
    const { svc, repository, media } = setup();
    media.assertUploadsResolvable.mockImplementation(() => {
      throw new RuleException("faltou arquivo");
    });
    await expect(
      svc.execute("s1", { title: "Novo", medias: [] } as never, {}),
    ).rejects.toBeInstanceOf(RuleException);
    expect(repository.updateData).not.toHaveBeenCalled();
  });

  it("falha da mídia depois de gravar o texto: o texto antigo é restaurado e o erro é o da mídia", async () => {
    const { svc, repository, media } = setup();
    media.replaceAll.mockRejectedValue(new Error("s3"));
    await expect(
      svc.execute(
        "s1",
        { title: "Novo", description: "d1", medias: [] } as never,
        {},
      ),
    ).rejects.toThrow("s3");
    expect(repository.updateData).toHaveBeenCalledTimes(2);
    expect(repository.updateData).toHaveBeenLastCalledWith("s1", {
      title: "Antigo",
      description: "d0",
      public: false,
    });
  });

  it("se restaurar também falhar, o erro devolvido continua sendo o original", async () => {
    const { svc, repository, media } = setup();
    media.replaceAll.mockRejectedValue(new Error("s3"));
    repository.updateData
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("banco"));
    await expect(
      svc.execute("s1", { title: "Novo", medias: [] } as never, {}),
    ).rejects.toThrow("s3");
  });

  it("feliz: devolve o DTO com as mídias gravadas", async () => {
    const { svc } = setup();
    await expect(
      svc.execute("s1", { title: "Novo", medias: [] } as never, {}),
    ).resolves.toMatchObject({ title: "Novo" });
  });
});
