import { Logger } from "@nestjs/common";

import { UserRole } from "src/core/auth/auth.types";
import { EventAudience, type EventEntity } from "../entities/event.entity";
import { EventNotificationHelper } from "./event-notification.helper";

const event = (over: Partial<EventEntity> = {}): EventEntity =>
  ({
    id: "e1",
    title: "Culto",
    description: "d",
    date: "2026-12-01",
    location: "Igreja",
    audience: EventAudience.ALL,
    ...over,
  }) as EventEntity;

const user = (email: string, active = true) => ({ email, active });

function setup(
  users: Array<{ email: string; active: boolean }> = [
    user("a@x.com"),
    user("b@x.com"),
  ],
) {
  const notification = {
    sendEventNotification: jest.fn().mockResolvedValue(undefined),
  };
  const userRepo = { findByRoles: jest.fn().mockResolvedValue(users) };
  jest.spyOn(Logger.prototype, "log").mockImplementation();
  jest.spyOn(Logger.prototype, "warn").mockImplementation();
  jest.spyOn(Logger.prototype, "error").mockImplementation();
  return {
    notification,
    userRepo,
    helper: new EventNotificationHelper(
      notification as never,
      userRepo as never,
    ),
  };
}

afterEach(() => jest.restoreAllMocks());

describe("EventNotificationHelper", () => {
  it("evento para todos avisa membros, líderes e admins ativos, ignorando inativos e sem e-mail", async () => {
    const { helper, notification, userRepo } = setup([
      user("a@x.com"),
      user("off@x.com", false),
      user(""),
    ]);
    await helper.notifyEventCreated(event());
    expect(userRepo.findByRoles).toHaveBeenCalledWith([
      UserRole.MEMBER,
      UserRole.LEADER,
      UserRole.ADMIN,
    ]);
    expect(notification.sendEventNotification).toHaveBeenCalledTimes(1);
    expect(notification.sendEventNotification.mock.calls[0][1]).toEqual([
      "a@x.com",
    ]);
  });

  it("evento só para líderes busca apenas líderes e admins", async () => {
    const { helper, userRepo } = setup();
    await helper.notifyEventCreated(event({ audience: EventAudience.LEADERS }));
    expect(userRepo.findByRoles).toHaveBeenCalledWith([
      UserRole.LEADER,
      UserRole.ADMIN,
    ]);
  });

  it("sem destinatários não envia nada", async () => {
    const { helper, notification } = setup([]);
    await helper.notifyEventCreated(event());
    expect(notification.sendEventNotification).not.toHaveBeenCalled();
  });

  it("falha do envio é registrada e NÃO propaga (o evento já foi gravado)", async () => {
    const { helper, notification } = setup();
    notification.sendEventNotification.mockRejectedValue(new Error("smtp"));
    await expect(helper.notifyEventCreated(event())).resolves.toBeUndefined();
  });

  it("atualização sem mudança relevante não envia e-mail", async () => {
    const { helper, notification } = setup();
    await helper.notifyEventUpdated(event(), event());
    expect(notification.sendEventNotification).not.toHaveBeenCalled();
  });

  it.each([
    [{ date: "2026-12-02" }, "data"],
    [{ location: "Outro" }, "local"],
  ])("mudança só de %j envia aviso específico (%s)", async (change, _label) => {
    const { helper, notification } = setup();
    await helper.notifyEventUpdated(event(), event(change));
    expect(notification.sendEventNotification).toHaveBeenCalledTimes(1);
  });

  it("mudar título envia o aviso genérico de atualização mesmo se a data também mudou", async () => {
    const { helper, notification } = setup();
    await helper.notifyEventUpdated(
      event(),
      event({ title: "Novo", date: "2026-12-09" }),
    );
    const [payload] = notification.sendEventNotification.mock.calls[0];
    expect(payload.title).toBe("Novo");
  });

  it("exclusão avisa o público do evento", async () => {
    const { helper, notification } = setup();
    await helper.notifyEventDeleted(event());
    expect(notification.sendEventNotification).toHaveBeenCalledTimes(1);
  });
});
