import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import { DeleteContactService } from "./contact/services/delete-contact.service";
import { UpdateContactService } from "./contact/services/update-contact.service";
import { DeleteSiteFeedbackService } from "./feedback/services/delete-site-feedback.service";
import { GetSiteFeedbackService } from "./feedback/services/get-site-feedback.service";
import { UpdateSiteFeedbackService } from "./feedback/services/update-site-feedback.service";

describe("contato", () => {
  const repo = () => ({
    findOneById: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  });

  it("marcar como lido: grava read=true; inexistente é 404; falha do banco vira 500 sem vazar detalhe", async () => {
    const r = repo();
    const svc = new UpdateContactService(r as never);
    r.findOneById.mockResolvedValue({ id: "c", read: false });
    expect(await svc.setReadOnContact("c")).toMatchObject({ read: true });
    expect(r.save).toHaveBeenCalledTimes(1);

    r.findOneById.mockResolvedValue(null);
    await expect(svc.setReadOnContact("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );

    r.findOneById.mockResolvedValue({ id: "c" });
    r.save.mockRejectedValue(new Error("db secret"));
    await expect(svc.setReadOnContact("c")).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it("apagar: remove; inexistente 404 sem remover; falha do banco 500", async () => {
    const r = repo();
    const svc = new DeleteContactService(r as never);
    r.findOneById.mockResolvedValue({ id: "c" });
    await svc.execute("c");
    expect(r.remove).toHaveBeenCalledTimes(1);

    r.remove.mockClear();
    r.findOneById.mockResolvedValue(null);
    await expect(svc.execute("x")).rejects.toBeInstanceOf(NotFoundException);
    expect(r.remove).not.toHaveBeenCalled();

    r.findOneById.mockResolvedValue({ id: "c" });
    r.remove.mockRejectedValue(new Error("db"));
    await expect(svc.execute("c")).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});

describe("feedback do site", () => {
  function setup() {
    const repo = {
      findAll: jest.fn(),
      findOneBy: jest.fn(),
      findById: jest.fn(),
      save: jest.fn((f: unknown) => Promise.resolve(f)),
      remove: jest.fn(),
    };
    const get = new GetSiteFeedbackService(repo as never);
    return {
      repo,
      get,
      update: new UpdateSiteFeedbackService(repo as never, get),
      del: new DeleteSiteFeedbackService(repo as never, get),
    };
  }

  it("get: lista e busca; inexistente 404", async () => {
    const { repo, get } = setup();
    repo.findAll.mockResolvedValue([{ id: "1" }]);
    expect(await get.findAll()).toHaveLength(1);
    repo.findOneBy.mockResolvedValue(null);
    await expect(get.findOne("x")).rejects.toBeInstanceOf(NotFoundException);
    repo.findOneBy.mockResolvedValue({ id: "1" });
    expect((await get.findOne("1")).id).toBe("1");
  });

  it("marcar como lido: read=true; inexistente 404; falha do banco 500", async () => {
    const { repo, update } = setup();
    repo.findById.mockResolvedValue({ id: "1", read: false });
    expect(await update.setReadOnFeedback("1")).toMatchObject({ read: true });
    repo.findById.mockResolvedValue(null);
    await expect(update.setReadOnFeedback("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    repo.findById.mockResolvedValue({ id: "1" });
    repo.save.mockRejectedValue(new Error("db"));
    await expect(update.setReadOnFeedback("1")).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it("update e remove passam pela busca (404 quando não existe, sem gravar/remover)", async () => {
    const { repo, update, del } = setup();
    repo.findOneBy.mockResolvedValue(null);
    await expect(update.update("x", {} as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(del.remove("x")).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.remove).not.toHaveBeenCalled();
    repo.findOneBy.mockResolvedValue({ id: "1" });
    await del.remove("1");
    expect(repo.remove).toHaveBeenCalledTimes(1);
  });
});
