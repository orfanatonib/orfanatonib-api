import { MediaType } from "src/shared/media/media-item/media-item.entity";
import { toVisitMaterialsPageResponseDto } from "./visit-material-page.mapper";
import { TestamentType } from "../enums/testament-type.enum";
import { VisitMaterialCategory } from "../enums/visit-material-category.enum";
import { VisitMaterialSectionEntity } from "../entities/visit-material-section.entity";
import {
  buildMediaEntity,
  buildPageEntity,
  buildRouteEntity,
  FIXED_CREATED_AT,
  FIXED_UPDATED_AT,
} from "../visit-material-page.fixtures";

describe("toVisitMaterialsPageResponseDto", () => {
  it("maps the page contract", () => {
    const dto = toVisitMaterialsPageResponseDto(buildPageEntity());

    expect(dto).toEqual({
      id: "page-id",
      title: "Materiais da visita",
      subtitle: "Subtítulo",
      description: "Descrição",
      testament: TestamentType.OLD_TESTAMENT,
      currentWeek: false,
      coverImageUrl: "https://example.test/card.png",
      route: {
        id: "route-id",
        path: "materiais_visita_semana-1",
        title: "Materiais da visita",
        subtitle: "Subtítulo",
        description: "Descrição",
        type: "page",
        public: true,
      },
      sections: [],
      videos: [],
      documents: [],
      images: [],
      audios: [],
      createdAt: FIXED_CREATED_AT,
      updatedAt: FIXED_UPDATED_AT,
    });
  });

  it("splits the media items into their four buckets", () => {
    const dto = toVisitMaterialsPageResponseDto(buildPageEntity(), [
      buildMediaEntity({ id: "v1", mediaType: MediaType.VIDEO }),
      buildMediaEntity({ id: "d1", mediaType: MediaType.DOCUMENT }),
      buildMediaEntity({ id: "i1", mediaType: MediaType.IMAGE }),
      buildMediaEntity({ id: "a1", mediaType: MediaType.AUDIO }),
      buildMediaEntity({ id: "v2", mediaType: MediaType.VIDEO }),
    ]);

    expect(dto.videos.map((item) => item.id)).toEqual(["v1", "v2"]);
    expect(dto.documents.map((item) => item.id)).toEqual(["d1"]);
    expect(dto.images.map((item) => item.id)).toEqual(["i1"]);
    expect(dto.audios.map((item) => item.id)).toEqual(["a1"]);
  });

  it("never leaks internal media columns", () => {
    const dto = toVisitMaterialsPageResponseDto(buildPageEntity(), [
      buildMediaEntity(),
    ]);

    expect(dto.videos[0]).not.toHaveProperty("targetId");
    expect(dto.videos[0]).not.toHaveProperty("targetType");
    expect(dto.videos[0]).not.toHaveProperty("createdAt");
  });

  it("falls back to the old testament when the column is empty", () => {
    const page = buildPageEntity();
    Reflect.deleteProperty(page, "testament");

    expect(toVisitMaterialsPageResponseDto(page).testament).toBe(
      TestamentType.OLD_TESTAMENT,
    );
  });

  it("exposes only the public route fields", () => {
    const dto = toVisitMaterialsPageResponseDto(
      buildPageEntity({ route: buildRouteEntity({ current: true }) }),
    );

    expect(dto.route).not.toHaveProperty("current");
    expect(dto.route).not.toHaveProperty("entityId");
    expect(dto.route).not.toHaveProperty("image");
  });

  it("groups each section's media and orders the sections by category", () => {
    const section = (id: string, category: VisitMaterialCategory) =>
      Object.assign(new VisitMaterialSectionEntity(), {
        id,
        pageId: "page-id",
        category,
        title: null,
        description: "Para os maiores",
        position: 0,
      });

    const dto = toVisitMaterialsPageResponseDto(
      buildPageEntity(),
      [],
      [
        {
          section: section("s-teen", VisitMaterialCategory.TEEN),
          media: [
            buildMediaEntity({ id: "d1", mediaType: MediaType.DOCUMENT }),
          ],
        },
        { section: section("s-baby", VisitMaterialCategory.BABY), media: [] },
      ],
    );

    expect(dto.sections.map((item) => item.category)).toEqual([
      VisitMaterialCategory.BABY,
      VisitMaterialCategory.TEEN,
    ]);
    expect(dto.sections[1].documents.map((item) => item.id)).toEqual(["d1"]);
    expect(dto.sections[1].description).toBe("Para os maiores");
    expect(dto.sections[0].title).toBeNull();
  });
});
