import {
  IMAGE_GALLERY_UPLOAD_OPTIONS,
  IMAGE_UPLOAD_OPTIONS,
  MEDIA_PAGE_UPLOAD_OPTIONS,
  SINGLE_MEDIA_UPLOAD_OPTIONS,
} from "./upload-limits.constants";

const ALL = {
  IMAGE_UPLOAD_OPTIONS,
  IMAGE_GALLERY_UPLOAD_OPTIONS,
  MEDIA_PAGE_UPLOAD_OPTIONS,
  SINGLE_MEDIA_UPLOAD_OPTIONS,
};

describe("limites de upload", () => {
  it.each(Object.entries(ALL))(
    "%s tem tamanho e quantidade finitos e positivos",
    (_name, options) => {
      expect(Number.isFinite(options.limits.fileSize)).toBe(true);
      expect(options.limits.fileSize).toBeGreaterThan(0);
      expect(Number.isInteger(options.limits.files)).toBe(true);
      expect(options.limits.files).toBeGreaterThan(0);
    },
  );

  it("imagem é bem menor que mídia, e arquivo único aceita exatamente 1", () => {
    expect(IMAGE_UPLOAD_OPTIONS.limits.fileSize).toBeLessThan(
      MEDIA_PAGE_UPLOAD_OPTIONS.limits.fileSize,
    );
    expect(SINGLE_MEDIA_UPLOAD_OPTIONS.limits.files).toBe(1);
  });

  it("nenhum limite passa de 200 MB por arquivo (teto da API)", () => {
    for (const options of Object.values(ALL)) {
      expect(options.limits.fileSize).toBeLessThanOrEqual(200 * 1024 * 1024);
    }
  });
});
