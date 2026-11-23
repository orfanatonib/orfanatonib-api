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
    findFiltered: jest.fn(async () => ({ items: [report("r1")], total: 1 })),
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

    it("o ator vira escopo do repositório: líder com o id dele, admin sem restrição de equipe", async () => {
      const { list, auth, reports } = setup();
      auth.tryGetPayload.mockResolvedValue({ sub: "l2", role: "leader" });
      await list.execute(reqWith({}), { teamId: "t1", shelterId: "sh" });
      expect(reports.findFiltered).toHaveBeenLastCalledWith(
        { role: "leader", userId: "l2" },
        { teamId: "t1", shelterId: "sh" },
      );
      auth.tryGetPayload.mockResolvedValue({ sub: "a", role: "admin" });
      await list.execute(reqWith({}));
      expect(reports.findFiltered).toHaveBeenLastCalledWith(
        { role: "admin", userId: "a" },
        {},
      );
    });

    it("membro/sem papel entra no repositório sem papel (lista vazia, decidida lá)", async () => {
      const { list, auth, reports } = setup();
      auth.tryGetPayload.mockResolvedValue({ sub: "m", role: "member" });
      await list.execute(reqWith({}));
      expect(reports.findFiltered).toHaveBeenLastCalledWith(
        { role: null, userId: "m" },
        {},
      );
    });

    it("sem page devolve o array; com page devolve { data, meta } com o total filtrado", async () => {
      const { list, auth, reports } = setup();
      auth.tryGetPayload.mockResolvedValue({ sub: "a", role: "admin" });
      expect(await list.execute(reqWith({}))).toHaveLength(1);
      reports.findFiltered.mockResolvedValue({
        items: [report("r1")],
        total: 25,
      });
      const page = (await list.execute(reqWith({}), {
        page: 2,
        limit: 12,
        sortBy: "shelter",
      } as never)) as unknown as {
        data: unknown[];
        meta: Record<string, unknown>;
      };
      expect(page.data).toHaveLength(1);
      expect(page.meta).toMatchObject({
        page: 2,
        limit: 12,
        totalItems: 25,
        totalPages: 3,
        orderBy: "shelter",
      });
    });
  });
});
