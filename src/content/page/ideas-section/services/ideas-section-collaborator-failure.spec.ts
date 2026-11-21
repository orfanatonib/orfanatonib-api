import { Test, TestingModule } from "@nestjs/testing";
import { RuleException } from "src/common/exceptions";

import { CreateIdeasSectionDto } from "../dto/create-ideas-section.dto";
import {
  buildLinkMediaDto,
  buildPage,
  buildSection,
} from "../ideas-section.fixtures";
import { IdeasSectionRepository } from "../repositories/ideas-section.repository";
import { AttachIdeasSectionService } from "./attach-ideas-section.service";
import { CreateIdeasSectionService } from "./create-ideas-section.service";
import { DeleteIdeasSectionService } from "./delete-ideas-section.service";
import { IdeasSectionMediaService } from "./ideas-section-media.service";
import { UpdateIdeasSectionService } from "./update-ideas-section.service";

const dtoOf = (
  overrides: Partial<CreateIdeasSectionDto> = {},
): CreateIdeasSectionDto =>
  Object.assign(new CreateIdeasSectionDto(), {
    title: "Novo",
    description: "Nova descrição",
    public: true,
    medias: [buildLinkMediaDto()],
    ...overrides,
  });

describe("ideias compartilhadas: falha do colaborador não deixa efeito parcial", () => {
  let moduleRef: TestingModule;
  let repository: Record<string, jest.Mock>;
  let media: Record<string, jest.Mock>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        CreateIdeasSectionService,
        UpdateIdeasSectionService,
        AttachIdeasSectionService,
        DeleteIdeasSectionService,
        {
          provide: IdeasSectionRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue(buildSection()),
            findPageById: jest.fn().mockResolvedValue(buildPage()),
            createUnattached: jest.fn().mockResolvedValue(buildSection()),
            updateData: jest.fn().mockResolvedValue(buildSection()),
            attachToPage: jest.fn().mockResolvedValue(buildSection()),
            restoreUnattached: jest.fn().mockResolvedValue(undefined),
            deleteById: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: IdeasSectionMediaService,
          useValue: {
            assertUploadsResolvable: jest.fn(),
            replaceAll: jest.fn().mockResolvedValue([]),
            removeAll: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    repository = moduleRef.get(IdeasSectionRepository);
    media = moduleRef.get(IdeasSectionMediaService);
  });

  it("[ideas-section.post.ideas-sections#falha-do-colaborador-sem-efeito-parcial] falha da mídia na criação apaga a seção e as mídias já gravadas", async () => {
    media.replaceAll.mockRejectedValue(new Error("S3 fora do ar"));

    await expect(
      moduleRef.get(CreateIdeasSectionService).execute(dtoOf(), {}, "user-id"),
    ).rejects.toThrow("S3 fora do ar");

    expect(media.removeAll).toHaveBeenCalledWith("section-id");
    expect(repository.deleteById).toHaveBeenCalledWith("section-id");
  });

  it("[ideas-section.post.ideas-sections#falha-do-colaborador-sem-efeito-parcial] se a limpeza da mídia também falhar, a seção ainda é apagada e o erro é o original", async () => {
    media.replaceAll.mockRejectedValue(new Error("S3 fora do ar"));
    media.removeAll.mockRejectedValue(new Error("limpeza"));

    await expect(
      moduleRef.get(CreateIdeasSectionService).execute(dtoOf(), {}, "user-id"),
    ).rejects.toThrow("S3 fora do ar");

    expect(repository.deleteById).toHaveBeenCalledWith("section-id");
  });

  it("[ideas-section.patch.ideas-sections-id#falha-do-colaborador-sem-efeito-parcial] falha da mídia na edição restaura título, descrição e visibilidade", async () => {
    media.replaceAll.mockRejectedValue(new Error("S3 fora do ar"));

    await expect(
      moduleRef
        .get(UpdateIdeasSectionService)
        .execute("section-id", dtoOf(), {}),
    ).rejects.toThrow("S3 fora do ar");

    const original = buildSection();
    expect(repository.updateData).toHaveBeenLastCalledWith("section-id", {
      title: original.title,
      description: original.description,
      public: original.public,
    });
  });

  it("[ideas-section.patch.ideas-sections-id#falha-do-colaborador-sem-efeito-parcial] upload declarado sem arquivo é recusado antes de qualquer gravação", async () => {
    media.assertUploadsResolvable.mockImplementation(() => {
      throw new RuleException("faltou arquivo");
    });

    await expect(
      moduleRef
        .get(UpdateIdeasSectionService)
        .execute("section-id", dtoOf(), {}),
    ).rejects.toBeInstanceOf(RuleException);

    expect(repository.updateData).not.toHaveBeenCalled();
    expect(media.replaceAll).not.toHaveBeenCalled();
  });

  it("[ideas-section.patch.ideas-sections-id-attach-pageid#falha-do-colaborador-sem-efeito-parcial] falha da mídia ao vincular devolve a seção à fila com o texto de antes", async () => {
    media.replaceAll.mockRejectedValue(new Error("S3 fora do ar"));

    await expect(
      moduleRef
        .get(AttachIdeasSectionService)
        .execute("section-id", "page-id", dtoOf(), {}),
    ).rejects.toThrow("S3 fora do ar");

    const original = buildSection();
    expect(repository.restoreUnattached).toHaveBeenCalledWith("section-id", {
      title: original.title,
      description: original.description,
      public: original.public,
    });
  });

  it("[ideas-section.patch.ideas-sections-id-attach-pageid#falha-do-colaborador-sem-efeito-parcial] se a restauração também falhar, o erro devolvido é o da mídia", async () => {
    media.replaceAll.mockRejectedValue(new Error("S3 fora do ar"));
    repository.restoreUnattached.mockRejectedValue(new Error("banco"));

    await expect(
      moduleRef
        .get(AttachIdeasSectionService)
        .execute("section-id", "page-id", dtoOf(), {}),
    ).rejects.toThrow("S3 fora do ar");
  });

  it("[ideas-section.patch.ideas-sections-id-attach-pageid#falha-do-colaborador-sem-efeito-parcial] upload declarado sem arquivo é recusado antes de vincular", async () => {
    media.assertUploadsResolvable.mockImplementation(() => {
      throw new RuleException("faltou arquivo");
    });

    await expect(
      moduleRef
        .get(AttachIdeasSectionService)
        .execute("section-id", "page-id", dtoOf(), {}),
    ).rejects.toBeInstanceOf(RuleException);

    expect(repository.attachToPage).not.toHaveBeenCalled();
  });

  it("[ideas-section.delete.ideas-sections-id#falha-do-colaborador-sem-efeito-parcial] falha ao apagar a mídia mantém a seção (nada de linha sem arquivo)", async () => {
    media.removeAll.mockRejectedValue(new Error("S3 fora do ar"));

    await expect(
      moduleRef.get(DeleteIdeasSectionService).execute("section-id"),
    ).rejects.toThrow("S3 fora do ar");

    expect(repository.deleteById).not.toHaveBeenCalled();
  });
});
