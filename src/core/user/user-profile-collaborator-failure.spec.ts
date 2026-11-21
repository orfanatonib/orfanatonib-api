/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { Logger } from "@nestjs/common";
import { UserRole } from "src/core/auth/auth.types";
import { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { CreateProfileService } from "src/core/profile/services/profile/create-profile.service";
import { DeleteProfileService } from "src/core/profile/services/profile/delete-profile.service";
import { UpdateProfileService } from "src/core/profile/services/profile/update-profile.service";
import { ProfileWriteRepository } from "src/core/profile/repositories/profile-write.repository";
import { ChangePasswordService } from "./services/change-password.service";
import { CreateUserService } from "./services/create-user.service";
import { DeleteUserService } from "./services/delete-user.service";
import { UpdateOwnProfileService } from "./services/update-own-profile.service";
import { UpdateUserImageService } from "./services/update-user-image.service";
import { UpdateUserService } from "./services/update-user.service";

/**
 * Falha de colaborador sem efeito parcial (matriz do plano 07): quando uma dependência cai no meio do caso de uso,
 * a falha PROPAGA (nada devolvido como sucesso) e o que já tinha sido gravado não fica pela metade.
 */
describe("Falha de colaborador em usuários e perfis", () => {
  const boom = new Error("colaborador fora do ar");
  const USER = {
    id: "u1",
    email: "a@x.com",
    name: "Ana",
    role: UserRole.MEMBER,
  };

  describe("perfil completo (dados pessoais + preferências)", () => {
    const users = () => ({ findById: jest.fn().mockResolvedValue(USER) });
    const writer = (error: Error) => ({
      saveSections: jest.fn().mockRejectedValue(error),
      deleteSections: jest.fn().mockRejectedValue(error),
    });

    it("[user-profile.post.profiles#falha-do-colaborador-sem-efeito-parcial] se a gravação atômica falha, nada é devolvido como sucesso", async () => {
      const w = writer(boom);
      const svc = new CreateProfileService(users() as never, w as never);
      await expect(
        svc.execute("u1", {
          personalData: { gender: "F" },
          preferences: { favoriteColor: "azul" },
        } as never),
      ).rejects.toBe(boom);
      expect(w.saveSections).toHaveBeenCalledTimes(1);
    });

    it("[user-profile.put.profiles-me#falha-do-colaborador-sem-efeito-parcial] atualizar o próprio perfil: falha propaga e a leitura do que já existia não vira resposta", async () => {
      const personal = { findByUserId: jest.fn() };
      const prefs = { findByUserId: jest.fn() };
      const svc = new UpdateProfileService(
        users() as never,
        personal as never,
        prefs as never,
        writer(boom) as never,
      );
      await expect(
        svc.execute("u1", { preferences: { favoriteFood: "pizza" } } as never),
      ).rejects.toBe(boom);
      expect(personal.findByUserId).not.toHaveBeenCalled();
      expect(prefs.findByUserId).not.toHaveBeenCalled();
    });

    it("[user-profile.put.profiles-id#falha-do-colaborador-sem-efeito-parcial] admin atualizando perfil de outro: mesma garantia (nada de sucesso parcial)", async () => {
      const personal = { findByUserId: jest.fn() };
      const prefs = { findByUserId: jest.fn() };
      const svc = new UpdateProfileService(
        users() as never,
        personal as never,
        prefs as never,
        writer(boom) as never,
      );
      await expect(
        svc.execute("outro", { personalData: { gender: "M" } } as never),
      ).rejects.toBe(boom);
    });

    it("[user-profile.delete.profiles-id#falha-do-colaborador-sem-efeito-parcial] apagar perfil: falha propaga e o usuário não é tocado", async () => {
      const w = writer(boom);
      const svc = new DeleteProfileService(users() as never, w as never);
      await expect(svc.execute("u1")).rejects.toBe(boom);
      expect(w.deleteSections).toHaveBeenCalledTimes(1);
    });

    it("a gravação roda numa única transação: a 2ª seção falhar derruba a transação inteira (rollback do TypeORM)", async () => {
      const calls: string[] = [];
      const repoFor = (name: string, failOnSave: boolean) => ({
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((d: object) => d),
        save: jest.fn(async () => {
          calls.push(`${name}:save`);
          if (failOnSave) throw boom;
          return {};
        }),
      });
      const manager = {
        getRepository: jest.fn((entity: { name: string }) =>
          entity.name === "PersonalData"
            ? repoFor("personal", false)
            : repoFor("prefs", true),
        ),
      };
      const dataSource = {
        transaction: jest.fn(
          async (work: (m: typeof manager) => Promise<unknown>) =>
            work(manager),
        ),
      };
      const repo = new ProfileWriteRepository(dataSource as never);
      await expect(
        repo.saveSections("u1", {
          personalData: { gender: "F" },
          preferences: { favoriteColor: "azul" },
        }),
      ).rejects.toBe(boom);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(calls).toEqual(["personal:save", "prefs:save"]);
    });
  });

  describe("usuário", () => {
    it("[user-profile.patch.profile#falha-do-colaborador-sem-efeito-parcial] falha ao gravar o próprio perfil propaga e não devolve o usuário", async () => {
      const repo = {
        findById: jest.fn().mockResolvedValue({ id: "u1", email: "a@x.com" }),
        findByEmail: jest.fn(),
        update: jest.fn().mockRejectedValue(boom),
      };
      const svc = new UpdateOwnProfileService(repo as never);
      await expect(svc.updateOwnProfile("u1", { name: "Novo" })).rejects.toBe(
        boom,
      );
    });

    it("[user-profile.patch.profile-password#falha-do-colaborador-sem-efeito-parcial] falha ao gravar a senha propaga: sem mensagem de sucesso", async () => {
      const repo = {
        findById: jest
          .fn()
          .mockResolvedValue({ id: "u1", commonUser: false, password: "" }),
        update: jest.fn().mockRejectedValue(boom),
      };
      const svc = new ChangePasswordService(repo as never);
      await expect(
        svc.changePassword("u1", { newPassword: "Nova@123" }),
      ).rejects.toBe(boom);
    });

    it("[user-profile.post.users#falha-do-colaborador-sem-efeito-parcial] se o perfil do papel não é criado, o usuário recém-criado é desfeito e a falha propaga", async () => {
      const repo = {
        create: jest.fn(async (u: object) => ({ id: "u9", ...u })),
        delete: jest.fn().mockResolvedValue(undefined),
      };
      const member = { createForUser: jest.fn().mockRejectedValue(boom) };
      const svc = new CreateUserService(
        repo as never,
        member as never,
        { createForUser: jest.fn() } as never,
      );
      await expect(
        svc.create({
          email: "n@x.com",
          password: "Senha@123",
          name: "N",
          phone: "1",
          role: UserRole.MEMBER,
        } as never),
      ).rejects.toBe(boom);
      expect(repo.delete).toHaveBeenCalledWith("u9");
    });

    it("post.users: se até o desfazer falha, a falha ORIGINAL é a que sobe", async () => {
      const repo = {
        create: jest.fn(async (u: object) => ({ id: "u9", ...u })),
        delete: jest.fn().mockRejectedValue(new Error("rollback")),
      };
      const svc = new CreateUserService(
        repo as never,
        { createForUser: jest.fn().mockRejectedValue(boom) } as never,
        { createForUser: jest.fn() } as never,
      );
      await expect(
        svc.create({
          email: "n@x.com",
          password: "Senha@123",
          name: "N",
          phone: "1",
          role: UserRole.MEMBER,
        } as never),
      ).rejects.toBe(boom);
    });

    it("[user-profile.put.users-id#falha-do-colaborador-sem-efeito-parcial] se o perfil do novo papel não é criado, o usuário NÃO é atualizado", async () => {
      const userRepo = {
        findById: jest
          .fn()
          .mockResolvedValue({ id: "u1", role: UserRole.MEMBER, active: true }),
        update: jest.fn(),
      };
      const noop = { removeByUserId: jest.fn().mockResolvedValue(undefined) };
      const svc = new UpdateUserService(
        userRepo as never,
        { createForUser: jest.fn() } as never,
        noop as never,
        { createForUser: jest.fn().mockRejectedValue(boom) } as never,
        noop as never,
        { sendAccountApproved: jest.fn() } as never,
      );
      await expect(svc.update("u1", { role: UserRole.LEADER })).rejects.toBe(
        boom,
      );
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it("[user-profile.delete.users-id#falha-do-colaborador-sem-efeito-parcial] falha ao apagar o usuário: a foto não é tocada e nada vira sucesso; falha ao limpar a foto DEPOIS não desfaz a exclusão e é registrada", async () => {
      const media = {
        findMediaItemByTarget: jest
          .fn()
          .mockResolvedValue({ id: "m1", url: "u" }),
        removeMediaItemsKeepingFiles: jest.fn().mockRejectedValue(boom),
      };
      const build = (deleteUser: jest.Mock) =>
        new DeleteUserService(
          {
            findById: jest.fn().mockResolvedValue({ id: "u1" }),
            delete: deleteUser,
          } as never,
          { removeByUserId: jest.fn().mockResolvedValue(undefined) } as never,
          { removeByUserId: jest.fn().mockResolvedValue(undefined) } as never,
          media as never,
          { deleteAfterCommit: jest.fn() } as never,
        );

      await expect(
        build(jest.fn().mockRejectedValue(boom)).remove("u1"),
      ).rejects.toBe(boom);
      expect(media.removeMediaItemsKeepingFiles).not.toHaveBeenCalled();

      const logged = jest
        .spyOn(Logger.prototype, "error")
        .mockImplementation(() => undefined);
      await expect(
        build(jest.fn().mockResolvedValue(undefined)).remove("u1"),
      ).resolves.toHaveProperty("message");
      expect(logged).toHaveBeenCalled();
      logged.mockRestore();
    });
  });

  describe("foto de perfil", () => {
    const setup = (existing: MediaItemEntity | null) => {
      const processor = new MediaItemProcessor({} as never);
      jest
        .spyOn(processor, "findMediaItemByTarget")
        .mockResolvedValue(existing);
      const upsert = jest
        .spyOn(processor, "upsertMediaItem")
        .mockRejectedValue(boom);
      const batch = { discarded: 0, objects: [{ key: "k", url: "u" }] };
      const storage = {
        newBatch: jest.fn(() => ({
          objects: batch.objects,
          discard: async () => {
            batch.discarded++;
          },
          commit: jest.fn(),
        })),
        uploadAll: jest.fn(async () => undefined),
        deleteAfterCommit: jest.fn(async () => undefined),
      };
      const svc = new UpdateUserImageService(
        { findOne: jest.fn(async () => ({ id: "u1" })) } as never,
        processor,
        storage as never,
      );
      return { svc, storage, upsert, batch };
    };
    const file = {
      fieldname: "file",
      originalname: "a.png",
      mimetype: "image/png",
      size: 4,
      buffer: Buffer.from("x"),
    } as Express.Multer.File;
    const old = Object.assign(new MediaItemEntity(), {
      id: "m1",
      url: "http://s/b/User/u1/old.png",
      isLocalFile: true,
    });

    it("[user-profile.patch.profile-image#falha-do-colaborador-sem-efeito-parcial] falha do banco: o objeto novo é descartado e o antigo continua referenciado e no bucket", async () => {
      const { svc, storage, batch } = setup(old);
      await expect(
        svc.updateUserImage("u1", { title: "t" }, [file]),
      ).rejects.toBe(boom);
      expect(batch.discarded).toBe(1);
      expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
    });

    it("[user-profile.patch.users-id-image#falha-do-colaborador-sem-efeito-parcial] admin trocando a foto de outro usuário: mesma garantia (sem objeto novo, antigo intacto)", async () => {
      const { svc, storage, batch } = setup(old);
      await expect(
        svc.updateUserImage("u2", { title: "t" }, [file]),
      ).rejects.toBe(boom);
      expect(batch.discarded).toBe(1);
      expect(storage.deleteAfterCommit).not.toHaveBeenCalled();
    });
  });
});
