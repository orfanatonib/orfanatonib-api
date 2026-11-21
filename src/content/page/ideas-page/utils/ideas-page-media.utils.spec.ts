import { BadRequestException } from "@nestjs/common";
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import {
  linkFields,
  normalizeMediaType,
  planMedia,
} from "./ideas-page-media.utils";

const file = { fieldname: "f", originalname: "a.png" } as Express.Multer.File;
const existing = {
  id: "m1",
  url: "https://b/x.png",
  isLocalFile: true,
} as MediaItemEntity;

describe("ideas-page-media.utils", () => {
  it("normalizeMediaType: só vídeo e documento se mantêm", () => {
    expect(normalizeMediaType(MediaType.VIDEO)).toBe(MediaType.VIDEO);
    expect(normalizeMediaType(MediaType.DOCUMENT)).toBe(MediaType.DOCUMENT);
    expect(normalizeMediaType(MediaType.AUDIO)).toBe(MediaType.IMAGE);
    expect(normalizeMediaType(undefined)).toBe(MediaType.IMAGE);
  });

  it("item novo com link", () => {
    const plan = planMedia(
      { uploadType: UploadType.LINK, isLocalFile: false, url: "https://x" },
      undefined,
      {},
    );
    expect(plan.kind).toBe("new-link");
  });

  it("item novo com arquivo; falta fieldKey ou arquivo ⇒ 400", () => {
    const base = {
      uploadType: UploadType.UPLOAD,
      isLocalFile: true,
      title: "t",
    };
    expect(
      planMedia({ ...base, fieldKey: "f" }, undefined, { f: file }).kind,
    ).toBe("new-file");
    expect(() => planMedia(base, undefined, {})).toThrow(BadRequestException);
    expect(() => planMedia({ ...base, fieldKey: "f" }, undefined, {})).toThrow(
      BadRequestException,
    );
  });

  it("item existente: troca de arquivo, mantém arquivo, vira link", () => {
    const upload = {
      id: "m1",
      uploadType: UploadType.UPLOAD,
      isLocalFile: true,
      fieldKey: "f",
    };
    expect(planMedia(upload, existing, { f: file }).kind).toBe("replace-file");
    expect(planMedia(upload, existing, {}).kind).toBe("keep-file");
    expect(
      planMedia(
        { id: "m1", uploadType: UploadType.LINK, isLocalFile: false },
        existing,
        {},
      ).kind,
    ).toBe("link");
  });

  it("linkFields: usa o valor novo, cai no anterior, marca isLocalFile=false", () => {
    const fields = linkFields(
      { url: " https://novo " },
      {
        title: "velho",
        description: "d",
        uploadType: UploadType.LINK,
        platformType: undefined,
        mediaType: MediaType.VIDEO,
        url: "https://velho",
        originalName: undefined,
        size: undefined,
      },
    );
    expect(fields).toMatchObject({
      title: "velho",
      url: "https://novo",
      isLocalFile: false,
    });
  });
});
