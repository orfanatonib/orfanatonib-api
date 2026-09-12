import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { IsNull } from "typeorm";

import { IdeasPageEntity } from "../../ideas-page/entities/ideas-page.entity";
import { IdeasSectionEntity } from "../entities/ideas-section.entity";
import { IdeasSectionRepository } from "./ideas-section.repository";
import { buildPage, buildSection } from "../ideas-section.fixtures";

describe("IdeasSectionRepository", () => {
  let repository: IdeasSectionRepository;
  let sections: Record<string, jest.Mock>;
  let pages: Record<string, jest.Mock>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        IdeasSectionRepository,
        {
          provide: getRepositoryToken(IdeasSectionEntity),
          useValue: {
            findOne: jest.fn().mockResolvedValue(buildSection()),
            find: jest.fn().mockResolvedValue([]),
            create: jest.fn((data: unknown) => data),
            save: jest.fn((data: unknown) => data),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
        {
          provide: getRepositoryToken(IdeasPageEntity),
          useValue: { findOne: jest.fn().mockResolvedValue(buildPage()) },
        },
      ],
    }).compile();

    repository = moduleRef.get(IdeasSectionRepository);
    sections = moduleRef.get(getRepositoryToken(IdeasSectionEntity));
    pages = moduleRef.get(getRepositoryToken(IdeasPageEntity));
  });

  it("não expõe a API do TypeORM aos serviços", () => {
    // A classe anterior estendia `Repository`, entregando `find`, `save` e
    // `createQueryBuilder` a quem a injetasse.
    expect(
      (repository as unknown as Record<string, unknown>).createQueryBuilder,
    ).toBeUndefined();
    expect(
      (repository as unknown as Record<string, unknown>).save,
    ).toBeUndefined();
  });

  it("lê a seção com autor e página", async () => {
    await repository.findById("section-id");

    expect(sections.findOne).toHaveBeenCalledWith({
      where: { id: "section-id" },
      relations: ["user", "page"],
    });
  });

  it("lista só as seções sem página, da mais nova para a mais antiga", async () => {
    await repository.findUnattached();

    expect(sections.find).toHaveBeenCalledWith({
      where: { page: IsNull() },
      relations: ["user"],
      order: { createdAt: "DESC" },
    });
  });

  it("cria a seção sem página e com o autor", async () => {
    await repository.createUnattached(
      { title: "t", description: "d", public: true },
      "user-id",
    );

    expect(sections.create).toHaveBeenCalledWith({
      title: "t",
      description: "d",
      public: true,
      page: undefined,
      user: { id: "user-id" },
    });
  });

  it("a atualização usa update com o id, nunca um save sem id", async () => {
    await repository.updateData("section-id", {
      title: "t",
      description: "d",
      public: false,
    });

    expect(sections.update).toHaveBeenCalledWith("section-id", {
      title: "t",
      description: "d",
      public: false,
    });
    expect(sections.save).not.toHaveBeenCalled();
  });

  it("a vinculação salva com o id e a página", async () => {
    const page = buildPage();

    await repository.attachToPage(
      "section-id",
      { title: "t", description: "d", public: false },
      page,
    );

    expect(sections.save).toHaveBeenCalledWith({
      id: "section-id",
      title: "t",
      description: "d",
      public: false,
      page,
    });
  });

  it("busca a página pelo id", async () => {
    await repository.findPageById("page-id");

    expect(pages.findOne).toHaveBeenCalledWith({ where: { id: "page-id" } });
  });

  it("apaga pelo id", async () => {
    await repository.deleteById("section-id");

    expect(sections.delete).toHaveBeenCalledWith({ id: "section-id" });
  });
});
