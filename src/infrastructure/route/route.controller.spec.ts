import { NotFoundException } from "@nestjs/common";
import type { Request } from "express";

import { RouteController } from "./route.controller";

describe("RouteController (visibilidade por sessão)", () => {
  const req = {} as Request;
  function setup(loggedIn: boolean) {
    const routes = {
      findAllRoutes: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
    };
    const auth = { isLoggedIn: jest.fn().mockResolvedValue(loggedIn) };
    return {
      routes,
      controller: new RouteController(
        routes as never,
        {} as never,
        auth as never,
      ),
    };
  }

  it.each([[true], [false]])(
    "GET /routes repassa includeNonPublic=%s conforme a sessão",
    async (loggedIn) => {
      const { controller, routes } = setup(loggedIn);
      await controller.findAll(req);
      expect(routes.findAllRoutes).toHaveBeenCalledWith({
        includeNonPublic: loggedIn,
      });
    },
  );

  it("GET /routes/:id anônimo em rota não pública: 404", async () => {
    const { controller, routes } = setup(false);
    routes.findById.mockResolvedValue(null);
    await expect(controller.findOne("id", req)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(routes.findById).toHaveBeenCalledWith("id", {
      includeNonPublic: false,
    });
  });
});
