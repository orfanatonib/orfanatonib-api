/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DeleteIdeasPageService } from "./delete-ideas-page.service";
import { fakeWriteRepo } from "./ideas-page-spec-helpers";

const page = {
  id: "p1",
  route: { id: "r1" },
  sections: [{ id: "s1" }, { id: "s2" }],
};
const media = [
  { id: "m1", isLocalFile: true, url: "https://b/k/1.png" },
  { id: "m2", isLocalFile: false, url: "https://youtu.be/x" },
];

function setup(
  options: { found?: boolean; clean?: boolean; txFailure?: Error } = {},
) {
  const pages = {
    findOnePageById: jest.fn(async () =>
      options.found === false ? null : page,
    ),
  };
  const tx = {
    removeMedia: jest.fn(async () => undefined),
    removePageWithRoute: jest.fn(async () => {
      if (options.txFailure) throw options.txFailure;
      return options.clean ?? true;
    }),
  };
  const writeRepo = fakeWriteRepo(tx);
  const processor = {
    findManyMediaItemsByTargets: jest.fn(async () => media),
  };
  const storage = { deleteAfterCommit: jest.fn(async () => undefined) };
  const service = new DeleteIdeasPageService(
    pages as never,
    writeRepo as never,
    processor as never,
    storage as never,
  );
  return { service, tx, storage, processor };
}

describe("DeleteIdeasPageService", () => {
  it("feliz: remove linhas na transação e só depois apaga os arquivos locais", async () => {
    const { service, tx, storage } = setup();
    await service.removeIdeasPage("p1");
    expect(tx.removeMedia).toHaveBeenCalledWith(media);
    expect(tx.removePageWithRoute).toHaveBeenCalledWith(page, ["s1", "s2"]);
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([
      "https://b/k/1.png",
    ]);
  });

  it("não encontrado ⇒ 404, sem transação nem remoção no bucket", async () => {
    const { service, tx, storage } = setup({ found: false });
    await expect(service.removeIdeasPage("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.removeMedia).not.toHaveBeenCalled();
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[ideas-page.delete.ideas-pages-id#rollback-de-transacao] seção sobrando ⇒ rollback e nenhum objeto apagado (sem referência quebrada)", async () => {
    const { service, storage } = setup({ clean: false });
    await expect(service.removeIdeasPage("p1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("[ideas-page.delete.ideas-pages-id#falha-do-colaborador-sem-efeito-parcial] falha do banco ⇒ 400 e bucket intocado", async () => {
    const { service, storage } = setup({ txFailure: new Error("fk") });
    await expect(service.removeIdeasPage("p1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
  });

  it("página sem seções não consulta mídia", async () => {
    const { service, processor, storage } = setup();
    page.sections = [];
    await service.removeIdeasPage("p1");
    page.sections = [{ id: "s1" }, { id: "s2" }];
    expect(processor.findManyMediaItemsByTargets).not.toHaveBeenCalled();
    expect(storage.deleteAfterCommit).toHaveBeenCalledWith([]);
  });
});
