import { AccessDeniedException } from "src/common/exceptions";
import { UserRole } from "src/core/auth/auth.types";
import type { ShelterAccessContext } from "src/shelter/shelter/types";

import { CreateShelterScheduleService } from "./create-shelter-schedule.service";
import { DeleteShelterScheduleService } from "./delete-shelter-schedule.service";
import { ListShelterSchedulesService } from "./list-shelter-schedules.service";
import { UpdateShelterScheduleService } from "./update-shelter-schedule.service";

const admin: ShelterAccessContext = { userId: "a1", role: UserRole.ADMIN };
const leader: ShelterAccessContext = { userId: "l1", role: UserRole.LEADER };
const member: ShelterAccessContext = { userId: "m1", role: UserRole.MEMBER };

const teamIn = (shelterId: string, id = "t-" + shelterId) => ({
  id,
  shelter: { id: shelterId },
});
const scheduleIn = (shelterId: string) => ({
  id: "sch1",
  team: teamIn(shelterId),
});

/** O líder lidera só o abrigo `s-own`. */
const teams = (team: object | null = teamIn("s-own")) => ({
  findOneEntity: jest.fn().mockResolvedValue(team),
  findLedShelterIds: jest.fn().mockResolvedValue(new Set(["s-own"])),
});

describe("agenda de abrigo — escopo de escrita (plano 21)", () => {
  describe("create", () => {
    const build = (t = teams()) => {
      const svc = new CreateShelterScheduleService(
        {} as never,
        t as never,
        {} as never,
      );
      const execute = jest.spyOn(svc, "execute").mockResolvedValue({} as never);
      return { svc, execute };
    };

    it("líder cria no abrigo que lidera", async () => {
      const { svc, execute } = build();
      await svc.executeAs(leader, { teamId: "t-s-own" } as never);
      expect(execute).toHaveBeenCalled();
    });

    it("líder NÃO cria em equipe de outro abrigo (403) e nada é gravado", async () => {
      const { svc, execute } = build(teams(teamIn("s-other")));
      await expect(
        svc.executeAs(leader, { teamId: "t-s-other" } as never),
      ).rejects.toBeInstanceOf(AccessDeniedException);
      expect(execute).not.toHaveBeenCalled();
    });

    it("membro nunca escreve (403 antes de consultar o banco)", async () => {
      const t = teams();
      const { svc } = build(t);
      await expect(
        svc.executeAs(member, { teamId: "x" } as never),
      ).rejects.toBeInstanceOf(AccessDeniedException);
      expect(t.findOneEntity).not.toHaveBeenCalled();
    });

    it("admin cria em qualquer abrigo", async () => {
      const { svc, execute } = build(teams(teamIn("s-other")));
      await svc.executeAs(admin, { teamId: "t-s-other" } as never);
      expect(execute).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    const build = (schedule: object | null, t = teams()) => {
      const repo = { findById: jest.fn().mockResolvedValue(schedule) };
      const svc = new UpdateShelterScheduleService(
        repo as never,
        t as never,
        {} as never,
      );
      const execute = jest.spyOn(svc, "execute").mockResolvedValue({} as never);
      return { svc, execute, t };
    };

    it("líder atualiza agenda do próprio abrigo", async () => {
      const { svc, execute } = build(scheduleIn("s-own"));
      await svc.executeAs(leader, "sch1", {});
      expect(execute).toHaveBeenCalled();
    });

    it("líder NÃO atualiza agenda de outro abrigo (403)", async () => {
      const { svc, execute } = build(scheduleIn("s-other"));
      await expect(svc.executeAs(leader, "sch1", {})).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
      expect(execute).not.toHaveBeenCalled();
    });

    it("líder NÃO move a agenda para equipe de outro abrigo (403)", async () => {
      const { svc, execute } = build(
        scheduleIn("s-own"),
        teams(teamIn("s-other", "t-dest")),
      );
      await expect(
        svc.executeAs(leader, "sch1", { teamId: "t-dest" }),
      ).rejects.toBeInstanceOf(AccessDeniedException);
      expect(execute).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    const build = (schedule: object | null) => {
      const repo = {
        findById: jest.fn().mockResolvedValue(schedule),
        remove: jest.fn(),
      };
      const svc = new DeleteShelterScheduleService(
        repo as never,
        { findByScheduleId: jest.fn().mockResolvedValue([]) } as never,
        { remove: jest.fn() } as never,
        teams() as never,
      );
      return { svc, repo };
    };

    it("líder NÃO apaga agenda de outro abrigo (403) e nada é removido", async () => {
      const { svc, repo } = build(scheduleIn("s-other"));
      await expect(svc.executeAs(leader, "sch1")).rejects.toBeInstanceOf(
        AccessDeniedException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it("líder apaga a do próprio abrigo", async () => {
      const { svc, repo } = build(scheduleIn("s-own"));
      await svc.executeAs(leader, "sch1");
      expect(repo.remove).toHaveBeenCalledWith("sch1");
    });

    it("se apagar um evento falha, a agenda NÃO é removida", async () => {
      const repo = {
        findById: jest.fn().mockResolvedValue(scheduleIn("s-own")),
        remove: jest.fn(),
      };
      const svc = new DeleteShelterScheduleService(
        repo as never,
        {
          findByScheduleId: jest.fn().mockResolvedValue([{ id: "e1" }]),
        } as never,
        { remove: jest.fn().mockRejectedValue(new Error("bucket")) } as never,
        teams() as never,
      );
      await expect(svc.execute("sch1")).rejects.toThrow("bucket");
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});

describe("agenda de abrigo — leitura (plano 21)", () => {
  const sched = (teamId: string) => ({
    id: "s-" + teamId,
    team: { id: teamId },
  });
  const build = (role: string | undefined, query: object = {}) => {
    const repo = {
      findAll: jest.fn().mockResolvedValue([sched("t1"), sched("t2")]),
      findByLeaderId: jest.fn().mockResolvedValue([sched("t1")]),
      findByMemberId: jest.fn().mockResolvedValue([sched("t1")]),
      findByTeamId: jest.fn().mockResolvedValue([sched("t9")]),
    };
    const auth = {
      tryGetPayload: jest
        .fn()
        .mockResolvedValue(role ? { role, sub: "u1" } : null),
    };
    const svc = new ListShelterSchedulesService(repo as never, auth as never);
    return { svc, repo, req: { query } as never };
  };

  it("membro com ?teamId= de OUTRA equipe não lê nada (antes lia qualquer equipe)", async () => {
    const { svc, repo, req } = build("member", { teamId: "t9" });
    await expect(svc.execute(req)).resolves.toEqual([]);
    expect(repo.findByTeamId).not.toHaveBeenCalled();
  });

  it("anônimo com ?teamId= não lê nada", async () => {
    const { svc, req } = build(undefined, { teamId: "t1" });
    await expect(svc.execute(req)).resolves.toEqual([]);
  });

  it("líder com ?teamId= só estreita o que já enxerga", async () => {
    const { svc, req } = build("leader", { teamId: "t2" });
    await expect(svc.execute(req)).resolves.toEqual([]);
    const ok = build("leader", { teamId: "t1" });
    await expect(ok.svc.execute(ok.req)).resolves.toHaveLength(1);
  });

  it("admin com ?teamId= filtra a lista completa", async () => {
    const { svc, req } = build("admin", { teamId: "t2" });
    await expect(svc.execute(req)).resolves.toEqual([sched("t2")]);
  });
});
