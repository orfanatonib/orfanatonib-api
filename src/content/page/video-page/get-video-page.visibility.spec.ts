/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { NotFoundException } from "@nestjs/common";
import type { Request } from "express";

import { GetVideosPageService } from "./services/get-video-page.service";

const page = (id: string, isPublic: boolean) =>
  ({
    id,
    name: id,
    description: "d",
    public: isPublic,
    route: { id: "r", path: "/p" },
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never;

function setup(loggedIn: boolean) {
  const pages = {
    findAll: jest.fn(async () => [page("pub", true), page("priv", false)]),
    findById: jest.fn(async (id: string) =>
      id === "pub" ? page("pub", true) : page("priv", false),
    ),
  };
  const media = {
    findManyMediaItemsByTargets: jest.fn(async () => []),
    findMediaItemsByTarget: jest.fn(async () => []),
  };
  const auth = { isLoggedIn: jest.fn(async () => loggedIn) };
  return new GetVideosPageService(
    pages as never,
    media as never,
    auth as never,
  );
}

describe("páginas de vídeo: visibilidade por sessão", () => {
  const req = {} as Request;

  it("anônimo só recebe páginas públicas; com sessão, todas", async () => {
    const anon = setup(false);
    expect(
      (await anon.findAll(await anon.canSeeNonPublic(req))).map((p) => p.id),
    ).toEqual(["pub"]);
    const logged = setup(true);
    expect(
      (await logged.findAll(await logged.canSeeNonPublic(req))).map(
        (p) => p.id,
      ),
    ).toEqual(["pub", "priv"]);
  });

  it("findOne: página não pública é 404 para anônimo; pública e com sessão passam", async () => {
    const svc = setup(false);
    await expect(svc.findOne("priv", false)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect((await svc.findOne("pub", false)).id).toBe("pub");
    expect((await svc.findOne("priv", true)).id).toBe("priv");
  });
});
