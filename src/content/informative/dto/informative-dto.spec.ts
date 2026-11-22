import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { CreateInformativeDto } from "./create-informative.dto";
import { UpdateInformativeDto } from "./update-informative.dto";

const valid = { title: "Aviso", description: "Texto", public: true };

const failing = <TDto extends object>(
  dtoClass: new () => TDto,
  payload: Record<string, unknown>,
): string[] =>
  validateSync(
    plainToInstance(dtoClass, payload, { enableImplicitConversion: true }),
  ).map((error) => error.property);

describe("CreateInformativeDto", () => {
  it("aceita o corpo completo", () => {
    expect(failing(CreateInformativeDto, valid)).toEqual([]);
  });

  it.each(["title", "description"])(
    "recusa %s só com espaços (passava em IsNotEmpty)",
    (field) => {
      expect(
        failing(CreateInformativeDto, { ...valid, [field]: "   " }),
      ).toContain(field);
    },
  );

  it("recusa título acima de 255 (o banco recusaria depois de aceito)", () => {
    expect(
      failing(CreateInformativeDto, { ...valid, title: "t".repeat(256) }),
    ).toContain("title");
  });

  it.each(["talvez", "false", "true", 1, 0])(
    "recusa `public` = %p em vez de a conversão implícita transformar em true",
    (value) => {
      expect(
        failing(CreateInformativeDto, { ...valid, public: value }),
      ).toContain("public");
    },
  );
});

describe("UpdateInformativeDto", () => {
  it("aceita edição parcial e corpo vazio", () => {
    expect(failing(UpdateInformativeDto, {})).toEqual([]);
    expect(failing(UpdateInformativeDto, { public: false })).toEqual([]);
  });

  it("recusa o mesmo que o create", () => {
    expect(failing(UpdateInformativeDto, { title: "  " })).toContain("title");
    expect(failing(UpdateInformativeDto, { public: "talvez" })).toContain(
      "public",
    );
  });
});
