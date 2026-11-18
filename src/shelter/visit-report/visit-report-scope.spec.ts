/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { ConflictException, NotFoundException } from "@nestjs/common";

import { UserRole } from "src/core/auth/auth.types";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import { CreateVisitReportService } from "./services/create-visit-report.service";
import { DeleteVisitReportService } from "./services/delete-visit-report.service";
import { ListVisitReportsService } from "./services/list-visit-reports.service";
import { UpdateVisitReportService } from "./services/update-visit-report.service";
import { canAccessReport } from "./utils/visit-report-access.util";

const admin: ShelterAccessContext = { userId: "a", role: UserRole.ADMIN };
const leaderOwn: ShelterAccessContext = { userId: "l1", role: UserRole.LEADER };
const leaderOther: ShelterAccessContext = {
  userId: "l2",
  role: UserRole.LEADER,
};
const member: ShelterAccessContext = { userId: "m", role: UserRole.MEMBER };

const report = (id = "r1") =>
  ({
    id,
    schedule: {
      id: "s1",
      team: { id: "t1", leaders: [{ user: { id: "l1" } }] },
    },
  }) as never;

function setup() {
  const reports = {
    findById: jest.fn(async () => report()),
    findByScheduleId: jest.fn(async () => null),
    findByTeamId: jest.fn(async () => [report("r1")]),
    findByShelterId: jest.fn(async () => [report("r1")]),
    findAll: jest.fn(async () => [report("r1")]),
    findByLeaderId: jest.fn(async () => [report("r1")]),
    isLeaderOfTeam: jest.fn(async (userId: string) => userId === "l1"),
    create: jest.fn(async () => report()),
    update: jest.fn(async () => undefined),
    remove: jest.fn(async () => undefined),
  };
  const schedules = {
    findById: jest.fn(async () => ({ id: "s1", team: { id: "t1" } })),
  };
  const auth = { tryGetPayload: jest.fn() };
  return {
    reports,
    schedules,
    auth,
    create: new CreateVisitReportService(reports as never, schedules as never),
    update: new UpdateVisitReportService(reports as never),
    remove: new DeleteVisitReportService(reports as never),
    list: new ListVisitReportsService(reports as never, auth as never),
  };
}

const dto = {
  scheduleId: "s1",
  teamMembersPresent: 1,
  shelteredHeardMessage: 1,
  caretakersHeardMessage: 1,
  shelteredDecisions: 0,
  caretakersDecisions: 0,
};

describe("escopo dos relatórios de visita", () => {
  it("canAccessReport: admin sim; líder da equipe sim; outro líder e membro não", () => {
    expect(canAccessReport(admin, report())).toBe(true);
    expect(canAccessReport(leaderOwn, report())).toBe(true);
    expect(canAccessReport(leaderOther, report())).toBe(false);
    expect(canAccessReport(member, report())).toBe(false);
  });

  describe("create", () => {
    it("líder da equipe e admin criam", async () => {
      const { create, reports } = setup();
      await create.execute(dto as never, leaderOwn);
      await create.execute(dto as never, admin);
      expect(reports.create).toHaveBeenCalledTimes(2);
    });

    it("líder de OUTRA equipe e membro: 404 e nada gravado", async () => {
      const { create, reports } = setup();
      await expect(
        create.execute(dto as never, leaderOther),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(create.execute(dto as never, member)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(reports.create).not.toHaveBeenCalled();
    });

    it("já existe relatório para a agenda: 409", async () => {
      const { create, reports } = setup();
      reports.findByScheduleId.mockResolvedValue(report());
      await expect(create.execute(dto as never, admin)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe("update / delete / findOne", () => {
    it("fora do escopo: 404 e nada alterado", async () => {
      const { update, remove, list, reports } = setup();
      await expect(
        update.execute("r1", { observation: "x" } as never, leaderOther),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(remove.execute("r1", leaderOther)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(list.findOne("r1", leaderOther)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(reports.update).not.toHaveBeenCalled();
      expect(reports.remove).not.toHaveBeenCalled();
    });

    it("dentro do escopo: altera, remove e lê", async () => {
      const { update, remove, list, reports } = setup();
      await update.execute("r1", { observation: "x" } as never, leaderOwn);
      await remove.execute("r1", admin);
      expect((await list.findOne("r1", leaderOwn)) as unknown).toBeDefined();
      expect(reports.update).toHaveBeenCalledTimes(1);
      expect(reports.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe("listagem", () => {
    const reqWith = (query: Record<string, string>) => ({ query }) as never;

    it("filtro por teamId/shelterId/scheduleId nunca amplia o escopo do líder", async () => {
      const { list, auth, reports } = setup();
      auth.tryGetPayload.mockResolvedValue({ sub: "l2", role: "leader" });
      expect(await list.execute(reqWith({ teamId: "t1" }))).toEqual([]);
      expect(await list.execute(reqWith({ shelterId: "sh" }))).toEqual([]);
      reports.findByScheduleId.mockResolvedValue(report());
      expect(await list.execute(reqWith({ scheduleId: "s1" }))).toEqual([]);
    });

    it("líder dono vê; admin vê; membro/sem papel recebe lista vazia", async () => {
      const { list, auth } = setup();
      auth.tryGetPayload.mockResolvedValue({ sub: "l1", role: "leader" });
      expect(await list.execute(reqWith({ teamId: "t1" }))).toHaveLength(1);
      auth.tryGetPayload.mockResolvedValue({ sub: "a", role: "admin" });
      expect(await list.execute(reqWith({}))).toHaveLength(1);
      auth.tryGetPayload.mockResolvedValue({ sub: "m", role: "member" });
      expect(await list.execute(reqWith({ teamId: "t1" }))).toEqual([]);
      expect(await list.execute(reqWith({}))).toEqual([]);
    });
  });
});
