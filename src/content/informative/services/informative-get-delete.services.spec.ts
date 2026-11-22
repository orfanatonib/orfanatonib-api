import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import { DeleteInformativeService } from "./delete-informative.service";
import { GetInformativeService } from "./get-informative.service";

const entity = (id = "i1") =>
  ({
    id,
    title: "t",
    description: "d",
    public: true,
    route: { id: "r1" },
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never;

describe("GetInformativeService", () => {
  it("lista mapeando para DTO; falha do repositório vira 500 sem vazar detalhe", async () => {
    const repo = {
      findAllSorted: jest.fn().mockResolvedValue([entity()]),
      findOneById: jest.fn(),
    };
    const svc = new GetInformativeService(repo as never);
    expect(await svc.findAll()).toHaveLength(1);
    repo.findAllSorted.mockRejectedValue(new Error("db secret"));
    await expect(svc.findAll()).rejects.toThrow(
      "Erro ao buscar banners informativos",
    );
  });

  it("findOne: 404 quando não existe", async () => {
    const repo = {
      findAllSorted: jest.fn(),
      findOneById: jest.fn().mockResolvedValue(null),
    };
    const svc = new GetInformativeService(repo as never);
    await expect(svc.findOne("x")).rejects.toBeInstanceOf(NotFoundException);
    repo.findOneById.mockResolvedValue(entity("i9"));
    expect((await svc.findOne("i9")).id).toBe("i9");
  });
});

describe("DeleteInformativeService", () => {
  const setup = () => {
    const repo = {
      findOneWithRelations: jest.fn(),
      removeWithRoute: jest.fn(),
    };
    const routes = { delete: jest.fn() };
    return {
      repo,
      routes,
      svc: new DeleteInformativeService(repo as never),
    };
  };

  it("apaga a rota e o banner", async () => {
    const { repo, svc } = setup();
    repo.findOneWithRelations.mockResolvedValue(entity());
    await svc.execute("i1");
    expect(repo.removeWithRoute).toHaveBeenCalledTimes(1);
  });

  it("inexistente: 404 sem apagar nada", async () => {
    const { repo, svc } = setup();
    repo.findOneWithRelations.mockResolvedValue(null);
    await expect(svc.execute("x")).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.removeWithRoute).not.toHaveBeenCalled();
  });

  it("falha do banco: 500 genérico", async () => {
    const { repo, svc } = setup();
    repo.findOneWithRelations.mockResolvedValue(entity());
    repo.removeWithRoute.mockRejectedValue(new Error("db"));
    await expect(svc.execute("i1")).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
