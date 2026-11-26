import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MeditationRepository } from "../meditation.repository";
import { GetMeditationService } from "./get-meditation.service";

const entity = (id: string) => ({
  id,
  topic: `Tema ${id}`,
  startDate: "2026-01-05",
  endDate: "2026-01-09",
  days: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

function setup() {
  const repo = { findFiltered: jest.fn() };
  const media = {
    findManyMediaItemsByTargets: jest.fn().mockResolvedValue([]),
  };
  const service = new GetMeditationService(
    repo as unknown as MeditationRepository,
    media as unknown as MediaItemProcessor,
  );
  return { repo, media, service };
}

describe("GetMeditationService.findAll (filtros no servidor)", () => {
  it("sem page devolve o array legado", async () => {
    const { repo, service } = setup();
    repo.findFiltered.mockResolvedValue({ items: [entity("a")], total: 1 });
    const result = await service.findAll({ search: "x" });
    expect(Array.isArray(result)).toBe(true);
    expect(repo.findFiltered).toHaveBeenCalledWith({ search: "x" });
  });

  it("com page devolve data/meta com o total filtrado e busca mídia numa só consulta", async () => {
    const { repo, media, service } = setup();
    repo.findFiltered.mockResolvedValue({
      items: [entity("a"), entity("b")],
      total: 27,
    });
    const result = await service.findAll({ page: 2, limit: 10 });
    expect(Array.isArray(result)).toBe(false);
    if (Array.isArray(result)) throw new Error("esperava envelope paginado");
    expect(result.data).toHaveLength(2);
    expect(result.meta).toMatchObject({
      page: 2,
      limit: 10,
      totalItems: 27,
      totalPages: 3,
      orderBy: "startDate",
    });
    expect(media.findManyMediaItemsByTargets).toHaveBeenCalledTimes(1);
  });

  it("página fora do alcance: data vazia, total preservado, sem consultar mídia", async () => {
    const { repo, media, service } = setup();
    repo.findFiltered.mockResolvedValue({ items: [], total: 3 });
    const result = await service.findAll({ page: 9, limit: 10 });
    if (Array.isArray(result)) throw new Error("esperava envelope paginado");
    expect(result.data).toEqual([]);
    expect(result.meta.totalItems).toBe(3);
    expect(media.findManyMediaItemsByTargets).not.toHaveBeenCalled();
  });
});
