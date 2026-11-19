import { Test } from "@nestjs/testing";
import { RuleException, UnauthenticatedException } from "src/common/exceptions";
import { AuthenticatedRequest } from "src/core/auth/auth.types";

import { IdeasSectionController } from "./ideas-section.controller";
import { AttachIdeasSectionService } from "./services/attach-ideas-section.service";
import { CreateIdeasSectionService } from "./services/create-ideas-section.service";
import { DeleteIdeasSectionService } from "./services/delete-ideas-section.service";
import { GetIdeasSectionService } from "./services/get-ideas-section.service";
import { UpdateIdeasSectionService } from "./services/update-ideas-section.service";
import { buildFile } from "./ideas-section.fixtures";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";

const payload = JSON.stringify({
  title: "Ideia",
  description: "Descrição",
  medias: [],
});

const requestOf = (userId?: string): AuthenticatedRequest =>
  ({ user: userId ? { userId } : undefined }) as AuthenticatedRequest;

describe("IdeasSectionController", () => {
  let controller: IdeasSectionController;
  let createService: Record<string, jest.Mock>;
  let updateService: Record<string, jest.Mock>;
  let attachService: Record<string, jest.Mock>;
  let getService: Record<string, jest.Mock>;
  let deleteService: Record<string, jest.Mock>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [IdeasSectionController],
      providers: [
        {
          provide: CreateIdeasSectionService,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateIdeasSectionService,
          useValue: { execute: jest.fn() },
        },
        {
          provide: AttachIdeasSectionService,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetIdeasSectionService,
          useValue: { findOne: jest.fn(), findUnattached: jest.fn() },
        },
        {
          provide: DeleteIdeasSectionService,
          useValue: { execute: jest.fn() },
        },
      ],
    })
      .overrideGuard(FeatureFlagGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(IdeasSectionController);
    createService = moduleRef.get(CreateIdeasSectionService);
    updateService = moduleRef.get(UpdateIdeasSectionService);
    attachService = moduleRef.get(AttachIdeasSectionService);
    getService = moduleRef.get(GetIdeasSectionService);
    deleteService = moduleRef.get(DeleteIdeasSectionService);
  });

  describe("create", () => {
    it("usa o userId que a JwtStrategy publica", async () => {
      await controller.create(requestOf("user-id"), [], payload);

      expect(createService.execute).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Ideia" }),
        {},
        "user-id",
      );
    });

    it("401 quando a requisição chega sem usuário", async () => {
      await expect(
        controller.create(requestOf(), [], payload),
      ).rejects.toBeInstanceOf(UnauthenticatedException);
    });

    it("indexa os arquivos pelo nome do campo", async () => {
      await controller.create(
        requestOf("user-id"),
        [buildFile({ fieldname: "image_upload" })],
        payload,
      );

      const [, files] = createService.execute.mock.calls[0] as [
        unknown,
        Record<string, unknown>,
      ];
      expect(Object.keys(files)).toEqual(["image_upload"]);
    });

    it("400, e não 500, quando o payload está quebrado", async () => {
      await expect(
        controller.create(requestOf("user-id"), [], "{"),
      ).rejects.toBeInstanceOf(RuleException);
      expect(createService.execute).not.toHaveBeenCalled();
    });
  });

  it("update repassa id, dto e arquivos", async () => {
    await controller.update("section-id", [], payload);

    expect(updateService.execute).toHaveBeenCalledWith(
      "section-id",
      expect.objectContaining({ title: "Ideia" }),
      {},
    );
  });

  it("attach repassa também a página", async () => {
    await controller.attach("section-id", "page-id", [], payload);

    expect(attachService.execute).toHaveBeenCalledWith(
      "section-id",
      "page-id",
      expect.objectContaining({ title: "Ideia" }),
      {},
    );
  });

  it("remove devolve a mensagem que a tela exibe", async () => {
    expect(await controller.remove("section-id")).toEqual({
      message: "Seção de ideias removida com sucesso.",
    });
    expect(deleteService.execute).toHaveBeenCalledWith("section-id");
  });

  it("a listagem delega ao serviço de leitura", async () => {
    getService.findUnattached.mockResolvedValue([]);

    expect(await controller.findUnattached()).toEqual([]);
  });

  it("findOne delega ao serviço de leitura", async () => {
    await controller.findOne("section-id");

    expect(getService.findOne).toHaveBeenCalledWith("section-id");
  });
});
