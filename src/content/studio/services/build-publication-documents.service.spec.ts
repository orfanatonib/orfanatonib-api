import { UnprocessableEntityException } from "@nestjs/common";

import type { PublicationPackageSnapshot } from "../content-publication.types";
import { ContentAudience } from "../enums/content-audience.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";
import { StudioExportFormat } from "../export/studio-export.service";
import { BuildPublicationDocumentsService } from "./build-publication-documents.service";

const STAGES = [
  ContentStageType.LESSON,
  ContentStageType.LESSON_VISUALS,
  ContentStageType.VERSE_VISUALS,
  ContentStageType.VERSE_FIXATION,
  ContentStageType.STANDARD_GAME,
];

const snapshot = (
  overrides: Partial<PublicationPackageSnapshot> = {},
): PublicationPackageSnapshot => ({
  packageId: "pkg-1",
  theme: "Tema",
  biblicalReferences: "Lucas 15",
  canonicalObjective: "Objetivo",
  includeCompleteMaterial: false,
  tracks: [
    {
      audience: ContentAudience.CHILD,
      audienceName: "Crianças",
      minimumAge: 3,
      maximumAge: 11,
      stages: STAGES.map((stageType, index) => ({
        id: `s${index + 1}`,
        stageType,
      })),
    },
  ],
  ...overrides,
});

describe("BuildPublicationDocumentsService", () => {
  const exportStage = jest.fn();
  const exportPackage = jest.fn();
  const service = new BuildPublicationDocumentsService({
    exportStage,
    exportPackage,
  } as never);

  beforeEach(() => {
    exportStage
      .mockReset()
      .mockImplementation((_pkg: string, stageId: string) =>
        Promise.resolve({
          buffer: Buffer.from("%PDF"),
          fileName: `${stageId}.pdf`,
          contentType: "application/pdf",
        }),
      );
    exportPackage.mockReset().mockResolvedValue({
      buffer: Buffer.from("%PDF"),
      fileName: "completo.pdf",
      contentType: "application/pdf",
    });
  });

  it("publica UM PDF por item, na ordem do material, com o nome do item e só PDF (nada de DOCX)", async () => {
    const documents = await service.execute(snapshot());
    expect(documents.map((item) => item.title)).toEqual([
      "Lição",
      "Visuais da lição",
      "Visual do versículo",
      "Fixação divertida do versículo",
      "Brincadeira divertida",
    ]);
    expect(
      documents.every((item) => item.audience === ContentAudience.CHILD),
    ).toBe(true);
    expect(
      documents.every((item) => item.contentType === "application/pdf"),
    ).toBe(true);
    expect(
      (
        exportStage.mock.calls as Array<[string, string, StudioExportFormat]>
      ).map((call) => [call[1], call[2]]),
    ).toEqual(
      STAGES.map((_, index) => [`s${index + 1}`, StudioExportFormat.PDF]),
    );
    expect(exportPackage).not.toHaveBeenCalled();
  });

  it("várias categorias: cada uma leva os seus itens", async () => {
    const base = snapshot();
    const documents = await service.execute(
      snapshot({
        tracks: [
          {
            ...base.tracks[0],
            audience: ContentAudience.BABY,
            audienceName: "Baby",
            stages: [{ id: "b1", stageType: ContentStageType.LESSON }],
          },
          base.tracks[0],
        ],
      }),
    );
    expect(
      documents.filter((item) => item.audience === ContentAudience.BABY),
    ).toHaveLength(1);
    expect(
      documents.filter((item) => item.audience === ContentAudience.CHILD),
    ).toHaveLength(5);
  });

  it("o material completo (só PDF, sem categoria) entra apenas quando a publicação deixa todas as categorias na página", async () => {
    const documents = await service.execute(
      snapshot({ includeCompleteMaterial: true }),
    );
    const full = documents.filter((item) => !item.audience);
    expect(full).toHaveLength(1);
    expect(full[0].title).toBe("Material completo");
    expect(exportPackage).toHaveBeenCalledWith("pkg-1", StudioExportFormat.PDF);
  });

  it("item sem conteúdo para PDF (ex.: visuais sem imagem) é pulado, sem barrar os demais", async () => {
    exportStage.mockImplementation((_pkg: string, stageId: string) =>
      stageId === "s2"
        ? Promise.reject(
            new UnprocessableEntityException("Ainda não há conteúdo"),
          )
        : Promise.resolve({
            buffer: Buffer.from("%PDF"),
            fileName: `${stageId}.pdf`,
            contentType: "application/pdf",
          }),
    );
    const documents = await service.execute(snapshot());
    expect(documents.map((item) => item.title)).not.toContain(
      "Visuais da lição",
    );
    expect(documents).toHaveLength(4);
  });

  it("categoria sem nenhum item com conteúdo falha (não publica página vazia); erro de outro tipo sobe", async () => {
    exportStage.mockRejectedValue(new UnprocessableEntityException("vazio"));
    await expect(service.execute(snapshot())).rejects.toThrow(
      /Nenhum item de Crianças/,
    );
    exportStage.mockRejectedValue(new Error("LibreOffice caiu"));
    await expect(service.execute(snapshot())).rejects.toThrow(
      "LibreOffice caiu",
    );
  });
});
