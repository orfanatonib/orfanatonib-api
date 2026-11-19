import { Logger } from "@nestjs/common";

import { ContactController } from "./contact.controller";

beforeEach(() => {
  jest.spyOn(Logger.prototype, "log").mockImplementation();
  jest.spyOn(Logger.prototype, "warn").mockImplementation();
});
afterEach(() => jest.restoreAllMocks());

function setup() {
  const create = {
    execute: jest
      .fn()
      .mockResolvedValue({ id: "c1", createdAt: new Date("2026-01-01") }),
  };
  const controller = new ContactController(
    create as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { controller, create };
}

const body = {
  name: "Ana",
  email: "a@x.com",
  phone: "11999999999",
  message: "oi",
};

describe("POST /contact — isca anti-robô", () => {
  it("isca preenchida: devolve um recibo, NÃO grava e não notifica ninguém", async () => {
    const { controller, create } = setup();
    const receipt = await controller.create({
      ...body,
      website: "http://spam.example",
    });
    expect(create.execute).not.toHaveBeenCalled();
    expect(receipt.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(receipt.createdAt).toBeInstanceOf(Date);
  });

  it("isca vazia ou ausente: fluxo normal", async () => {
    const { controller, create } = setup();
    await controller.create({ ...body });
    await controller.create({ ...body, website: "" });
    expect(create.execute).toHaveBeenCalledTimes(2);
  });

  it("o campo isca nunca chega ao serviço", async () => {
    const { controller, create } = setup();
    await controller.create({ ...body, website: "  " });
    expect(create.execute).toHaveBeenCalledWith({
      name: "Ana",
      email: "a@x.com",
      phone: "11999999999",
      message: "oi",
    });
  });
});
