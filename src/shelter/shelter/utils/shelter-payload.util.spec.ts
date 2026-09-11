import { IsInt, IsString } from "class-validator";
import { RuleException } from "src/common/exceptions";
import { UploadType } from "src/shared/media/media-item/media-item.entity";
import {
  SHELTER_MEDIA_PAYLOAD_FIELD,
  SHELTER_MESSAGES,
  SHELTER_PAYLOAD_FIELD,
} from "../constants";
import {
  parseShelterMediaPayload,
  parseShelterPayload,
  toFilesDict,
} from "./shelter-payload.util";
import { buildUploadedFile } from "../shelter.fixtures";

class SampleDto {
  @IsString()
  name!: string;

  @IsInt()
  teamsQuantity!: number;
}

describe("parseShelterPayload", () => {
  it("parses the JSON carried by the dedicated multipart field", () => {
    const dto = parseShelterPayload(
      {
        [SHELTER_PAYLOAD_FIELD]: JSON.stringify({
          name: "Abrigo",
          teamsQuantity: 2,
        }),
      },
      SampleDto,
    );

    expect(dto).toBeInstanceOf(SampleDto);
    expect(dto).toEqual({ name: "Abrigo", teamsQuantity: 2 });
  });

  it("accepts the field already parsed as an object", () => {
    const dto = parseShelterPayload(
      { [SHELTER_PAYLOAD_FIELD]: { name: "Abrigo", teamsQuantity: 2 } },
      SampleDto,
    );

    expect(dto.name).toBe("Abrigo");
  });

  it("falls back to the body itself when no dedicated field is used", () => {
    const dto = parseShelterPayload(
      { name: "Abrigo", teamsQuantity: 2 },
      SampleDto,
    );

    expect(dto.teamsQuantity).toBe(2);
  });

  it("converts multipart strings to the declared types", () => {
    const dto = parseShelterPayload(
      { name: "Abrigo", teamsQuantity: "3" },
      SampleDto,
    );

    expect(dto.teamsQuantity).toBe(3);
  });

  it("rejects malformed JSON", () => {
    expect(() =>
      parseShelterPayload({ [SHELTER_PAYLOAD_FIELD]: "{ nope" }, SampleDto),
    ).toThrow(new RuleException(SHELTER_MESSAGES.INVALID_PAYLOAD));
  });

  it("rejects JSON that is not an object", () => {
    expect(() =>
      parseShelterPayload({ [SHELTER_PAYLOAD_FIELD]: "42" }, SampleDto),
    ).toThrow(RuleException);
  });

  it("reports the fields that failed validation, with their constraints", () => {
    expect.assertions(4);

    try {
      parseShelterPayload({ teamsQuantity: "não é número" }, SampleDto);
    } catch (error) {
      expect(error).toBeInstanceOf(RuleException);
      expect((error as RuleException).getStatus()).toBe(400);
      const response = (error as RuleException).getResponse() as {
        message: string;
        details: Array<{ field: string; constraints?: Record<string, string> }>;
      };
      expect(response.message).toBe(SHELTER_MESSAGES.INVALID_PAYLOAD);
      expect(
        response.details.map(({ field, constraints }) => ({
          field,
          hasConstraints: Object.keys(constraints ?? {}).length > 0,
        })),
      ).toEqual([
        { field: "name", hasConstraints: true },
        { field: "teamsQuantity", hasConstraints: true },
      ]);
    }
  });

  it("demands content by default", () => {
    expect(() => parseShelterPayload({}, SampleDto)).toThrow(
      new RuleException(SHELTER_MESSAGES.PAYLOAD_REQUIRED),
    );
    expect(() => parseShelterPayload(undefined, SampleDto)).toThrow(
      RuleException,
    );
  });

  it("still validates the empty instance when content is optional", () => {
    expect(() =>
      parseShelterPayload({}, SampleDto, { requireContent: false }),
    ).toThrow(RuleException);
  });
});

describe("parseShelterMediaPayload", () => {
  it("parses the JSON carried by the media field", () => {
    const media = parseShelterMediaPayload({
      [SHELTER_MEDIA_PAYLOAD_FIELD]: JSON.stringify({
        title: "Foto",
        url: "https://cdn/foto.png",
      }),
    });

    expect(media).toEqual({ title: "Foto", url: "https://cdn/foto.png" });
  });

  it("accepts the media field already parsed", () => {
    expect(
      parseShelterMediaPayload({
        [SHELTER_MEDIA_PAYLOAD_FIELD]: { title: "Foto" },
      }),
    ).toEqual({ title: "Foto" });
  });

  it("accepts the fields loose in the body", () => {
    expect(
      parseShelterMediaPayload({
        title: "Foto",
        description: "Principal",
        uploadType: UploadType.LINK,
        url: "https://cdn/foto.png",
        isLocalFile: false,
      }),
    ).toEqual({
      title: "Foto",
      description: "Principal",
      uploadType: UploadType.LINK,
      url: "https://cdn/foto.png",
      isLocalFile: false,
    });
  });

  it("refuses a body with no media at all", () => {
    expect(() => parseShelterMediaPayload({})).toThrow(
      new RuleException(SHELTER_MESSAGES.MEDIA_PAYLOAD_REQUIRED),
    );
    expect(() => parseShelterMediaPayload(undefined)).toThrow(RuleException);
  });
});

describe("toFilesDict", () => {
  it("indexes the uploaded files by multipart field name", () => {
    const cover = buildUploadedFile({ fieldname: "cover" });
    const gallery = buildUploadedFile({ fieldname: "gallery" });

    expect(toFilesDict([cover, gallery])).toEqual({ cover, gallery });
  });

  it("returns an empty dict when nothing was uploaded", () => {
    expect(toFilesDict()).toEqual({});
  });
});
