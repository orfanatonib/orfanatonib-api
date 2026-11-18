import type { ContactEntity } from "../contact.entity";
import { ContactReceiptDto, ContactResponseDto } from "./contact-response.dto";

const entity = {
  id: "c1",
  name: "Maria",
  email: "m@x.test",
  phone: "92999990000",
  message: "Olá",
  read: false,
  createdAt: new Date("2026-11-18"),
  updatedAt: new Date("2026-11-19"),
} as ContactEntity;

describe("ContactReceiptDto", () => {
  it("o recibo público só tem id e createdAt (nada interno, nem eco dos dados enviados)", () => {
    expect(Object.keys(ContactReceiptDto.fromEntity(entity)).sort()).toEqual([
      "createdAt",
      "id",
    ]);
  });
});

describe("ContactResponseDto", () => {
  it("traz os campos da caixa de mensagens do admin, incluindo `read`", () => {
    expect(ContactResponseDto.fromEntity(entity)).toEqual({
      id: "c1",
      name: "Maria",
      email: "m@x.test",
      phone: "92999990000",
      message: "Olá",
      read: false,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  });
});
