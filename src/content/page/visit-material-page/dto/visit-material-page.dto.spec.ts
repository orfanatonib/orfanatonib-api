import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import {
  UploadType,
  MediaType,
} from "src/shared/media/media-item/media-item.entity";
import { CreateVisitMaterialsPageDto } from "./create-visit-material-page.dto";
import { UpdateVisitMaterialsPageDto } from "./update-visit-material-page.dto";
import { QueryVisitMaterialsPageDto } from "./query-visit-material-pages.dto";
import { TestamentType } from "../enums/testament-type.enum";

const transform = <TDto extends object>(
  dtoClass: new () => TDto,
  payload: Record<string, unknown>,
): TDto =>
  plainToInstance(dtoClass, payload, { enableImplicitConversion: true });

const failingProperties = <TDto extends object>(
  dtoClass: new () => TDto,
  payload: Record<string, unknown>,
): string[] =>
  validateSync(transform(dtoClass, payload)).map((error) => error.property);

const validCreate = {
  pageTitle: "Materiais da visita",
  pageSubtitle: "Subtítulo",
  pageDescription: "Descrição",
};

const VALID_PAGE_ID = "6f1c3c62-0f6a-4f4b-9a3f-0b5f7f2a1d11";

const validMedia = {
  uploadType: UploadType.LINK,
  mediaType: MediaType.VIDEO,
  isLocalFile: false,
};

describe("CreateVisitMaterialsPageDto", () => {
  it("accepts the minimum payload", () => {
    expect(
      validateSync(transform(CreateVisitMaterialsPageDto, validCreate)),
    ).toHaveLength(0);
  });

  it("requires title, subtitle and description", () => {
    expect(failingProperties(CreateVisitMaterialsPageDto, {})).toEqual(
      expect.arrayContaining(["pageTitle", "pageSubtitle", "pageDescription"]),
    );
  });

  it("rejects blank required text", () => {
    expect(
      failingProperties(CreateVisitMaterialsPageDto, {
        pageTitle: "   ",
        pageSubtitle: "   ",
        pageDescription: "   ",
      }),
    ).toEqual(
      expect.arrayContaining(["pageTitle", "pageSubtitle", "pageDescription"]),
    );
  });

  it("rejects a testament outside the domain enum", () => {
    expect(
      failingProperties(CreateVisitMaterialsPageDto, {
        ...validCreate,
        testament: "GOSPEL",
      }),
    ).toContain("testament");
  });

  it("accepts the four media buckets", () => {
    const dto = transform(CreateVisitMaterialsPageDto, {
      ...validCreate,
      videos: [validMedia],
      documents: [validMedia],
      images: [validMedia],
      audios: [validMedia],
    });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.videos).toHaveLength(1);
  });

  it("validates each item inside a bucket", () => {
    expect(
      failingProperties(CreateVisitMaterialsPageDto, {
        ...validCreate,
        videos: [{ uploadType: "nope" }],
      }),
    ).toContain("videos");
  });

  it("rejects a bucket that is not an array", () => {
    expect(
      failingProperties(CreateVisitMaterialsPageDto, {
        ...validCreate,
        images: "nope",
      }),
    ).toContain("images");
  });
});

describe("UpdateVisitMaterialsPageDto", () => {
  const validUpdate = { ...validCreate, id: VALID_PAGE_ID, currentWeek: true };

  it("accepts a complete payload", () => {
    expect(
      validateSync(transform(UpdateVisitMaterialsPageDto, validUpdate)),
    ).toHaveLength(0);
  });

  it("requires the id and the currentWeek flag", () => {
    expect(failingProperties(UpdateVisitMaterialsPageDto, validCreate)).toEqual(
      expect.arrayContaining(["id", "currentWeek"]),
    );
  });

  it("requires a UUID in the payload id", () => {
    expect(
      failingProperties(UpdateVisitMaterialsPageDto, {
        ...validUpdate,
        id: "page-id",
      }),
    ).toContain("id");
  });

  it("coerces currentWeek the same way the global ValidationPipe does", () => {
    // `enableImplicitConversion` turns the value into a boolean before
    // validation, so the flag is never rejected for its type — the contract is
    // documented here so the behaviour is not mistaken for a missing check.
    const dto = transform(UpdateVisitMaterialsPageDto, {
      ...validUpdate,
      currentWeek: "false",
    });

    expect(validateSync(dto)).toHaveLength(0);
    expect(typeof dto.currentWeek).toBe("boolean");
  });

  it("shares the media buckets with the create payload", () => {
    const dto = transform(UpdateVisitMaterialsPageDto, {
      ...validUpdate,
      audios: [validMedia],
    });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.audios).toHaveLength(1);
  });
});

describe("QueryVisitMaterialsPageDto", () => {
  it("accepts an empty query", () => {
    expect(
      validateSync(transform(QueryVisitMaterialsPageDto, {})),
    ).toHaveLength(0);
  });

  it("accepts the documented filters", () => {
    const dto = transform(QueryVisitMaterialsPageDto, {
      testament: TestamentType.NEW_TESTAMENT,
      searchString: "visita",
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it("rejects a testament outside the enum", () => {
    expect(
      failingProperties(QueryVisitMaterialsPageDto, { testament: "GOSPEL" }),
    ).toContain("testament");
  });
});
