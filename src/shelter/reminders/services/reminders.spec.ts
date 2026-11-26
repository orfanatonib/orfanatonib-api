import { Test } from "@nestjs/testing";
import { NotificationService } from "src/communication/notification/services/notification.service";
import { PendingWorkRepository } from "../repositories/pending-work.repository";
import { PagelaReminderService } from "./pagela-reminder.service";
import { VisitReportReminderService } from "./visit-report-reminder.service";
import { RemindersScheduler } from "../reminders.scheduler";
import {
  PendingPagelaGroup,
  PendingVisitReport,
  ReminderRecipient,
} from "../types";

const leader = (
  overrides: Partial<ReminderRecipient> = {},
): ReminderRecipient => ({
  userId: "leader-user-id",
  name: "Maria",
  email: "maria@orfanatonib.test",
  ...overrides,
});

const visit = (
  overrides: Partial<PendingVisitReport> = {},
): PendingVisitReport => ({
  scheduleId: "schedule-1",
  visitNumber: 3,
  visitDate: "2026-09-01",
  shelterId: "shelter-1",
  shelterName: "Abrigo Esperança",
  teamId: "team-1",
  ...overrides,
});

const pagelaGroup = (
  overrides: Partial<PendingPagelaGroup> = {},
): PendingPagelaGroup => ({
  shelterId: "shelter-1",
  shelterName: "Abrigo Esperança",
  teamId: "team-1",
  year: 2026,
  visit: 3,
  pendingCount: 5,
  ...overrides,
});

describe("VisitReportReminderService", () => {
  const pendingWork = {
    findVisitsWithoutReport: jest.fn(),
    findTeamLeaders: jest.fn(),
  };
  const notificationService = { sendVisitReportReminder: jest.fn() };

  let service: VisitReportReminderService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        VisitReportReminderService,
        { provide: PendingWorkRepository, useValue: pendingWork },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(VisitReportReminderService);

    pendingWork.findVisitsWithoutReport.mockResolvedValue([]);
    pendingWork.findTeamLeaders.mockResolvedValue([leader()]);
    notificationService.sendVisitReportReminder.mockResolvedValue(undefined);
  });

  it("não cobra ninguém quando não há visita pendente", async () => {
    await expect(service.run()).resolves.toBe(0);

    expect(notificationService.sendVisitReportReminder).not.toHaveBeenCalled();
  });

  it("cobra cada líder da equipe da visita sem relatório", async () => {
    pendingWork.findVisitsWithoutReport.mockResolvedValue([visit()]);
    pendingWork.findTeamLeaders.mockResolvedValue([
      leader({ email: "a@test" }),
      leader({ email: "b@test", name: "João" }),
    ]);

    await expect(service.run()).resolves.toBe(1);

    expect(notificationService.sendVisitReportReminder).toHaveBeenCalledTimes(
      2,
    );
    expect(notificationService.sendVisitReportReminder).toHaveBeenCalledWith(
      "a@test",
      expect.objectContaining({ shelterName: "Abrigo Esperança" }),
      expect.objectContaining({ dedupeKey: expect.any(String) as string }),
    );
  });

  it("usa uma chave por visita e por destinatário, para não repetir a cobrança", async () => {
    pendingWork.findVisitsWithoutReport.mockResolvedValue([
      visit({ scheduleId: "s1" }),
      visit({ scheduleId: "s2" }),
    ]);

    await service.run();

    const calls = notificationService.sendVisitReportReminder.mock
      .calls as Array<[string, unknown, { dedupeKey: string }]>;
    const keys = calls.map(([, , options]) => options.dedupeKey);
    expect(new Set(keys).size).toBe(2);
    expect(keys[0]).toContain("s1");
    expect(keys[1]).toContain("s2");
  });

  it("um líder com envio falhando não impede os demais de serem cobrados (e a passada acusa a falha)", async () => {
    pendingWork.findVisitsWithoutReport.mockResolvedValue([visit()]);
    pendingWork.findTeamLeaders.mockResolvedValue([
      leader({ email: "quebrado@orfanatonib.test" }),
      leader({ email: "ok@orfanatonib.test" }),
    ]);
    notificationService.sendVisitReportReminder
      .mockRejectedValueOnce(new Error("e-mail inválido"))
      .mockResolvedValueOnce(undefined);

    await expect(service.run()).rejects.toThrow("1 aviso(s) falharam");
    expect(notificationService.sendVisitReportReminder).toHaveBeenCalledTimes(
      2,
    );
    expect(notificationService.sendVisitReportReminder.mock.calls[1][0]).toBe(
      "ok@orfanatonib.test",
    );
  });

  it("não cobra quando a equipe não tem líder ativo", async () => {
    pendingWork.findVisitsWithoutReport.mockResolvedValue([visit()]);
    pendingWork.findTeamLeaders.mockResolvedValue([]);

    await service.run();

    expect(notificationService.sendVisitReportReminder).not.toHaveBeenCalled();
  });
});

