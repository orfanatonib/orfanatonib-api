import { SiteFeedbackController } from "./site-feedback.controller";

const entity = (id: string) => ({
  id,
  name: `Pessoa ${id}`,
  rating: 4,
  comment: "bom",
  category: "suggestion",
  read: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
});

function setup(total: number) {
  const get = {
    findFiltered: jest
      .fn()
      .mockResolvedValue({ items: [entity("a"), entity("b")], total }),
  };
  const controller = new SiteFeedbackController(
    {} as never,
    get as never,
    {} as never,
    {} as never,
  );
  return { controller, get };
}

describe("GET /site-feedbacks — lista filtrada no servidor", () => {
  it("sem page devolve o array legado", async () => {
    const { controller, get } = setup(2);
    const query = { read: false } as never;
    const result = await controller.findAll(query);
    expect(Array.isArray(result)).toBe(true);
    expect(get.findFiltered).toHaveBeenCalledWith(query);
  });

  it("com page devolve data/meta com o total filtrado e o orderBy", async () => {
    const { controller } = setup(25);
    const result = await controller.findAll({
      page: 3,
      limit: 10,
      sortBy: "rating",
    } as never);
    if (Array.isArray(result)) throw new Error("esperava envelope paginado");
    expect(result.data).toHaveLength(2);
    expect(result.meta).toMatchObject({
      page: 3,
      limit: 10,
      totalItems: 25,
      totalPages: 3,
      orderBy: "rating",
    });
  });
});
