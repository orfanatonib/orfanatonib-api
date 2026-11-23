import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { ImageSectionListQueryDto } from "./image-section-list-query.dto";

const errorsFor = (raw: Record<string, unknown>) =>
  validateSync(plainToInstance(ImageSectionListQueryDto, raw), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((e) => e.property);

describe("ImageSectionListQueryDto", () => {
  it("aceita filtros válidos combinados", () => {
    expect(
      errorsFor({
        search: "x",
        reviewStatus: "pending",
        public: "false",
        createdFrom: "2026-01-01",
        createdTo: "2026-02-01",
        sortBy: "caption",
        order: "ASC",
        page: "2",
        limit: "10",
        authorId: "0b3c9f0e-1111-4111-8111-111111111111",
      }),
    ).toEqual([]);
  });

  it.each([
    [{ reviewStatus: "x" }, "reviewStatus"],
    [{ sortBy: "title" }, "sortBy"],
    [{ page: "0" }, "page"],
    [{ limit: "101" }, "limit"],
    [{ public: "talvez" }, "public"],
    [{ authorId: "nao-uuid" }, "authorId"],
    [{ createdFrom: "99999-01-01" }, "createdFrom"],
  ])("recusa %j", (raw, property) => {
    expect(errorsFor(raw)).toContain(property);
  });
});
