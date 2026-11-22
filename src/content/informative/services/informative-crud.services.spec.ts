import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { InformativeRepository } from "../informative.repository";
import { RouteService } from "src/infrastructure/route/services/route.service";
import { DeleteInformativeService } from "./delete-informative.service";
import { GetInformativeService } from "./get-informative.service";
import { UpdateInformativeService } from "./update-informative.service";
import { UpdateInformativeDto } from "../dto/update-informative.dto";

describe("Informative delete/get/update services", () => {
  let repo: {
    findOneWithRelations: jest.Mock;
    findOneById: jest.Mock;
    findAllSorted: jest.Mock;
    remove: jest.Mock;
    removeWithRoute: jest.Mock;
  };
  let routeRepo: { delete: jest.Mock };

  beforeEach(() => {
    repo = {
      findOneWithRelations: jest.fn(),
      findOneById: jest.fn(),
      findAllSorted: jest.fn(),
      remove: jest.fn(),
      removeWithRoute: jest.fn(),
    };
    routeRepo = { delete: jest.fn() };
  });

  describe("DeleteInformativeService", () => {
    const build = () =>
      new DeleteInformativeService(repo as unknown as InformativeRepository);

    it("remove banner e rota numa operação só do repositório (transação)", async () => {
      const entity = { id: "i1", route: { id: "r1" } };
      repo.findOneWithRelations.mockResolvedValue(entity);
      await build().execute("i1");
      expect(repo.removeWithRoute).toHaveBeenCalledWith(entity);
      expect(routeRepo.delete).not.toHaveBeenCalled();
    });

    it("404 quando não existe", async () => {
      repo.findOneWithRelations.mockResolvedValue(null);
      await expect(build().execute("x")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("falha de persistência vira 500 padronizado", async () => {
      repo.findOneWithRelations.mockResolvedValue({ id: "i1" });
      repo.removeWithRoute.mockRejectedValue(new Error("db"));
      await expect(build().execute("i1")).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });

  describe("GetInformativeService", () => {
    const build = () =>
      new GetInformativeService(repo as unknown as InformativeRepository);

    it("findAll devolve lista (vazia inclusive)", async () => {
      repo.findAllSorted.mockResolvedValue([]);
      await expect(build().findAll()).resolves.toEqual([]);
    });

    it("findAll converte falha em 500 padronizado", async () => {
      repo.findAllSorted.mockRejectedValue(new Error("db"));
      await expect(build().findAll()).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it("findOne 404 quando não existe", async () => {
      repo.findOneById.mockResolvedValue(null);
      await expect(build().findOne("x")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("UpdateInformativeService", () => {
    const dto = {
      title: "T",
      description: "D",
      public: true,
    } as UpdateInformativeDto;

    it("404 quando não existe e não abre transação", async () => {
      repo.findOneWithRelations.mockResolvedValue(null);
      const transaction = jest.fn();
      const service = new UpdateInformativeService(
        { transaction } as unknown as DataSource,
        repo as unknown as InformativeRepository,
        {} as RouteService,
      );
      await expect(service.execute("x", dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    it("atualiza o banner e sincroniza a rota na mesma transação", async () => {
      const existing = { id: "i1", route: { id: "r1" } };
      repo.findOneWithRelations.mockResolvedValue(existing);
      const merged = { ...existing, ...dto };
      const manager = {
        merge: jest.fn().mockReturnValue(merged),
        save: jest.fn().mockResolvedValue(merged),
      };
      const transaction = jest.fn(
        (cb: (m: typeof manager) => Promise<unknown>) => cb(manager),
      );
      const upsertRoute = jest
        .fn()
        .mockResolvedValue({ id: "r1", path: "informativo_t" });
      const service = new UpdateInformativeService(
        { transaction } as unknown as DataSource,
        repo as unknown as InformativeRepository,
        { upsertRoute } as unknown as RouteService,
      );
      const result = await service.execute("i1", dto);
      expect(upsertRoute).toHaveBeenCalledWith(
        "r1",
        expect.objectContaining({
          path: "informativo_",
          title: "T",
          public: true,
        }),
        expect.anything(),
      );
      const sent = upsertRoute.mock.calls[0] as unknown[];
      expect(sent[1]).not.toHaveProperty("type");
      expect(sent[1]).not.toHaveProperty("entityId");
      expect(result.route).toEqual({ id: "r1", path: "informativo_t" });
    });
  });
});
