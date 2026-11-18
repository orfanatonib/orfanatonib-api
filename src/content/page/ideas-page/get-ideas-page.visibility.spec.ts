/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { NotFoundException } from "@nestjs/common";
import type { Request } from "express";

import { GetIdeasPageService } from "./services/get-ideas-page.service";

const page = (id: string, isPublic: boolean) =>
  ({
    id,
    title: id,
    subtitle: "s",
    description: "d",
    public: isPublic,
    route: { id: "r", path: "/p" },
    sections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never;

function setup(loggedIn: boolean) {
  const pages = {
    findAllPagesWithSections: jest.fn(async () => [
      page("pub", true),
      page("priv", false),
    ]),
    findOnePageById: jest.fn(async (id: string) =>
      id === "pub" ? page("pub", true) : page("priv", false),
    ),
  };
  const media = { findManyMediaItemsByTargets: jest.fn(async () => []) };
  const auth = { isLoggedIn: jest.fn(async () => loggedIn) };
  return new GetIdeasPageService(pages as never, media as never, auth as never);
}

describe("páginas de ideias: visibilidade por sessão", () => {
  const req = {} as Request;

  it("anônimo só recebe páginas públicas; com sessão, todas", async () => {
    const anon = setup(false);
    expect(
      (await anon.findAllPagesWithMedia(await anon.canSeeNonPublic(req))).map(
        (p) => p.id,
      ),
    ).toEqual(["pub"]);
    const logged = setup(true);
    expect(
      (
        await logged.findAllPagesWithMedia(await logged.canSeeNonPublic(req))
      ).map((p) => p.id),
    ).toEqual(["pub", "priv"]);
  });

  it("findPageWithMedia: não pública é 404 para anônimo; pública e com sessão passam", async () => {
    const svc = setup(false);
    await expect(svc.findPageWithMedia("priv", false)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect((await svc.findPageWithMedia("pub", false)).id).toBe("pub");
    expect((await svc.findPageWithMedia("priv", true)).id).toBe("priv");
  });
});
