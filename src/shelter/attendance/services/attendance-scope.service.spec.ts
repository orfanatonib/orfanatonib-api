import { Test } from "@nestjs/testing";
import {
  AccessDeniedException,
  ResourceNotFoundException,
} from "src/common/exceptions";
import { UserRole } from "src/core/auth/auth.types";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { AttendanceScopeService } from "./attendance-scope.service";
import {
  buildActor,
  buildAdminActor,
  buildMemberActor,
  buildUser,
} from "../attendance.fixtures";

describe("AttendanceScopeService", () => {
  const repository = {
    findUserWithMembership: jest.fn(),
    findLeaderTeamIds: jest.fn(),
    findMemberTeamIds: jest.fn(),
  };

  let service: AttendanceScopeService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AttendanceScopeService,
        { provide: AttendanceRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(AttendanceScopeService);

    repository.findUserWithMembership.mockResolvedValue(
      buildUser({ id: "leader-user-id", role: UserRole.LEADER }),
    );
    repository.findLeaderTeamIds.mockResolvedValue(["team-a"]);
    repository.findMemberTeamIds.mockResolvedValue(["team-b"]);
  });

  describe("resolve", () => {
    it("resolve as equipes do líder em uma passada", async () => {
      const scope = await service.resolve(buildActor());

      expect(scope).toMatchObject({
        isAdmin: false,
        leaderTeamIds: ["team-a"],
        memberTeamIds: ["team-b"],
      });
    });

    it("admin não consulta equipe alguma: enxerga todas", async () => {
      repository.findUserWithMembership.mockResolvedValue(
        buildUser({ id: "admin-user-id", role: UserRole.ADMIN }),
      );

      const scope = await service.resolve(buildAdminActor());

      expect(scope.isAdmin).toBe(true);
      expect(repository.findLeaderTeamIds).not.toHaveBeenCalled();
      expect(repository.findMemberTeamIds).not.toHaveBeenCalled();
    });

    it("recusa um token que aponta para usuário inexistente", async () => {
      repository.findUserWithMembership.mockResolvedValue(null);

      await expect(service.resolve(buildActor())).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it("cai no papel do banco quando o token não traz um conhecido", async () => {
      repository.findUserWithMembership.mockResolvedValue(
        buildUser({ role: UserRole.ADMIN }),
      );

      const scope = await service.resolve(buildActor({ role: null }));

      expect(scope.isAdmin).toBe(true);
    });
  });

  describe("assertLeads", () => {
    it("libera o líder da equipe e o admin", async () => {
      const leader = await service.resolve(buildActor());
      expect(() => service.assertLeads(leader, "team-a")).not.toThrow();

      repository.findUserWithMembership.mockResolvedValue(
        buildUser({ role: UserRole.ADMIN }),
      );
      const admin = await service.resolve(buildAdminActor());
      expect(() => service.assertLeads(admin, "qualquer")).not.toThrow();
    });

    it("recusa quem só é membro da equipe", async () => {
      const scope = await service.resolve(buildActor());

      expect(() => service.assertLeads(scope, "team-b")).toThrow(
        AccessDeniedException,
      );
    });

    it("recusa equipe que o ator não alcança", async () => {
      const scope = await service.resolve(buildActor());

      expect(() => service.assertLeads(scope, "outra")).toThrow(
        AccessDeniedException,
      );
    });
  });

  describe("assertBelongs", () => {
    it("aceita tanto a equipe que lidera quanto a que é membro", async () => {
      const scope = await service.resolve(buildActor());

      expect(() => service.assertBelongs(scope, "team-a")).not.toThrow();
      expect(() => service.assertBelongs(scope, "team-b")).not.toThrow();
    });

    it("recusa equipe de fora", async () => {
      const scope = await service.resolve(buildActor());

      expect(() => service.assertBelongs(scope, "outra")).toThrow(
        AccessDeniedException,
      );
    });
  });

  describe("filtros de equipe", () => {
    it("admin não filtra nada", async () => {
      repository.findUserWithMembership.mockResolvedValue(
        buildUser({ role: UserRole.ADMIN }),
      );
      const scope = await service.resolve(buildAdminActor());

      expect(service.leaderTeamFilter(scope)).toBeUndefined();
      expect(service.allTeamFilter(scope)).toBeUndefined();
    });

    it("líder filtra pelas que lidera", async () => {
      const scope = await service.resolve(buildActor());

      expect(service.leaderTeamFilter(scope)).toEqual(["team-a"]);
    });

    it("o filtro completo junta as duas listas, sem repetir", async () => {
      repository.findLeaderTeamIds.mockResolvedValue(["team-a", "team-b"]);
      repository.findMemberTeamIds.mockResolvedValue(["team-b"]);
      const scope = await service.resolve(buildMemberActor());

      expect(service.allTeamFilter(scope)).toEqual(["team-a", "team-b"]);
    });
  });
});
