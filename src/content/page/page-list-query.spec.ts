import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import { IdeasPageListQueryDto } from "./ideas-page/dto/ideas-page-list-query.dto";
import {
  PageListQueryDto,
  PageSortBy,
  applyPageListFilters,
  applyPageListOrder,
  applyPageWindow,
  sortByIds,
} from "./page-list-query";
import { callsOf, fakeQb } from "./page-list-query.testing";

const errorsOf = async (raw: Record<string, unknown>, cls = PageListQueryDto) =>
  (
    await validate(plainToInstance(cls, raw), {
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  ).map((e) => e.property);

describe("PageListQueryDto", () => {
  it("aceita a combinação completa", async () => {
    expect(
      await errorsOf({
        search: "oi",
        public: "false",
        createdFrom: "2026-01-01",
        createdTo: "2026-01-31",
        sortBy: "title",
        order: "ASC",
        page: "2",
        limit: "100",
      }),
    ).toEqual([]);
  });

  it.each([
    [{ sortBy: "name" }, "sortBy"],
    [{ sortBy: "id" }, "sortBy"],
    [{ page: "0" }, "page"],
    [{ limit: "101" }, "limit"],
    [{ public: "talvez" }, "public"],
    [{ createdFrom: "01/01/2026" }, "createdFrom"],
    [{ order: "UP" }, "order"],
    [{ foo: "x" }, "foo"],
  ])("rejeita %j", async (raw, property) => {
    expect(await errorsOf(raw)).toContain(property);
  });

  it("converte public=true|false em booleano", () => {
    expect(plainToInstance(PageListQueryDto, { public: "true" }).public).toBe(
      true,
    );
    expect(plainToInstance(PageListQueryDto, { public: "false" }).public).toBe(
      false,
    );
  });

  it("ideias é sempre privada: public não é aceito", async () => {
    expect(await errorsOf({ public: "true" }, IdeasPageListQueryDto)).toContain(
      "public",
    );
    expect(
      await errorsOf({ sortBy: "title", page: "1" }, IdeasPageListQueryDto),
    ).toEqual([]);
  });
});

describe("applyPageListFilters", () => {
  const columns = {
    title: "name",
    search: ["name", "description"],
    publicColumn: true,
  };

  it("visitante trava em public = true e public=false dele vira consulta vazia (AND contraditório)", () => {
    const qb = fakeQb([]);
    applyPageListFilters(
      qb as never,
      "page",
      columns,
      { public: false },
      false,
    );
    expect(qb.where).toEqual([
      "page.public = :visiblePublic",
      "page.public = :filterPublic",
    ]);
    expect(qb.params).toMatchObject({
      visiblePublic: true,
      filterPublic: false,
    });
  });

  it("logado sem public não filtra visibilidade", () => {
    const qb = fakeQb([]);
    applyPageListFilters(qb as never, "page", columns, {}, true);
    expect(qb.where).toEqual([]);
  });

  it("busca usa LIKE com ESCAPE e escapa curingas", () => {
    const qb = fakeQb([]);
    applyPageListFilters(
      qb as never,
      "page",
      columns,
      { search: " 50%_\\ " },
      true,
    );
    expect(qb.where[0]).toContain("page.name LIKE :search ESCAPE '\\\\'");
    expect(qb.where[0]).toContain("OR page.description LIKE :search");
    expect(qb.params.search).toBe("%50\\%\\_\\\\%");
  });

  it("período é inclusivo no dia final (dia local)", () => {
    const qb = fakeQb([]);
    applyPageListFilters(
      qb as never,
      "page",
      columns,
      { createdFrom: "2026-03-01", createdTo: "2026-03-02" },
      true,
    );
    expect(qb.params.createdFrom).toEqual(new Date("2026-03-01T00:00:00.000"));
    expect(qb.params.createdTo).toEqual(new Date("2026-03-02T23:59:59.999"));
  });

  it("entidade sem coluna public (ideias) ignora a visibilidade", () => {
    const qb = fakeQb([]);
    applyPageListFilters(
      qb as never,
      "page",
      { title: "title", search: ["title"] },
      {},
      false,
    );
    expect(qb.where).toEqual([]);
  });
});

describe("applyPageListOrder / applyPageWindow", () => {
  it("sem sortBy e sem page: ordem legada id ASC e nenhuma janela", () => {
    const qb = fakeQb([]);
    applyPageWindow(applyPageListOrder(qb as never, "page", "name", {}), {});
    expect(callsOf(qb, "orderBy")).toEqual([["page.id", "ASC"]]);
    expect(callsOf(qb, "offset")).toEqual([]);
  });

  it("com page e sem sortBy: createdAt DESC, id desempata, janela por skip/take", () => {
    const qb = fakeQb([]);
    const query = { page: 3, limit: 5 };
    applyPageWindow(
      applyPageListOrder(qb as never, "page", "name", query),
      query,
    );
    expect(callsOf(qb, "orderBy")).toEqual([["page.createdAt", "DESC"]]);
    expect(callsOf(qb, "addOrderBy")).toEqual([["page.id", "ASC"]]);
    expect(callsOf(qb, "offset")).toEqual([[10]]);
    expect(callsOf(qb, "limit")).toEqual([[5]]);
  });

  it("sortBy=title usa a coluna da entidade e respeita order", () => {
    const qb = fakeQb([]);
    applyPageListOrder(qb as never, "page", "name", {
      sortBy: PageSortBy.TITLE,
      order: SortOrder.ASC,
    });
    expect(callsOf(qb, "orderBy")).toEqual([["page.name", "ASC"]]);
  });

  it("sortBy sem page: ordena mas não pagina", () => {
    const qb = fakeQb([]);
    const query = { sortBy: PageSortBy.CREATED_AT };
    applyPageWindow(
      applyPageListOrder(qb as never, "page", "name", query),
      query,
    );
    expect(callsOf(qb, "orderBy")).toEqual([["page.createdAt", "DESC"]]);
    expect(callsOf(qb, "limit")).toEqual([]);
  });
});

describe("sortByIds", () => {
  it("segue a ordem dos ids e descarta ids ausentes", () => {
    expect(
      sortByIds([{ id: "a" }, { id: "b" }, { id: "c" }], ["c", "x", "a"]).map(
        (i) => i.id,
      ),
    ).toEqual(["c", "a"]);
  });
});
