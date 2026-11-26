import { Test, TestingModule } from "@nestjs/testing";

import {
  buildMediaEntity,
  buildPage,
  buildSection,
} from "../ideas-section.fixtures";
import { IdeasSectionRepository } from "../repositories/ideas-section.repository";
import { AttachIdeasSectionService } from "./attach-ideas-section.service";
import { CreateIdeasSectionService } from "./create-ideas-section.service";
import { GetIdeasSectionService } from "./get-ideas-section.service";
import { IdeasSectionMediaService } from "./ideas-section-media.service";
import { UpdateIdeasSectionService } from "./update-ideas-section.service";

describe("ideias compartilhadas: valores padrão e ramos de borda", () => {
  let moduleRef: TestingModule;
  let repository: Record<string, jest.Mock>;
  let media: Record<string, jest.Mock>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        CreateIdeasSectionService,
        UpdateIdeasSectionService,
        AttachIdeasSectionService,
        GetIdeasSectionService,
        {
          provide: IdeasSectionRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue(buildSection()),
            findUnattached: jest.fn(),
            findUnattachedFiltered: jest.fn(),
            findPageById: jest.fn().mockResolvedValue(buildPage()),
            createUnattached: jest.fn().mockResolvedValue(buildSection()),
            updateData: jest.fn().mockResolvedValue(buildSection()),
            attachToPage: jest.fn().mockResolvedValue(buildSection()),
          },
        },
        {
          provide: IdeasSectionMediaService,
          useValue: {
            assertUploadsResolvable: jest.fn(),
            replaceAll: jest.fn().mockResolvedValue([]),
            findBySections: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();
    repository = moduleRef.get(IdeasSectionRepository);
    media = moduleRef.get(IdeasSectionMediaService);
  });

  const noOptionals = { title: "T", description: "D" } as never;
  const publicDto = { title: "T", description: "D", public: true } as never;

  it("atualizar sem public e sem medias: público vira false e a lista vazia substitui tudo", async () => {
    await moduleRef
      .get(UpdateIdeasSectionService)
      .execute("section-id", noOptionals, {});

    expect(repository.updateData).toHaveBeenCalledWith("section-id", {
      title: "T",
      description: "D",
      public: false,
    });
    expect(media.assertUploadsResolvable).toHaveBeenCalledWith([], {});
    expect(media.replaceAll).toHaveBeenCalledWith("section-id", [], {});
  });

  it("vincular sem public e sem medias usa os mesmos padrões", async () => {
    await moduleRef
      .get(AttachIdeasSectionService)
      .execute("section-id", "page-id", noOptionals, {});

    expect(repository.attachToPage).toHaveBeenCalledWith(
      "section-id",
      { title: "T", description: "D", public: false },
      buildPage(),
    );
    expect(media.replaceAll).toHaveBeenCalledWith("section-id", [], {});
  });

  it("vincular com public true respeita o valor", async () => {
    await moduleRef
      .get(AttachIdeasSectionService)
      .execute("section-id", "page-id", publicDto, {});

    expect(repository.attachToPage).toHaveBeenCalledWith(
      "section-id",
      expect.objectContaining({ public: true }),
      buildPage(),
    );
  });

  it("criar: se a releitura não devolve a seção, a resposta usa a recém-gravada", async () => {
    repository.findById.mockResolvedValue(null);

    const response = await moduleRef
      .get(CreateIdeasSectionService)
      .execute(noOptionals, {}, "user-id");

    expect(response.id).toBe("section-id");
  });

  it("listar: seção sem nenhuma mídia sai com lista vazia", async () => {
    repository.findUnattachedFiltered.mockResolvedValue({
      items: [buildSection({ id: "s1" })],
      total: 1,
    });
    media.findBySections.mockResolvedValue([
      buildMediaEntity({ id: "m9", targetId: "outra" }),
    ]);

    const [only] = (await moduleRef
      .get(GetIdeasSectionService)
      .findUnattached()) as Array<{ medias: unknown[] }>;

    expect(only.medias).toEqual([]);
  });
});
