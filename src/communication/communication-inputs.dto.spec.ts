import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { CreateCommentDto } from "./comment/dto/create-comment.dto";
import { CreateContactDto } from "./contact/dto/create-contact.dto";
import { CreateSiteFeedbackDto } from "./feedback/dto/create-site-feedback.dto";
import { FeedbackCategory } from "./feedback/entity/feedback-category.enum";

const errorsOf = async <T extends object>(cls: new () => T, payload: object) =>
  (
    await validate(plainToInstance(cls, payload), {
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  ).map((e) => e.property);

describe("POST /contact (público): DTO", () => {
  const ok = {
    name: "Ana",
    email: "ana@x.com",
    phone: "11912345678",
    message: "Olá",
  };

  it("aceita o payload do formulário e apara espaços", async () => {
    expect(await errorsOf(CreateContactDto, ok)).toEqual([]);
    const dto = plainToInstance(CreateContactDto, { ...ok, name: "  Ana  " });
    expect(dto.name).toBe("Ana");
  });

  it("recusa campo fora do contrato (`read`, `id`): sem mass assignment", async () => {
    expect(await errorsOf(CreateContactDto, { ...ok, read: true })).toContain(
      "read",
    );
    expect(await errorsOf(CreateContactDto, { ...ok, id: "x" })).toContain(
      "id",
    );
  });

  it.each([
    ["e-mail inválido", { email: "nao-e-email" }, "email"],
    ["nome vazio", { name: "   " }, "name"],
    ["mensagem gigante", { message: "x".repeat(5001) }, "message"],
    ["telefone sem texto", { phone: "" }, "phone"],
    ["tipo errado", { name: 123 }, "name"],
  ])("%s", async (_n, override, field) => {
    expect(await errorsOf(CreateContactDto, { ...ok, ...override })).toContain(
      field,
    );
  });
});

describe("POST /comments: DTO", () => {
  const ok = {
    name: "Ana",
    comment: "Lindo",
    shelter: "Abrigo",
    neighborhood: "Centro",
  };
  it("aceita e respeita os limites das colunas (varchar 100)", async () => {
    expect(await errorsOf(CreateCommentDto, ok)).toEqual([]);
    expect(
      await errorsOf(CreateCommentDto, { ...ok, name: "x".repeat(101) }),
    ).toContain("name");
    expect(
      await errorsOf(CreateCommentDto, { ...ok, shelter: "x".repeat(101) }),
    ).toContain("shelter");
    expect(
      await errorsOf(CreateCommentDto, { ...ok, comment: "x".repeat(2001) }),
    ).toContain("comment");
    expect(await errorsOf(CreateCommentDto, { ...ok, name: "" })).toContain(
      "name",
    );
  });
});

describe("POST /site-feedbacks: DTO", () => {
  const ok = {
    name: "Ana",
    rating: 5,
    comment: "Ótimo",
    category: Object.values(FeedbackCategory)[0],
  };
  it("aceita com e-mail opcional ausente", async () => {
    expect(await errorsOf(CreateSiteFeedbackDto, ok)).toEqual([]);
    expect(
      await errorsOf(CreateSiteFeedbackDto, { ...ok, email: "a@b.com" }),
    ).toEqual([]);
  });

  it.each([
    ["nota 0", { rating: 0 }, "rating"],
    ["nota 6", { rating: 6 }, "rating"],
    ["e-mail inválido", { email: "xx" }, "email"],
    ["comentário vazio", { comment: "" }, "comment"],
    ["nome maior que a coluna", { name: "x".repeat(101) }, "name"],
  ])("%s", async (_n, override, field) => {
    expect(
      await errorsOf(CreateSiteFeedbackDto, { ...ok, ...override }),
    ).toContain(field);
  });
});
