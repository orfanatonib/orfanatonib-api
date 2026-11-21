import { BadRequestException } from "@nestjs/common";

import { IDEAS_SECTION_UPLOAD_LIMITS } from "../constants";
import {
  IDEAS_UPLOAD_OPTIONS,
  ideasSectionFileFilter,
} from "./ideas-section-upload.util";

const run = (mimetype: string) => {
  const callback = jest.fn();
  ideasSectionFileFilter({}, { mimetype, originalname: "arq" }, callback);
  return callback;
};

describe("upload de ideias", () => {
  it.each(["image/png", "image/jpeg", "video/mp4", "application/pdf"])(
    "aceita %s",
    (mimetype) => {
      expect(run(mimetype)).toHaveBeenCalledWith(null, true);
    },
  );

  it.each([
    "audio/mpeg",
    "text/html",
    "application/x-msdownload",
    "application/octet-stream",
  ])("recusa %s com 400 e code MEDIA_MIME", (mimetype) => {
    const callback = run(mimetype);
    const [error, accepted] = callback.mock.calls[0] as [
      BadRequestException,
      boolean,
    ];
    expect(accepted).toBe(false);
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getResponse()).toMatchObject({
      details: { code: "MEDIA_MIME" },
    });
  });

  it("o teto por arquivo caiu para 100 MB e a requisição aceita no máximo 10 arquivos", () => {
    expect(IDEAS_UPLOAD_OPTIONS.limits.fileSize).toBe(100 * 1024 * 1024);
    expect(IDEAS_UPLOAD_OPTIONS.limits.files).toBe(10);
    expect(IDEAS_SECTION_UPLOAD_LIMITS.MAX_FILE_BYTES).toBeLessThan(
      200 * 1024 * 1024,
    );
    expect(IDEAS_UPLOAD_OPTIONS.fileFilter).toBe(ideasSectionFileFilter);
  });
});
