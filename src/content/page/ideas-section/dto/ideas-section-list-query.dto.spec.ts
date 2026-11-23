import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { IdeasSectionListQueryDto } from "./ideas-section-list-query.dto";

const errorsFor = (raw: Record<string, unknown>) =>
  validateSync(plainToInstance(IdeasSectionListQueryDto, raw), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((e) => e.property);

describe("IdeasSectionListQueryDto", () => {
  it("aceita filtros válidos combinados", () => {
    expect(
      errorsFor({
        search: "x",
        mediaType: "video",
        createdFrom: "2026-01-01",
        createdTo: "2026-02-01",
        sortBy: "title",
        order: "ASC",
        page: "1",
        limit: "12",
      }),
    ).toEqual([]);
  });

  it.each([
    [{ mediaType: "audio" }, "mediaType"],
    [{ sortBy: "caption" }, "sortBy"],
    [{ page: "0" }, "page"],
    [{ limit: "101" }, "limit"],
    [{ createdTo: "ontem" }, "createdTo"],
    [{ public: "true" }, "public"],
  ])("recusa %j", (raw, property) => {
    expect(errorsFor(raw)).toContain(property);
  });
});
