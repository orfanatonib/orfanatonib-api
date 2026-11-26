/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { NotFoundException } from "@nestjs/common";

import { GetIntegrationService } from "./get-integration.service";

const integ = (id: string) =>
  ({
    id,
    name: id,
    phone: "1",
    gaLeader: "g",
    baptized: true,
    churchYears: 1,
    previousMinistry: "p",
    integrationYear: 2026,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never;
const media = (targetId: string, url: string) =>
  ({
    id: url,
    targetId,
    url,
    title: "t",
    description: "d",
    mediaType: "image",
    uploadType: "upload",
    isLocalFile: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never;

function setup() {
  const repo = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
  };
  const mediaProc = {
    findManyMediaItemsByTargets: jest.fn(async () => []),
    findMediaItemsByTarget: jest.fn(async () => []),
  };
  return {
    repo,
    mediaProc,
    svc: new GetIntegrationService(repo as never, mediaProc as never),
  };
}

describe("GetIntegrationService", () => {
  it("findOne de id inexistente é 404 (antes lançava Error genérico = 500)", async () => {
    const { svc, repo } = setup();
    repo.findById.mockResolvedValue(null);
    await expect(svc.findOne("x")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lista associa a mídia de cada integração em uma única consulta", async () => {
    const { svc, repo, mediaProc } = setup();
    repo.findAll.mockResolvedValue([integ("a"), integ("b")]);
    mediaProc.findManyMediaItemsByTargets.mockResolvedValue([
      media("b", "u1"),
      media("b", "u2"),
    ] as never);
    const out = await svc.findAll();
    expect(mediaProc.findManyMediaItemsByTargets).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(out[0])).not.toContain("u1");
    expect(JSON.stringify(out[1])).toContain("u1");
    expect(JSON.stringify(out[1])).toContain("u2");
  });

  it("paginação devolve total, página e limite padrão", async () => {
    const { svc, repo } = setup();
    repo.findAllPaginated.mockResolvedValue({ data: [integ("a")], total: 7 });
    const out = await svc.findAllPaginated({} as never);
    expect(out).toMatchObject({ total: 7, page: 1, limit: 10 });
  });
});
