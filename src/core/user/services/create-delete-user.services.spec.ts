/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import * as bcrypt from "bcryptjs";

import { UserRole } from "src/core/auth/auth.types";
import { CreateUserService } from "./create-user.service";
import { DeleteUserService } from "./delete-user.service";

describe("CreateUserService", () => {
  const setup = () => {
    const repo = {
      create: jest.fn(async (u: Record<string, unknown>) => ({
        id: "u1",
        ...u,
      })),
    };
    const member = { createForUser: jest.fn() };
    const leader = { createForUser: jest.fn() };
    return {
      repo,
      member,
      leader,
      svc: new CreateUserService(
        repo as never,
        member as never,
        leader as never,
      ),
    };
  };
  const dto = (role: UserRole) =>
    ({
      email: "a@b.com",
      password: "Senha@123",
      name: "Ana",
      phone: "1",
      role,
      active: true,
      completed: true,
      commonUser: true,
    }) as never;

  it("grava o hash (nunca a senha) e cria o perfil conforme o papel", async () => {
    const { repo, member, leader, svc } = setup();
    await svc.create(dto(UserRole.MEMBER));
    const saved = (
      repo.create.mock.calls[0] as unknown as [{ password: string }]
    )[0];
    expect(saved.password).not.toBe("Senha@123");
    expect(await bcrypt.compare("Senha@123", saved.password)).toBe(true);
    expect(member.createForUser).toHaveBeenCalledWith("u1");
    expect(leader.createForUser).not.toHaveBeenCalled();

    await svc.create(dto(UserRole.LEADER));
    expect(leader.createForUser).toHaveBeenCalledWith("u1");
  });

  it("admin não ganha perfil de líder/membro", async () => {
    const { member, leader, svc } = setup();
    await svc.create(dto(UserRole.ADMIN));
    expect(member.createForUser).not.toHaveBeenCalled();
    expect(leader.createForUser).not.toHaveBeenCalled();
  });
});

describe("DeleteUserService", () => {
  const setup = () => {
    const order: string[] = [];
    const repo = {
      delete: jest.fn(async () => {
        order.push("user");
      }),
    };
    const member = {
      removeByUserId: jest.fn(async () => {
        order.push("member");
      }),
    };
    const leader = {
      removeByUserId: jest.fn(async () => {
        order.push("leader");
      }),
    };
    const media = {
      findMediaItemByTarget: jest
        .fn()
        .mockResolvedValue({ id: "m1", isLocalFile: true, url: "u" }),
      removeMediaItem: jest.fn(async () => {
        order.push("image");
      }),
    };
    const s3 = { delete: jest.fn() };
    return {
      order,
      repo,
      media,
      svc: new DeleteUserService(
        repo as never,
        member as never,
        leader as never,
        media as never,
        s3 as never,
      ),
    };
  };

  it("apaga perfis e usuário primeiro; a foto só depois (falha acima não deixa a mídia sem dono)", async () => {
    const { svc, order } = setup();
    await svc.remove("u1");
    expect(order).toEqual(["member", "leader", "user", "image"]);
  });

  it("falha ao apagar o usuário: a foto não é tocada", async () => {
    const { svc, repo, media } = setup();
    repo.delete.mockRejectedValue(new Error("db"));
    await expect(svc.remove("u1")).rejects.toThrow("db");
    expect(media.removeMediaItem).not.toHaveBeenCalled();
  });

  it("sem foto não toca na mídia", async () => {
    const { svc, media } = setup();
    media.findMediaItemByTarget.mockResolvedValue(null);
    await svc.remove("u1");
    expect(media.removeMediaItem).not.toHaveBeenCalled();
  });
});