describe("PagelaReminderService", () => {
  const pendingWork = {
    findLatestPastVisit: jest.fn(),
    hasAnyPagela: jest.fn(),
    findShelteredWithoutPagela: jest.fn(),
    findTeamLeaders: jest.fn(),
  };
  const notificationService = { sendPagelaReminder: jest.fn() };

  let service: PagelaReminderService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        PagelaReminderService,
        { provide: PendingWorkRepository, useValue: pendingWork },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(PagelaReminderService);

    pendingWork.findLatestPastVisit.mockResolvedValue({ year: 2026, visit: 3 });
    pendingWork.hasAnyPagela.mockResolvedValue(true);
    pendingWork.findShelteredWithoutPagela.mockResolvedValue([pagelaGroup()]);
    pendingWork.findTeamLeaders.mockResolvedValue([leader()]);
    notificationService.sendPagelaReminder.mockResolvedValue(undefined);
  });

  it("cobra o líder com a contagem de pagelas pendentes", async () => {
    await expect(service.run()).resolves.toBe(1);

    expect(notificationService.sendPagelaReminder).toHaveBeenCalledWith(
      "maria@orfanatonib.test",
      expect.objectContaining({
        shelterName: "Abrigo Esperança",
        pendingCount: 5,
        referenceLabel: "a visita 3 de 2026",
      }),
      expect.objectContaining({ dedupeKey: expect.any(String) as string }),
    );
  });

  it("não cobra quando nenhuma visita passada foi encontrada", async () => {
    pendingWork.findLatestPastVisit.mockResolvedValue(null);

    await expect(service.run()).resolves.toBe(0);
    expect(notificationService.sendPagelaReminder).not.toHaveBeenCalled();
  });

  it("não cobra quando nenhuma pagela foi lançada: a visita pode não ter ocorrido", async () => {
    pendingWork.hasAnyPagela.mockResolvedValue(false);

    await expect(service.run()).resolves.toBe(0);
    expect(notificationService.sendPagelaReminder).not.toHaveBeenCalled();
  });

  it("um líder com envio falhando não impede os demais de serem cobrados", async () => {
    pendingWork.findLatestPastVisit.mockResolvedValue({ year: 2026, visit: 3 });
    pendingWork.hasAnyPagela.mockResolvedValue(true);
    pendingWork.findShelteredWithoutPagela.mockResolvedValue([pagelaGroup()]);
    pendingWork.findTeamLeaders.mockResolvedValue([
      leader({ email: "quebrado@orfanatonib.test" }),
      leader({ email: "ok@orfanatonib.test" }),
    ]);
    notificationService.sendPagelaReminder
      .mockRejectedValueOnce(new Error("e-mail inválido"))
      .mockResolvedValueOnce(undefined);

    await expect(service.run()).rejects.toThrow("1 aviso(s) falharam");
    expect(notificationService.sendPagelaReminder).toHaveBeenCalledTimes(2);
  });

  it("ignora abrigo sem pendência", async () => {
    pendingWork.findShelteredWithoutPagela.mockResolvedValue([
      pagelaGroup({ pendingCount: 0 }),
    ]);

    await service.run();

    expect(notificationService.sendPagelaReminder).not.toHaveBeenCalled();
  });
});

describe("RemindersScheduler", () => {
  const visitReportReminders = { run: jest.fn() };
  const pagelaReminders = { run: jest.fn() };

  let scheduler: RemindersScheduler;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        RemindersScheduler,
        {
          provide: VisitReportReminderService,
          useValue: visitReportReminders,
        },
        { provide: PagelaReminderService, useValue: pagelaReminders },
      ],
    }).compile();
    moduleRef.useLogger(false);

    scheduler = moduleRef.get(RemindersScheduler);

    visitReportReminders.run.mockResolvedValue(0);
    pagelaReminders.run.mockResolvedValue(0);
  });

  it("roda os dois lembretes na passada diária", async () => {
    await scheduler.runDaily();

    expect(visitReportReminders.run).toHaveBeenCalledTimes(1);
    expect(pagelaReminders.run).toHaveBeenCalledTimes(1);
  });

  it("uma falha num lembrete não impede o outro", async () => {
    visitReportReminders.run.mockRejectedValue(new Error("banco fora do ar"));

    await expect(scheduler.runDaily()).resolves.toBeUndefined();
    expect(pagelaReminders.run).toHaveBeenCalledTimes(1);
  });
});
