import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { CreateCommentDto } from "./create-comment.dto";
import { UpdateCommentDto } from "./update-comment.dto";

const valid = {
  name: "Maria",
  comment: "Gostei",
  shelter: "Clubinho Sol",
  neighborhood: "Centro",
};

const failing = <TDto extends object>(
  dtoClass: new () => TDto,
  payload: Record<string, unknown>,
): string[] =>
  validateSync(
    plainToInstance(dtoClass, payload, { enableImplicitConversion: true }),
  ).map((error) => error.property);

describe("CreateCommentDto", () => {
  it("aceita o corpo completo", () => {
    expect(failing(CreateCommentDto, valid)).toEqual([]);
  });

  it.each(["name", "comment", "shelter", "neighborhood"])(
    "recusa %s só com espaços (passava em IsNotEmpty)",
    (field) => {
      expect(failing(CreateCommentDto, { ...valid, [field]: "   " })).toContain(
        field,
      );
    },
  );

  it("recusa os limites de tamanho", () => {
    expect(
      failing(CreateCommentDto, {
        name: "n".repeat(101),
        comment: "c".repeat(2001),
        shelter: "s".repeat(101),
        neighborhood: "b".repeat(101),
      }),
    ).toEqual(
      expect.arrayContaining(["name", "comment", "shelter", "neighborhood"]),
    );
  });
});

describe("UpdateCommentDto", () => {
  it("aceita `published` boolean de verdade e o omite", () => {
    expect(failing(UpdateCommentDto, { ...valid, published: true })).toEqual(
      [],
    );
    expect(failing(UpdateCommentDto, { ...valid, published: false })).toEqual(
      [],
    );
    expect(failing(UpdateCommentDto, valid)).toEqual([]);
  });

  it.each(["talvez", "false", "true", 1, 0])(
    "recusa `published` = %p em vez de a conversão implícita transformar em true",
    (published) => {
      expect(failing(UpdateCommentDto, { ...valid, published })).toContain(
        "published",
      );
    },
  );

  it("recusa texto em branco como o create", () => {
    expect(failing(UpdateCommentDto, { ...valid, comment: "  " })).toContain(
      "comment",
    );
  });
});
