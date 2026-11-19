import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateContentPackageDto } from "./create-content-package.dto";
import { ContentAudience } from "../enums/content-audience.enum";

describe("CreateContentPackageDto audience", () => {
  it.each(Object.values(ContentAudience))("accepts %s", async (audience) => {
    const dto = plainToInstance(CreateContentPackageDto, {
      audience,
      theme: "Esperança",
      biblicalReferences: "Salmos 23",
      canonicalObjective: "Cuidado",
    });
    expect(await validate(dto)).toEqual([]);
  });
  it("rejects an unknown audience", async () => {
    const dto = plainToInstance(CreateContentPackageDto, {
      audience: "UNKNOWN",
      theme: "Esperança",
      biblicalReferences: "Salmos 23",
      canonicalObjective: "Cuidado",
    });
    expect((await validate(dto)).map((error) => error.property)).toContain(
      "audience",
    );
  });
});
