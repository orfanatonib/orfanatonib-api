/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import {
  ResourceConflictException,
  ResourceNotFoundException,
} from "src/common/exceptions";
import { FeedCommentStatus } from "../enums/feed-comment-status.enum";
import { UpdateFeedCommentService } from "./update-feed-comment.service";

const ADMIN = { userId: "admin", isAdmin: true };

const comment = (status: FeedCommentStatus, over: object = {}) => ({
  id: "c1",
  sectionId: "s1",
  authorId: "me",
  content: "Que lindo!",
  status,
  moderationReason: null,
  createdAt: new Date("2026-01-01"),
  reviewedAt: null,
  author: { name: "Maria Souza", email: "maria@x.com" },
  ...over,
});

const setup = (rows: Array<object | null>, decided = true) => {
  const findWithAuthor = jest.fn();
  rows.forEach((row) => findWithAuthor.mockResolvedValueOnce(row));
  const repository = { findWithAuthor, decide: jest.fn(async () => decided) };
  const notifications = {
    notifyApproved: jest.fn(async () => undefined),
    notifyRejected: jest.fn(async () => undefined),
  };
  return {
    repository,
    notifications,
    service: new UpdateFeedCommentService(
      repository as never,
      notifications as never,
    ),
  };
};

describe("UpdateFeedCommentService", () => {
  it("aprova um PENDENTE, registra o moderador e avisa o autor", async () => {
    const { service, repository, notifications } = setup([
      comment(FeedCommentStatus.PENDING),
      comment(FeedCommentStatus.APPROVED),
    ]);
    const out = await service.approve("c1", ADMIN);
    expect(repository.decide).toHaveBeenCalledWith(
      "c1",
      FeedCommentStatus.APPROVED,
      { moderatorId: "admin", reason: null },
    );
    expect(out.status).toBe(FeedCommentStatus.APPROVED);
    expect(notifications.notifyApproved).toHaveBeenCalledTimes(1);
    expect(notifications.notifyRejected).not.toHaveBeenCalled();
  });

  it("reprova um PENDENTE com o motivo e avisa o autor", async () => {
    const { service, repository, notifications } = setup([
      comment(FeedCommentStatus.PENDING),
      comment(FeedCommentStatus.REJECTED, { moderationReason: "Fora do tema" }),
    ]);
    const out = await service.reject("c1", ADMIN, "Fora do tema");
    expect(repository.decide).toHaveBeenCalledWith(
      "c1",
      FeedCommentStatus.REJECTED,
      { moderatorId: "admin", reason: "Fora do tema" },
    );
    expect(out.moderationReason).toBe("Fora do tema");
    expect(notifications.notifyRejected).toHaveBeenCalledTimes(1);
  });

  it("repetir a mesma decisão é idempotente: devolve, não grava e não reenvia e-mail", async () => {
    const { service, repository, notifications } = setup([
      comment(FeedCommentStatus.APPROVED),
    ]);
    const out = await service.approve("c1", ADMIN);
    expect(out.status).toBe(FeedCommentStatus.APPROVED);
    expect(repository.decide).not.toHaveBeenCalled();
    expect(notifications.notifyApproved).not.toHaveBeenCalled();
  });

  it("decisão contrária sobre comentário já moderado: 409", async () => {
    const { service, repository } = setup([
      comment(FeedCommentStatus.REJECTED),
    ]);
    await expect(service.approve("c1", ADMIN)).rejects.toBeInstanceOf(
      ResourceConflictException,
    );
    expect(repository.decide).not.toHaveBeenCalled();

    const other = setup([comment(FeedCommentStatus.APPROVED)]);
    await expect(
      other.service.reject("c1", ADMIN, "motivo"),
    ).rejects.toBeInstanceOf(ResourceConflictException);
  });

  it("outro moderador decidiu no meio: contrário vira 409, igual é idempotente", async () => {
    const lost = setup(
      [comment(FeedCommentStatus.PENDING), comment(FeedCommentStatus.REJECTED)],
      false,
    );
    await expect(lost.service.approve("c1", ADMIN)).rejects.toBeInstanceOf(
      ResourceConflictException,
    );
    expect(lost.notifications.notifyApproved).not.toHaveBeenCalled();

    const same = setup(
      [comment(FeedCommentStatus.PENDING), comment(FeedCommentStatus.APPROVED)],
      false,
    );
    expect((await same.service.approve("c1", ADMIN)).status).toBe(
      FeedCommentStatus.APPROVED,
    );
    expect(same.notifications.notifyApproved).not.toHaveBeenCalled();
  });

  it("inexistente: 404", async () => {
    const { service } = setup([null]);
    await expect(service.approve("x", ADMIN)).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});
