import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CommentListQueryDto } from "./comment-list-query.dto";

const parse = (raw: Record<string, unknown>) => {
  const dto = plainToInstance(CommentListQueryDto, raw);
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { dto, props: errors.map((e) => e.property) };
};

describe("CommentListQueryDto", () => {
  it("published é estrito: true/false viram boolean", () => {
    expect(parse({ published: "false" }).dto.published).toBe(false);
    expect(parse({ published: "true" }).dto.published).toBe(true);
    expect(parse({ published: "false" }).props).toEqual([]);
  });

  it.each([
    [{ published: "talvez" }, "published"],
    [{ sortBy: "published" }, "sortBy"],
    [{ page: "0" }, "page"],
    [{ limit: "101" }, "limit"],
    [{ createdFrom: "99999-01-01" }, "createdFrom"],
    [{ shelter: "x".repeat(101) }, "shelter"],
  ])("recusa %j", (raw, property) => {
    expect(parse(raw).props).toContain(property);
  });

  it("aceita filtros combinados", () => {
    expect(
      parse({
        search: "a",
        shelter: "b",
        published: "true",
        sortBy: "shelter",
        order: "DESC",
        page: "1",
        limit: "12",
        createdTo: "2026-05-05",
      }).props,
    ).toEqual([]);
  });
});
