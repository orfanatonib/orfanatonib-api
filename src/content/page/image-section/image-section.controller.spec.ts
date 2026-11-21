import { GUARDS_METADATA } from "@nestjs/common/constants";

import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { AdminRoleGuard } from "src/core/auth/guards/role-guard";
import type { AuthenticatedRequest } from "src/core/auth/auth.types";
import { ImageSectionController } from "./image-section.controller";

const guardsOf = (target: object): unknown[] =>
  (Reflect.getMetadata(GUARDS_METADATA, target) as unknown[] | undefined) ?? [];

describe("ImageSectionController (antes sem nenhum guard)", () => {
  it("a classe exige sessão", () => {
    expect(guardsOf(ImageSectionController)).toContain(JwtAuthGuard);
  });

  it.each([
    "getAll",
    "getById",
    "update",
    "delete",
    "reject",
    "pendingCount",
  ] as const)("%s é só de admin", (handler) => {
    expect(
      guardsOf(
        Reflect.get(ImageSectionController.prototype, handler) as object,
      ),
    ).toContain(AdminRoleGuard);
  });

  it("create fica aberto a qualquer sessão (membro propõe), não a admin apenas", () => {
    expect(
      guardsOf(
        Reflect.get(ImageSectionController.prototype, "create") as object,
      ),
    ).not.toContain(AdminRoleGuard);
  });

  it("mine (minhas publicações) fica aberto a qualquer sessão", () => {
    expect(
      guardsOf(Reflect.get(ImageSectionController.prototype, "mine") as object),
    ).not.toContain(AdminRoleGuard);
  });

  it("pendingCount delega ao serviço e devolve { pending }", async () => {
    const getService = {
      pendingCount: jest.fn().mockResolvedValue({ pending: 4 }),
    };
    const controller = new ImageSectionController(
      {} as never,
      {} as never,
      getService as never,
      {} as never,
      {} as never,
    );
    await expect(controller.pendingCount()).resolves.toEqual({ pending: 4 });
  });

  describe("create: publicação direta só para admin", () => {
    const raw = JSON.stringify({
      caption: "c",
      description: "d",
      public: true,
      mediaItems: [],
    });
    const setup = () => {
      const createService = {
        createSection: jest.fn().mockResolvedValue({ id: "s1" }),
      };
      const controller = new ImageSectionController(
        createService as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
      return { createService, controller };
    };
    const reqAs = (role: string) =>
      ({ user: { userId: "u", role } }) as unknown as AuthenticatedRequest;

    it("membro: public é forçado a false", async () => {
      const { controller, createService } = setup();
      await controller.create(reqAs("member"), [], raw);
      const calls = createService.createSection.mock.calls as Array<
        [{ public?: boolean }]
      >;
      expect(calls).toHaveLength(1);
      expect(calls[0][0].public).toBe(false);
    });

    it("admin: public enviado é respeitado", async () => {
      const { controller, createService } = setup();
      await controller.create(reqAs("admin"), [], raw);
      const calls = createService.createSection.mock.calls as Array<
        [{ public?: boolean }]
      >;
      expect(calls).toHaveLength(1);
      expect(calls[0][0].public).toBe(true);
    });
  });

  describe("create: aviso aos admins", () => {
    const raw = JSON.stringify({
      caption: "c",
      description: "d",
      mediaItems: [],
    });
    const run = async (role: string) => {
      const createService = {
        createSection: jest.fn().mockResolvedValue({ id: "s1" }),
      };
      const controller = new ImageSectionController(
        createService as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
      await controller.create(
        { user: { userId: "u", role } } as unknown as AuthenticatedRequest,
        [],
        raw,
      );
      return createService.createSection.mock.calls[0] as unknown[];
    };

    it("membro e líder avisam os admins", async () => {
      for (const role of ["member", "leader"]) {
        expect((await run(role))[3]).toEqual({ notifyAdmins: true });
      }
    });

    it("o próprio admin publicando não avisa", async () => {
      expect((await run("admin"))[3]).toEqual({ notifyAdmins: false });
    });
  });
});
