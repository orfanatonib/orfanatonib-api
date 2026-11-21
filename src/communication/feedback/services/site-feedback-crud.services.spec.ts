import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import { DeleteSiteFeedbackService } from "./delete-site-feedback.service";
import { GetSiteFeedbackService } from "./get-site-feedback.service";
import { UpdateSiteFeedbackService } from "./update-site-feedback.service";

const feedback = () => ({ id: "f1", comment: "bom", rating: 5, read: false });

function repoWith(found: object | null = feedback()) {
  return {
    findAll: jest.fn().mockResolvedValue([found]),
    findOneBy: jest.fn().mockResolvedValue(found),
    findById: jest.fn().mockResolvedValue(found),
    countUnread: jest.fn().mockResolvedValue(3),
    save: jest.fn((entity: object) => Promise.resolve(entity)),
    remove: jest.fn().mockResolvedValue(undefined),
  };
}

describe("GetSiteFeedbackService", () => {
  it("lista tudo pelo repositório", async () => {
    const repo = repoWith();
    await expect(
      new GetSiteFeedbackService(repo as never).findAll(),
    ).resolves.toHaveLength(1);
  });

  it("pendingCount devolve quantos feedbacks ainda não foram lidos", async () => {
    const repo = repoWith();
    await expect(
      new GetSiteFeedbackService(repo as never).pendingCount(),
    ).resolves.toEqual({ pending: 3 });
  });

  it("findOne devolve o registro e responde 404 quando não existe", async () => {
    const ok = new GetSiteFeedbackService(repoWith() as never);
    await expect(ok.findOne("f1")).resolves.toMatchObject({ id: "f1" });

    const missing = new GetSiteFeedbackService(repoWith(null) as never);
    await expect(missing.findOne("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe("UpdateSiteFeedbackService", () => {
  function build(found: object | null = feedback()) {
    const repo = repoWith(found);
    const get = new GetSiteFeedbackService(repo as never);
    return {
      repo,
      svc: new UpdateSiteFeedbackService(repo as never, get),
    };
  }

  it("update mescla só os campos informados e grava", async () => {
    const { svc, repo } = build();
    const result = await svc.update("f1", { comment: "ótimo" } as never);
    expect(result).toMatchObject({ comment: "ótimo", rating: 5 });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it("update de id inexistente: 404 e nada é gravado", async () => {
    const { svc, repo } = build(null);
    await expect(svc.update("x", {} as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("setReadOnFeedback marca como lido", async () => {
    const { svc } = build();
    await expect(svc.setReadOnFeedback("f1")).resolves.toMatchObject({
      read: true,
    });
  });

  it("setReadOnFeedback: 404 quando não existe (não vira 500)", async () => {
    const { svc } = build(null);
    await expect(svc.setReadOnFeedback("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("setReadOnFeedback: falha do banco vira 500 tratado, sem vazar o erro cru", async () => {
    const { svc, repo } = build();
    repo.save.mockRejectedValue(new Error("deadlock"));
    const failure = svc.setReadOnFeedback("f1");
    await expect(failure).rejects.toBeInstanceOf(InternalServerErrorException);
    await expect(failure).rejects.not.toThrow("deadlock");
  });
});

describe("DeleteSiteFeedbackService", () => {
  it("remove o registro encontrado", async () => {
    const repo = repoWith();
    const svc = new DeleteSiteFeedbackService(
      repo as never,
      new GetSiteFeedbackService(repo as never),
    );
    await svc.remove("f1");
    expect(repo.remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: "f1" }),
    );
  });

  it("id inexistente: 404 e nada é removido", async () => {
    const repo = repoWith(null);
    const svc = new DeleteSiteFeedbackService(
      repo as never,
      new GetSiteFeedbackService(repo as never),
    );
    await expect(svc.remove("x")).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.remove).not.toHaveBeenCalled();
  });
});
