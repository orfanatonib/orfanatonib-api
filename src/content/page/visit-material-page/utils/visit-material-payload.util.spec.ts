import { HttpStatus } from "@nestjs/common";
import { RuleException } from "src/common/exceptions";
import { UploadType } from "src/shared/media/media-item/media-item.entity";
import {
  parseVisitMaterialPayload,
  toFilesDict,
  toMediaBuckets,
} from "./visit-material-payload.util";
import { CreateVisitMaterialsPageDto } from "../dto/create-visit-material-page.dto";
import { TestamentType } from "../enums/testament-type.enum";
import {
  buildLinkMediaDto,
  buildMulterFile,
} from "../visit-material-page.fixtures";

const validPayload = {
  pageTitle: "Materiais da visita",
  pageSubtitle: "Subtítulo",
  pageDescription: "Descrição",
};

describe("parseVisitMaterialPayload", () => {
  it("parses and validates the multipart JSON field", () => {
    const dto = parseVisitMaterialPayload(
      JSON.stringify({
        ...validPayload,
        testament: TestamentType.NEW_TESTAMENT,
      }),
      CreateVisitMaterialsPageDto,
    );

    expect(dto).toBeInstanceOf(CreateVisitMaterialsPageDto);
    expect(dto.pageTitle).toBe("Materiais da visita");
    expect(dto.testament).toBe(TestamentType.NEW_TESTAMENT);
  });

  it("rejects a missing payload with a 400", () => {
    const error = (() => {
      try {
        parseVisitMaterialPayload(undefined, CreateVisitMaterialsPageDto);
      } catch (thrown) {
        return thrown as RuleException;
      }
      return null;
    })();

    expect(error).toBeInstanceOf(RuleException);
    expect(error?.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it("rejects malformed JSON instead of leaking a parser error", () => {
    expect(() =>
      parseVisitMaterialPayload("{ not json", CreateVisitMaterialsPageDto),
    ).toThrow(RuleException);
  });

  it("rejects a payload that fails validation and reports the fields", () => {
    const error = (() => {
      try {
        parseVisitMaterialPayload(
          JSON.stringify({}),
          CreateVisitMaterialsPageDto,
        );
      } catch (thrown) {
        return thrown as RuleException;
      }
      return null;
    })();

    expect(error).toBeInstanceOf(RuleException);
    const details = error?.getResponse() as {
      details?: Array<{ field: string }>;
    };
    expect(details.details?.map((item) => item.field)).toEqual(
      expect.arrayContaining(["pageTitle", "pageSubtitle", "pageDescription"]),
    );
  });

  it("coerces primitives the same way the global ValidationPipe does", () => {
    const dto = parseVisitMaterialPayload(
      JSON.stringify({ ...validPayload, pageTitle: 42 }),
      CreateVisitMaterialsPageDto,
    );

    expect(dto.pageTitle).toBe("42");
  });

  it("rejects a field outside the contract", () => {
    expect(() =>
      parseVisitMaterialPayload(
        JSON.stringify({ ...validPayload, unexpected: true }),
        CreateVisitMaterialsPageDto,
      ),
    ).toThrow(RuleException);
  });

  it("validates the nested media items", () => {
    expect(() =>
      parseVisitMaterialPayload(
        JSON.stringify({
          ...validPayload,
          videos: [{ uploadType: "invalid" }],
        }),
        CreateVisitMaterialsPageDto,
      ),
    ).toThrow(RuleException);

    const dto = parseVisitMaterialPayload(
      JSON.stringify({
        ...validPayload,
        videos: [{ ...buildLinkMediaDto(), uploadType: UploadType.LINK }],
      }),
      CreateVisitMaterialsPageDto,
    );
    expect(dto.videos).toHaveLength(1);
  });
});

describe("toFilesDict", () => {
  it("indexes the uploaded files by field name", () => {
    const file = buildMulterFile({ fieldname: "file-1" });

    expect(toFilesDict([file])).toEqual({ "file-1": file });
  });

  it("returns an empty dict when nothing was uploaded", () => {
    expect(toFilesDict()).toEqual({});
    expect(toFilesDict([])).toEqual({});
  });
});

describe("toMediaBuckets", () => {
  it("normalizes the absent buckets to empty arrays", () => {
    expect(toMediaBuckets({})).toEqual({
      videos: [],
      documents: [],
      images: [],
      audios: [],
    });
  });

  it("keeps the buckets that were supplied", () => {
    const video = buildLinkMediaDto();

    expect(toMediaBuckets({ videos: [video] })).toMatchObject({
      videos: [video],
      documents: [],
    });
  });
});
