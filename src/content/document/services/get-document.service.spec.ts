import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import { GetDocumentService } from "./get-document.service";

const doc = (id: string) =>
  ({
    id,
    name: `Doc ${id}`,
    description: "d",
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never;
const media = (targetId: string) =>
  ({
    id: `m-${targetId}`,
    targetId,
    url: `https://x/${targetId}.pdf`,
    title: "t",
    description: "d",
    mediaType: "document",
    uploadType: "link",
    isLocalFile: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never;

function setup() {
  const repo = { findFiltered: jest.fn(), findOneById: jest.fn() };
  const media = {
    findManyMediaItemsByTargets: jest.fn(),
    findMediaItemsByTarget: jest.fn(),
  };
  return {
    repo,
    media,
    svc: new GetDocumentService(repo as never, media as never),
  };
}

describe("GetDocumentService", () => {
  it("lista sem documentos não consulta mídia", async () => {
    const { svc, repo, media: m } = setup();
    repo.findFiltered.mockResolvedValue({ items: [], total: 0 });
    expect(await svc.findAll()).toEqual([]);
    expect(m.findManyMediaItemsByTargets).not.toHaveBeenCalled();
  });

  it("lista associa cada mídia ao seu documento em UMA consulta", async () => {
    const { svc, repo, media: m } = setup();
    repo.findFiltered.mockResolvedValue({
      items: [doc("a"), doc("b")],
      total: 2,
    });
    m.findManyMediaItemsByTargets.mockResolvedValue([media("b")]);
    const out = await svc.findAll({ search: "x" } as never);
    expect(m.findManyMediaItemsByTargets).toHaveBeenCalledTimes(1);
    expect(out).toHaveLength(2);
    expect(JSON.stringify(out[1])).toContain("b.pdf");
    expect(JSON.stringify(out[0])).not.toContain("b.pdf");
  });

  it("falha do repositório vira 500 genérico (sem vazar detalhe)", async () => {
    const { svc, repo } = setup();
    repo.findFiltered.mockRejectedValue(new Error("db secret"));
    await expect(svc.findAll()).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it("findOne: 404 quando não existe; devolve com a mídia quando existe", async () => {
    const { svc, repo, media: m } = setup();
    repo.findOneById.mockResolvedValue(null);
    await expect(svc.findOne("x")).rejects.toBeInstanceOf(NotFoundException);
    repo.findOneById.mockResolvedValue(doc("a"));
    m.findMediaItemsByTarget.mockResolvedValue([media("a")]);
    expect(JSON.stringify(await svc.findOne("a"))).toContain("a.pdf");
  });
});
