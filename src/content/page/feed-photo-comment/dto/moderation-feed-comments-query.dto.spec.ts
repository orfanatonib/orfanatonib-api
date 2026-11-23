import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { ModerationFeedCommentsQueryDto } from "./moderation-feed-comments-query.dto";

const props = (raw: Record<string, unknown>) =>
  validateSync(plainToInstance(ModerationFeedCommentsQueryDto, raw), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((e) => e.property);

describe("ModerationFeedCommentsQueryDto", () => {
  it("aceita status, busca, datas, ordenação e página", () => {
    expect(
      props({
        status: "pending",
        search: "a",
        createdFrom: "2026-01-01",
        createdTo: "2026-01-31",
        sortBy: "reviewedAt",
        order: "ASC",
        page: "2",
        limit: "10",
      }),
    ).toEqual([]);
  });

  it.each([
    [{ status: "x" }, "status"],
    [{ sortBy: "content" }, "sortBy"],
    [{ order: "UP" }, "order"],
    [{ createdTo: "ontem" }, "createdTo"],
    [{ page: "0" }, "page"],
    [{ limit: "51" }, "limit"],
  ])("recusa %j", (raw, property) => {
    expect(props(raw)).toContain(property);
  });
});
