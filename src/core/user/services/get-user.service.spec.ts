import { NotFoundException } from "@nestjs/common";

import { GetUsersService } from "./get-user.service";

function build(users: object[] = [], byId: object | null = null) {
  const repo = {
    findAll: jest.fn().mockResolvedValue(users),
    findById: jest.fn().mockResolvedValue(byId),
    findAllAdmins: jest.fn().mockResolvedValue(users),
    findByIdWithProfiles: jest.fn().mockResolvedValue(byId),
  };
  const media = { findMediaItemByTarget: jest.fn().mockResolvedValue(null) };
  return { repo, svc: new GetUsersService(repo as never, media as never) };
}

describe("GetUsersService", () => {
  it("findAllSimple expõe só id, nome e e-mail (sem senha, telefone nem papel)", async () => {
    const { svc } = build([
      {
        id: "1",
        name: "Ana",
        email: "a@x.com",
        password: "$2b$",
        phone: "1",
        role: "admin",
      },
    ]);
    const out = await svc.findAllSimple();
    expect(out).toEqual([{ id: "1", name: "Ana", email: "a@x.com" }]);
  });

  it("findOne: inexistente é 404", async () => {
    const { svc } = build([], null);
    await expect(svc.findOne("x")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("findOne devolve o usuário quando existe", async () => {
    const { svc } = build([], { id: "1" });
    await expect(svc.findOne("1")).resolves.toEqual({ id: "1" });
  });

  it("findByIdOrNull não lança", async () => {
    const { svc } = build([], null);
    await expect(svc.findByIdOrNull("x")).resolves.toBeNull();
  });

  it("findAdminEmails descarta e-mail vazio", async () => {
    const { svc } = build([
      { email: "a@x.com" },
      { email: "" },
      { email: null },
    ]);
    await expect(svc.findAdminEmails()).resolves.toEqual(["a@x.com"]);
  });

  it("findOneForProfile: inexistente é 404", async () => {
    const { svc } = build([], null);
    await expect(svc.findOneForProfile("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
