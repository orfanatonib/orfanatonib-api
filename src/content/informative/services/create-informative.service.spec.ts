import { BadRequestException, Logger } from "@nestjs/common";

import { CreateInformativeService } from "./create-informative.service";

beforeEach(() => {
  jest.spyOn(Logger.prototype, "error").mockImplementation();
});
afterEach(() => jest.restoreAllMocks());

function setup(failAt: "persist" | "route" | null = null) {
  const repository = {
    create: jest.fn((x: object) => ({ ...x })),
    save: jest.fn(async (x: object) => {
      if (failAt === "persist") throw new Error("banco");
      return { id: "i1", ...x };
    }),
  };
  const manager = {
    getRepository: jest.fn().mockReturnValue(repository),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const runner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager,
  };
  const routes = {
    generateAvailablePath: jest.fn().mockResolvedValue("informativo_x"),
    createRouteWithManager:
      failAt === "route"
        ? jest.fn().mockRejectedValue(new Error("rota"))
        : jest.fn().mockResolvedValue({ id: "r1" }),
  };
  const svc = new CreateInformativeService(
    { createQueryRunner: () => runner } as never,
    {} as never,
    routes as never,
  );
  return { svc, runner, routes, manager };
}

const dto = { title: "Aviso", description: "d", public: false } as never;

describe("CreateInformativeService", () => {
  it("feliz: grava o banner, cria a rota na mesma transação, confirma e libera a conexão", async () => {
    const { svc, runner, routes } = setup();
    const result = await svc.createInformative(dto);
    expect(result).toMatchObject({ id: "i1", route: { id: "r1" } });
    expect(routes.createRouteWithManager).toHaveBeenCalledWith(
      runner.manager,
      expect.objectContaining({
        path: "informativo_x",
        entityId: "i1",
        public: false,
      }),
    );
    expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(runner.release).toHaveBeenCalledTimes(1);
  });

  it("falha ao gravar o banner: rollback, 400 com a causa e nada de rota", async () => {
    const { svc, runner, routes } = setup("persist");
    await expect(svc.createInformative(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(routes.createRouteWithManager).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalledTimes(1);
  });

  it("falha ao criar a rota: rollback (o banner não fica sem rota) e a conexão é liberada", async () => {
    const { svc, runner } = setup("route");
    await expect(svc.createInformative(dto)).rejects.toThrow(
      "Error creating informative banner: rota",
    );
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.release).toHaveBeenCalledTimes(1);
  });
});
