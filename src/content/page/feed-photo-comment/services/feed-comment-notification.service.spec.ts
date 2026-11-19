/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { FeedCommentStatus } from "../enums/feed-comment-status.enum";
import { FeedCommentNotificationService } from "./feed-comment-notification.service";

const comment = (over: object = {}) =>
  ({
    id: "c1",
    sectionId: "s1",
    authorId: "me",
    content: "Que   lindo!\nDeus abençoe",
    status: FeedCommentStatus.PENDING,
    moderationReason: null,
    author: { name: "Maria Souza Lima", email: "maria@x.com" },
    ...over,
  }) as never;

const setup = () => {
  const notifications = {
    sendFeedCommentPendingNotification: jest.fn(async () => undefined),
    sendFeedCommentApprovedEmail: jest.fn(async () => undefined),
    sendFeedCommentRejectedEmail: jest.fn(async () => undefined),
  };
  const users = { findAdminEmails: jest.fn(async () => ["adm@x.com"]) };
  const sections = {
    findFeedContexts: jest.fn(
      async () => new Map([["s1", { caption: "Visita de sábado" }]]),
    ),
  };
  return {
    notifications,
    users,
    sections,
    service: new FeedCommentNotificationService(
      notifications as never,
      users as never,
      sections as never,
    ),
  };
};

describe("FeedCommentNotificationService", () => {
  it("pendente: avisa os admins só com nome e legenda (sem texto nem e-mail do autor)", async () => {
    const { service, notifications } = setup();
    await service.notifyPending(comment());
    expect(
      notifications.sendFeedCommentPendingNotification,
    ).toHaveBeenCalledWith(
      { authorName: "Maria Souza Lima", postCaption: "Visita de sábado" },
      ["adm@x.com"],
    );
    const payload = JSON.stringify(
      notifications.sendFeedCommentPendingNotification.mock.calls,
    );
    expect(payload).not.toMatch(/maria@x|lindo/);
  });

  it("pendente sem admins: nada é enviado", async () => {
    const { service, notifications, users } = setup();
    users.findAdminEmails.mockResolvedValueOnce([]);
    await service.notifyPending(comment());
    expect(
      notifications.sendFeedCommentPendingNotification,
    ).not.toHaveBeenCalled();
  });

  it("aprovado: e-mail ao autor com trecho achatado", async () => {
    const { service, notifications } = setup();
    await service.notifyApproved(
      comment({ status: FeedCommentStatus.APPROVED }),
    );
    expect(notifications.sendFeedCommentApprovedEmail).toHaveBeenCalledWith(
      {
        userName: "Maria Souza Lima",
        commentExcerpt: "Que lindo! Deus abençoe",
        postCaption: "Visita de sábado",
      },
      "maria@x.com",
    );
  });

  it("reprovado: e-mail ao autor com o motivo; sem motivo não envia", async () => {
    const { service, notifications } = setup();
    await service.notifyRejected(
      comment({
        status: FeedCommentStatus.REJECTED,
        moderationReason: "Fora do tema",
      }),
    );
    expect(notifications.sendFeedCommentRejectedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "Fora do tema" }),
      "maria@x.com",
    );
    notifications.sendFeedCommentRejectedEmail.mockClear();
    await service.notifyRejected(
      comment({ status: FeedCommentStatus.REJECTED }),
    );
    expect(notifications.sendFeedCommentRejectedEmail).not.toHaveBeenCalled();
  });

  it("falha de e-mail nunca propaga", async () => {
    const { service, notifications } = setup();
    notifications.sendFeedCommentApprovedEmail.mockRejectedValueOnce(
      new Error("smtp"),
    );
    await expect(service.notifyApproved(comment())).resolves.toBeUndefined();
  });
});
