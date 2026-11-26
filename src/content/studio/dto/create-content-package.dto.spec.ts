import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateContentPackageDto } from "./create-content-package.dto";

describe("CreateContentPackageDto", () => {
  it("não pergunta o público: tema, referências e objetivo bastam", async () => {
    const dto = plainToInstance(CreateContentPackageDto, {
      theme: "Esperança",
      biblicalReferences: "Salmos 23",
      canonicalObjective: "Cuidado",
    });
    expect(await validate(dto)).toEqual([]);
  });

  it("recusa tema vazio", async () => {
    const dto = plainToInstance(CreateContentPackageDto, {
      theme: "",
      biblicalReferences: "Salmos 23",
      canonicalObjective: "Cuidado",
    });
    expect((await validate(dto)).map((error) => error.property)).toContain(
      "theme",
    );
  });
});
