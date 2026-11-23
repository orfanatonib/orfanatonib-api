import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { QuerySiteFeedbackDto } from "./query-site-feedback.dto";

const parse = (payload: Record<string, unknown>) =>
  plainToInstance(QuerySiteFeedbackDto, payload);
const failing = (payload: Record<string, unknown>): string[] =>
  validateSync(parse(payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((error) => error.property);

describe("QuerySiteFeedbackDto", () => {
  it("aceita vazio e todos os filtros válidos", () => {
    expect(failing({})).toEqual([]);
    expect(
      failing({
        search: "ótimo",
        read: "true",
        category: "suggestion",
        rating: "5",
        createdFrom: "2026-01-01",
        createdTo: "2026-12-31",
        sortBy: "rating",
        order: "ASC",
        page: "2",
        limit: "50",
      }),
    ).toEqual([]);
  });

  it("converte read e rating", () => {
    expect(parse({ read: "false" }).read).toBe(false);
    expect(parse({ rating: "3" }).rating).toBe(3);
  });

  it.each([
    [{ read: "talvez" }, "read"],
    [{ category: "spam" }, "category"],
    [{ rating: "0" }, "rating"],
    [{ rating: "6" }, "rating"],
    [{ rating: "2.5" }, "rating"],
    [{ sortBy: "comment" }, "sortBy"],
    [{ createdFrom: "ontem" }, "createdFrom"],
    [{ page: "0" }, "page"],
    [{ limit: "101" }, "limit"],
    [{ public: "true" }, "public"],
  ])("recusa %j", (payload, field) => {
    expect(failing(payload)).toContain(field);
  });
});
