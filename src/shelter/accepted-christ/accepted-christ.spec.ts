import { GUARDS_METADATA } from "@nestjs/common/constants";
import { NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { UserRole } from "src/core/auth/auth.types";
import { AcceptedChristController } from "./controllers/accepted-christ.controller";
import { CreateAcceptedChristDto } from "./dto/create-accepted-christ.dto";
import { CreateAcceptedChristService } from "./services/create-accepted-christ.service";

const UUID = "3f2b8a52-1c3e-4d6f-9a1b-0e5c7d9f1a22";

describe("POST /accepted-christs", () => {
  it("não é público: a classe exige JwtAuthGuard", () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AcceptedChristController,
    ) as unknown[];
    expect(guards).toContain(JwtAuthGuard);
  });

  describe("DTO", () => {
    const check = (payload: object) =>
      validate(plainToInstance(CreateAcceptedChristDto, payload));

    it("aceita payload mínimo e notes nulo", async () => {
      expect(await check({ shelteredId: UUID })).toHaveLength(0);
      expect(await check({ shelteredId: UUID, notes: null })).toHaveLength(0);
    });

    it("recusa shelteredId inválido", async () => {
      expect(await check({ shelteredId: "x" })).not.toHaveLength(0);
    });

    it("recusa notes que não é texto ou passa de 500 caracteres (tamanho da coluna varchar(500))", async () => {
      expect(
        await check({ shelteredId: UUID, notes: { a: 1 } }),
      ).not.toHaveLength(0);
      expect(
        await check({ shelteredId: UUID, notes: "x".repeat(501) }),
      ).not.toHaveLength(0);
      expect(
        await check({ shelteredId: UUID, notes: "x".repeat(500) }),
      ).toHaveLength(0);
    });

    it("recusa decisão fora do enum", async () => {
      expect(
        await check({ shelteredId: UUID, decision: "qualquer" }),
      ).not.toHaveLength(0);
    });
  });

  describe("serviço", () => {
    it("acolhido inexistente: 404 e nada gravado", async () => {
      const repo = {
        findShelteredById: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        save: jest.fn(),
      };
      const svc = new CreateAcceptedChristService(repo as never, {} as never);
      await expect(svc.create({ shelteredId: UUID })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("grava decisão e notas ligadas ao acolhido", async () => {
      const entity = {
        id: "a1",
        decision: null,
        notes: "n",
        sheltered: { id: UUID },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const repo = {
        findShelteredById: jest.fn().mockResolvedValue({ id: UUID }),
        create: jest.fn().mockReturnValue(entity),
        save: jest.fn().mockResolvedValue(entity),
      };
      const svc = new CreateAcceptedChristService(repo as never, {} as never);
      await svc.create({ shelteredId: UUID, notes: "n" });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ notes: "n", decision: null }),
      );
      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe("falha do colaborador", () => {
    it("erro ao gravar propaga e nenhuma resposta é montada", async () => {
      const repo = {
        findShelteredById: jest.fn().mockResolvedValue({ id: UUID }),
        create: jest.fn().mockReturnValue({}),
        save: jest.fn().mockRejectedValue(new Error("db down")),
      };
      const svc = new CreateAcceptedChristService(repo as never, {} as never);
      await expect(svc.create({ shelteredId: UUID })).rejects.toThrow(
        "db down",
      );
    });

    it("decisões repetidas para o mesmo acolhido são permitidas (sem regra de unicidade)", async () => {
      const entity = {
        id: "a",
        decision: null,
        notes: null,
        sheltered: { id: UUID },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const repo = {
        findShelteredById: jest.fn().mockResolvedValue({ id: UUID }),
        create: jest.fn().mockReturnValue(entity),
        save: jest.fn().mockResolvedValue(entity),
      };
      const svc = new CreateAcceptedChristService(repo as never, {} as never);
      await svc.create({ shelteredId: UUID });
      await svc.create({ shelteredId: UUID });
      expect(repo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe("escopo por abrigo (createAs)", () => {
    const entity = {
      id: "a1",
      decision: null,
      notes: null,
      sheltered: { id: UUID },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const build = (access: { assertCanAccessSheltered: jest.Mock }) => {
      const repo = {
        findShelteredById: jest.fn().mockResolvedValue({ id: UUID }),
        create: jest.fn().mockReturnValue(entity),
        save: jest.fn().mockResolvedValue(entity),
      };
      return {
        repo,
        svc: new CreateAcceptedChristService(repo as never, access as never),
      };
    };
    const actor = { userId: "u1", role: UserRole.MEMBER };

    it("fora do escopo: o acesso é negado e NADA é gravado (nem consultado)", async () => {
      const access = {
        assertCanAccessSheltered: jest
          .fn()
          .mockRejectedValue(new NotFoundException("Acolhido não encontrado")),
      };
      const { svc, repo } = build(access);

      await expect(
        svc.createAs(actor, { shelteredId: UUID }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(access.assertCanAccessSheltered).toHaveBeenCalledWith(UUID, actor);
      expect(repo.findShelteredById).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("dentro do escopo: grava a decisão", async () => {
      const access = {
        assertCanAccessSheltered: jest.fn().mockResolvedValue(undefined),
      };
      const { svc, repo } = build(access);

      await svc.createAs(actor, { shelteredId: UUID });

      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });
});
