import { NotFoundException } from "@nestjs/common";

import { UserRole } from "src/core/auth/auth.types";

import { CreateProfileService } from "./create-profile.service";
import { DeleteProfileService } from "./delete-profile.service";
import { GetOneProfileService } from "./get-one-profile.service";
import { UpdateProfileService } from "./update-profile.service";

const USER = {
  id: "u1",
  email: "ana@x.com",
  phone: "11999999999",
  name: "Ana",
  role: UserRole.MEMBER,
  password: "$2b$hash",
  refreshToken: "eyJ.token",
};

function build(
  options: {
    user?: object | null;
    personal?: object | null;
    prefs?: object | null;
  } = {},
) {
  const { user = USER, personal = null, prefs = null } = options;
  const users = { findById: jest.fn().mockResolvedValue(user) };
  const personalRepo = {
    findByUserId: jest.fn().mockResolvedValue(personal),
    createForUser: jest.fn((_id: string, d: object) => Promise.resolve(d)),
    updateByUserId: jest.fn((_id: string, d: object) => Promise.resolve(d)),
    deleteByUserId: jest.fn().mockResolvedValue(undefined),
  };
  const prefsRepo = {
    findByUserId: jest.fn().mockResolvedValue(prefs),
    createForUser: jest.fn((_id: string, d: object) => Promise.resolve(d)),
    updateByUserId: jest.fn((_id: string, d: object) => Promise.resolve(d)),
    deleteByUserId: jest.fn().mockResolvedValue(undefined),
  };
  // Fake sequencial do repositório transacional: reaproveita os mocks por tabela para as asserções.
  const writer = {
    saveSections: jest.fn(
      async (
        id: string,
        input: { personalData?: object; preferences?: object },
      ) => {
        const personalData = input.personalData
          ? personal
            ? await personalRepo.updateByUserId(id, input.personalData)
            : await personalRepo.createForUser(id, input.personalData)
          : null;
        const preferences = input.preferences
          ? prefs
            ? await prefsRepo.updateByUserId(id, input.preferences)
            : await prefsRepo.createForUser(id, input.preferences)
          : null;
        return { personalData, preferences };
      },
    ),
    deleteSections: jest.fn(async (id: string) => {
      await personalRepo.deleteByUserId(id);
      await prefsRepo.deleteByUserId(id);
    }),
  };
  return {
    users,
    personalRepo,
    prefsRepo,
    writer,
    create: new CreateProfileService(users as never, writer as never),
    update: new UpdateProfileService(
      users as never,
      personalRepo as never,
      prefsRepo as never,
      writer as never,
    ),
    remove: new DeleteProfileService(users as never, writer as never),
    getOne: new GetOneProfileService(
      users as never,
      personalRepo as never,
      prefsRepo as never,
    ),
  };
}

describe("serviços de perfil completo (create/update/get/delete)", () => {
  it.each(["create", "update", "remove", "getOne"] as const)(
    "%s: usuário inexistente é 404 e nada é gravado",
    async (op) => {
      const ctx = build({ user: null });
      const call = {
        create: () =>
          ctx.create.execute("x", { personalData: { gender: "F" } } as never),
        update: () =>
          ctx.update.execute("x", { personalData: { gender: "F" } } as never),
        remove: () => ctx.remove.execute("x"),
        getOne: () => ctx.getOne.execute("x"),
      }[op];
      await expect(call()).rejects.toBeInstanceOf(NotFoundException);
      expect(ctx.personalRepo.createForUser).not.toHaveBeenCalled();
      expect(ctx.personalRepo.updateByUserId).not.toHaveBeenCalled();
      expect(ctx.personalRepo.deleteByUserId).not.toHaveBeenCalled();
    },
  );

  it("create grava dados pessoais novos e preferências novas; a resposta nunca traz senha nem token", async () => {
    const ctx = build();
    const out = await ctx.create.execute("u1", {
      personalData: { birthDate: "2000-02-29", gender: "F" },
      preferences: { favoriteColor: "azul" },
    } as never);

    expect(ctx.personalRepo.createForUser).toHaveBeenCalled();
    expect(ctx.prefsRepo.createForUser).toHaveBeenCalled();
    expect(out.personalData?.birthDate).toBe("2000-02-29");
    expect(JSON.stringify(out)).not.toContain("$2b$hash");
    expect(JSON.stringify(out)).not.toContain("eyJ.token");
  });

  it("create atualiza (não duplica) quando já existe", async () => {
    const ctx = build({ personal: { id: "p" }, prefs: { id: "f" } });
    await ctx.create.execute("u1", {
      personalData: { gender: "F" },
      preferences: { favoriteColor: "azul" },
    } as never);
    expect(ctx.personalRepo.updateByUserId).toHaveBeenCalled();
    expect(ctx.personalRepo.createForUser).not.toHaveBeenCalled();
    expect(ctx.prefsRepo.updateByUserId).toHaveBeenCalled();
    expect(ctx.prefsRepo.createForUser).not.toHaveBeenCalled();
  });

  it("update sem personalData/preferences só devolve o que já existe (não grava)", async () => {
    const ctx = build({
      personal: { birthDate: new Date("2001-05-10T00:00:00Z"), gender: "M" },
      prefs: { favoriteFood: "pizza" },
    });
    const out = await ctx.update.execute("u1", {} as never);
    expect(ctx.personalRepo.updateByUserId).not.toHaveBeenCalled();
    expect(ctx.prefsRepo.updateByUserId).not.toHaveBeenCalled();
    expect(out.personalData?.gender).toBe("M");
    expect(out.preferences?.favoriteFood).toBe("pizza");
  });

  it("update com dados cria quando não existiam e atualiza quando existiam", async () => {
    const novo = build();
    await novo.update.execute("u1", { personalData: { gender: "F" } } as never);
    expect(novo.personalRepo.createForUser).toHaveBeenCalled();

    const velho = build({ personal: { id: "p" } });
    await velho.update.execute("u1", {
      personalData: { gender: "F" },
    } as never);
    expect(velho.personalRepo.updateByUserId).toHaveBeenCalled();
  });

  it("getOne devolve usuário + dados + preferências, sem segredos, e `undefined` para o que não existe", async () => {
    const ctx = build({
      personal: { gender: "F", birthDate: "2000-01-02T00:00:00.000Z" },
    });
    const out = await ctx.getOne.execute("u1");
    expect(out).toMatchObject({
      id: "u1",
      email: "ana@x.com",
      role: UserRole.MEMBER,
    });
    expect(out.personalData?.birthDate).toBe("2000-01-02");
    expect(out.preferences).toBeUndefined();
    expect(out).not.toHaveProperty("password");
    expect(out).not.toHaveProperty("refreshToken");
  });

  it("remove apaga dados pessoais e preferências (o usuário continua)", async () => {
    const ctx = build();
    await ctx.remove.execute("u1");
    expect(ctx.personalRepo.deleteByUserId).toHaveBeenCalledWith("u1");
    expect(ctx.prefsRepo.deleteByUserId).toHaveBeenCalledWith("u1");
  });
});
