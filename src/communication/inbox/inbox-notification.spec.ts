import { ResourceNotFoundException } from "src/common/exceptions";

import { InboxNotificationStatusFilter } from "./enums/inbox-notification-status-filter.enum";
import { InboxNotificationSource } from "./enums/inbox-notification-source.enum";
import { InboxNotificationTargetKind } from "./enums/inbox-notification-target-kind.enum";
import { InboxNotificationType } from "./enums/inbox-notification-type.enum";
import { CreateInboxNotificationService } from "./services/create-inbox-notification.service";
import { GetInboxNotificationService } from "./services/get-inbox-notification.service";
import { UpdateInboxNotificationService } from "./services/update-inbox-notification.service";
import { InboxNoticeInput } from "./types";
import {
  buildNoticePreview,
  buildNoticeRows,
  buildRevision,
  clampLabel,
} from "./utils/inbox-notice.utils";

const input: InboxNoticeInput = {
  source: InboxNotificationSource.ORFANATO_STUDIO,
  type: InboxNotificationType.CHANGES_REQUESTED,
  targetKind: InboxNotificationTargetKind.STUDIO_PACKAGE,
  targetId: "p1",
  label: "  Zaqueu \n e a árvore ",
  targetAudience: "CHILD",
  dedupeKey: "k1",
};

describe("inbox: utils", () => {
  it("rótulo sem quebra de linha e com limite", () => {
    expect(clampLabel("  a \n b ")).toBe("a b");
    expect(clampLabel("x".repeat(300))).toHaveLength(160);
  });

  it("prévia traz a origem e o rótulo", () => {
    expect(buildNoticePreview(input)).toBe(
      "Estúdio Orfanato · Zaqueu e a árvore",
    );
    expect(buildNoticePreview({ ...input, label: "" })).toBe(
      "Estúdio Orfanato",
    );
  });

  it("um aviso por destinatário, sem repetir", () => {
    const rows = buildNoticeRows(input, ["a", "b", "a"]);
    expect(rows.map((row) => row.recipientId)).toEqual(["a", "b"]);
    expect(rows[0]).toMatchObject({
      title: "Ajuste solicitado",
      targetAudience: "CHILD",
      targetStage: null,
      dedupeKey: "k1",
    });
  });

  it("a revisão muda com contagem, leitura e data", () => {
    const base = {
      total: 2,
      unreadCount: 1,
      lastChangedAt: new Date("2026-11-23T10:00:00Z"),
      recentUnread: [],
    };
    expect(buildRevision(base)).toBe("2:1:2026-11-23T10:00:00.000Z");
    expect(buildRevision({ ...base, unreadCount: 0 })).not.toBe(
      buildRevision(base),
    );
    expect(buildRevision({ ...base, lastChangedAt: null })).toBe("2:1:-");
  });
});

describe("CreateInboxNotificationService", () => {
  it("avisa todos os admins ativos", async () => {
    const notifications = { createMany: jest.fn().mockResolvedValue(2) };
    const users = { findAdminIds: jest.fn().mockResolvedValue(["a1", "a2"]) };
    const svc = new CreateInboxNotificationService(
      notifications as never,
      users as never,
    );
    await expect(svc.notifyAdmins(input)).resolves.toBe(2);
    expect(notifications.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ recipientId: "a1" }),
      expect.objectContaining({ recipientId: "a2" }),
    ]);
  });

  it("nunca lança: falha do banco vira 0 e a operação de origem segue", async () => {
    const notifications = {
      createMany: jest.fn().mockRejectedValue(new Error("db fora")),
    };
    const users = { findAdminIds: jest.fn().mockResolvedValue(["a1"]) };
    const svc = new CreateInboxNotificationService(
      notifications as never,
      users as never,
    );
    await expect(svc.notifyAdmins(input)).resolves.toBe(0);
  });

  it("nunca lança: falha ao listar admins", async () => {
    const svc = new CreateInboxNotificationService(
      { createMany: jest.fn() } as never,
      { findAdminIds: jest.fn().mockRejectedValue(new Error("x")) } as never,
    );
    await expect(svc.notifyAdmins(input)).resolves.toBe(0);
  });

  it("sem admins não grava nada", async () => {
    const notifications = { createMany: jest.fn().mockResolvedValue(0) };
    const svc = new CreateInboxNotificationService(
      notifications as never,
      { findAdminIds: jest.fn().mockResolvedValue([]) } as never,
    );
    await svc.notifyAdmins(input);
    expect(notifications.createMany).toHaveBeenCalledWith([]);
  });
});

describe("GetInboxNotificationService", () => {
  const entity = {
    id: "n1",
    source: InboxNotificationSource.ORFANATO_STUDIO,
    type: InboxNotificationType.PUBLISHED,
    title: "Publicado",
    preview: "p",
    createdAt: new Date("2026-11-23T10:00:00Z"),
    readAt: null,
    targetKind: InboxNotificationTargetKind.STUDIO_PACKAGE,
    targetId: "p1",
    targetAudience: null,
    targetStage: null,
  };

  it("resumo traz contagem e revisão", async () => {
    const repo = {
      summarize: jest.fn().mockResolvedValue({
        total: 1,
        unreadCount: 1,
        lastChangedAt: null,
        recentUnread: [
          { id: "n1", type: entity.type, createdAt: entity.createdAt },
        ],
      }),
    };
    const svc = new GetInboxNotificationService(repo as never);
    const result = await svc.summary("u1");
    expect(result).toMatchObject({
      unreadCount: 1,
      total: 1,
      revision: "1:1:-",
    });
    expect(result.recentUnread[0].id).toBe("n1");
  });

  it("lista só os não lidos quando pedido e devolve a contagem", async () => {
    const repo = {
      findPage: jest.fn().mockResolvedValue({ items: [entity], total: 1 }),
      summarize: jest.fn().mockResolvedValue({ unreadCount: 3 }),
    };
    const svc = new GetInboxNotificationService(repo as never);
    const page = await svc.list("u1", {
      page: 1,
      limit: 10,
      status: InboxNotificationStatusFilter.UNREAD,
    });
    expect(repo.findPage).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ unreadOnly: true }),
    );
    expect(page).toMatchObject({ total: 1, unreadCount: 3 });
    expect(page.items[0].target.id).toBe("p1");
  });

  it("detalhe de aviso de outra pessoa é 404", async () => {
    const svc = new GetInboxNotificationService({
      findOneFor: jest.fn().mockResolvedValue(null),
    } as never);
    await expect(svc.detail("n1", "u1")).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});

describe("UpdateInboxNotificationService", () => {
  it("marcar lida um aviso que não é do usuário é 404", async () => {
    const repo = { markRead: jest.fn().mockResolvedValue(false) };
    const svc = new UpdateInboxNotificationService(repo as never);
    await expect(svc.markRead("n1", "u1")).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });

  it("marcar todas devolve quantas e o resumo novo", async () => {
    const repo = {
      markAllRead: jest.fn().mockResolvedValue(4),
      summarize: jest.fn().mockResolvedValue({
        total: 4,
        unreadCount: 0,
        lastChangedAt: null,
        recentUnread: [],
      }),
    };
    const svc = new UpdateInboxNotificationService(repo as never);
    const result = await svc.markAllRead("u1");
    expect(result.updatedCount).toBe(4);
    expect(result.summary.unreadCount).toBe(0);
  });
});
