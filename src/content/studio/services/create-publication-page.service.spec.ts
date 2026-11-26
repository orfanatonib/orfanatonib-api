import { AppendVisitMaterialSectionsDto } from "src/content/page/visit-material-page/dto/append-visit-material-sections.dto";
import { CreateVisitMaterialsPageDto } from "src/content/page/visit-material-page/dto/create-visit-material-page.dto";
import { TestamentType } from "src/content/page/visit-material-page/enums/testament-type.enum";
import { VisitMaterialCategory } from "src/content/page/visit-material-page/enums/visit-material-category.enum";

import type {
  PublicationDocumentFile,
  PublicationPackageSnapshot,
} from "../content-publication.types";
import { ContentAudience } from "../enums/content-audience.enum";
import { CreatePublicationPageService } from "./create-publication-page.service";

const snapshot: PublicationPackageSnapshot = {
  packageId: "11111111-1111-4111-8111-111111111111",
  theme: "Sansão",
  biblicalReferences: "Juízes 13",
  canonicalObjective: "Objetivo",
  tracks: [
    {
      audience: ContentAudience.BABY,
      audienceName: "Baby",
      minimumAge: 0,
      maximumAge: 2,
      stages: [],
    },
    {
      audience: ContentAudience.CHILD,
      audienceName: "Crianças",
      minimumAge: 3,
      maximumAge: 9,
      stages: [],
    },
  ],
  includeCompleteMaterial: true,
};

const doc = (
  title: string,
  audience?: ContentAudience,
): PublicationDocumentFile => ({
  title,
  description: "d",
  fileName: `${title}.pdf`,
  contentType: "application/pdf",
  buffer: Buffer.from("x"),
  audience,
});

describe("CreatePublicationPageService", () => {
  it("puts each track's documents in its category section and the complete material in Geral", async () => {
    let captured: CreateVisitMaterialsPageDto | undefined;
    const createPage = {
      execute: jest.fn((dto: CreateVisitMaterialsPageDto) => {
        captured = dto;
        return Promise.resolve({
          id: "page-1",
          route: { path: "materiais_visita_x" },
        });
      }),
    };
    const service = new CreatePublicationPageService(
      createPage as never,
      { execute: jest.fn() } as never,
    );

    const ref = await service.execute(snapshot, TestamentType.NEW_TESTAMENT, [
      doc("Baby (PDF)", ContentAudience.BABY),
      doc("Baby (DOCX)", ContentAudience.BABY),
      doc("Crianças (PDF)", ContentAudience.CHILD),
      doc("Material completo (PDF)"),
    ]);

    expect(ref).toEqual({
      id: "page-1",
      path: "materiais_visita_x",
      categories: [],
    });
    expect(captured?.testament).toBe(TestamentType.NEW_TESTAMENT);
    expect(captured?.sections?.map((section) => section.category)).toEqual([
      VisitMaterialCategory.BABY,
      VisitMaterialCategory.CHILD,
    ]);
    expect(captured?.sections?.[0].title).toBe("Baby");
    expect(
      captured?.sections?.[0].documents?.map((item) => item.title),
    ).toEqual(["Baby (PDF)", "Baby (DOCX)"]);
    expect(captured?.documents?.map((item) => item.title)).toEqual([
      "Material completo (PDF)",
    ]);
    // cada arquivo tem um fieldKey único em toda a página
    const keys = [
      ...(captured?.documents ?? []),
      ...(captured?.sections ?? []).flatMap(
        (section) => section.documents ?? [],
      ),
    ].map((item) => item.fieldKey);
    expect(new Set(keys).size).toBe(4);
  });

  describe("publicação incremental (append)", () => {
    const append = (executeImpl: jest.Mock) =>
      new CreatePublicationPageService(
        { execute: jest.fn() } as never,
        {
          execute: executeImpl,
        } as never,
      );

    it("acrescenta só a seção da categoria nova, com os documentos dela, sem material completo", async () => {
      let captured: AppendVisitMaterialSectionsDto | undefined;
      let pageId = "";
      const execute = jest.fn(
        (id: string, dto: AppendVisitMaterialSectionsDto) => {
          pageId = id;
          captured = dto;
          return Promise.resolve({
            id,
            route: { path: "materiais_visita_x" },
            sections: [
              { category: VisitMaterialCategory.BABY },
              { category: VisitMaterialCategory.CHILD },
            ],
          });
        },
      );
      const children = {
        ...snapshot,
        tracks: [snapshot.tracks[1]],
        includeCompleteMaterial: false,
      };

      const ref = await append(execute).append("page-1", children, [
        doc("Crianças (PDF)", ContentAudience.CHILD),
        doc("Crianças (DOCX)", ContentAudience.CHILD),
      ]);

      expect(pageId).toBe("page-1");
      expect(captured?.sections?.map((section) => section.category)).toEqual([
        VisitMaterialCategory.CHILD,
      ]);
      expect(
        captured?.sections?.[0].documents?.map((item) => item.title),
      ).toEqual(["Crianças (PDF)", "Crianças (DOCX)"]);
      expect(captured?.documents).toEqual([]);
      expect(ref.categories).toEqual([
        VisitMaterialCategory.BABY,
        VisitMaterialCategory.CHILD,
      ]);
    });

    it("quando esta publicação completa todas as categorias, o material completo vai em 'Geral'", async () => {
      let captured: AppendVisitMaterialSectionsDto | undefined;
      const execute = jest.fn(
        (_id: string, dto: AppendVisitMaterialSectionsDto) => {
          captured = dto;
          return Promise.resolve({ id: "page-1", route: null, sections: [] });
        },
      );
      await append(execute).append("page-1", snapshot, [
        doc("Crianças (PDF)", ContentAudience.CHILD),
        doc("Material completo (PDF)"),
      ]);
      expect(captured?.documents?.map((item) => item.title)).toEqual([
        "Material completo (PDF)",
      ]);
    });
  });
});
