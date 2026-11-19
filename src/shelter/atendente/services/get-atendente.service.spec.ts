import { NotFoundException } from "@nestjs/common";

import { MediaTargetType } from "src/shared/media/media-target-type.enum";
import { AttendableType } from "../entities/attendable-type.enum";
import { GetAtendenteService } from "./get-atendente.service";

const pdf = (id: string, targetId: string) => ({
  id,
  targetId,
  title: id,
  description: "",
  url: `https://s3/${id}.pdf`,
  uploadType: "upload",
  mediaType: "document",
  isLocalFile: true,
  platformType: undefined,
  originalName: `${id}.pdf`,
  size: 10,
});

const entity = (overrides: object = {}) => ({
  id: "a1",
  attendableType: AttendableType.USER,
  attendableId: "u1",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

function setup() {
  const repo = {
    findById: jest.fn().mockResolvedValue(entity()),
    findAllPaginated: jest
      .fn()
      .mockResolvedValue({ data: [entity()], total: 1 }),
    findUserById: jest.fn().mockResolvedValue({ id: "u1", name: "Maria" }),
    findIntegrationById: jest
      .fn()
      .mockResolvedValue({ id: "i1", name: "Pedro" }),
    findUsersByIds: jest.fn().mockResolvedValue([{ id: "u1", name: "Maria" }]),
    findIntegrationsByIds: jest
      .fn()
      .mockResolvedValue([{ id: "i1", name: "Pedro" }]),
  };
  const media = {
    findMediaItemByTarget: jest.fn().mockResolvedValue(null),
    findManyMediaItemsByTargets: jest.fn().mockResolvedValue([]),
  };
  return {
    repo,
    media,
    svc: new GetAtendenteService(
      repo as never,
      media as never,
      { withReadableUrl: async (m: unknown) => m } as never,
    ),
  };
}

describe("GetAtendenteService.findOne", () => {
  it("id inexistente: 404 e nenhuma mídia é consultada", async () => {
    const { svc, repo, media } = setup();
    repo.findById.mockResolvedValue(null);

    await expect(svc.findOne("x")).rejects.toBeInstanceOf(NotFoundException);
    expect(media.findMediaItemByTarget).not.toHaveBeenCalled();
  });

  it("junta o PDF estadual, o federal e o nome de quem é atendido", async () => {
    const { svc, media } = setup();
    media.findMediaItemByTarget.mockImplementation(
      (_id: string, type: MediaTargetType) =>
        Promise.resolve(
          type === MediaTargetType.AtendenteEstadual
            ? pdf("estadual", "a1")
            : type === MediaTargetType.AtendenteFederal
              ? pdf("federal", "a1")
              : null,
        ),
    );

    const dto = await svc.findOne("a1");

    expect(dto.pdfEstadual?.id).toBe("estadual");
    expect(dto.pdfFederal?.id).toBe("federal");
    expect(dto.attendableDisplayName).toBe("Maria");
  });

  it("sem PDF estadual usa o campo legado (Atendente) como estadual", async () => {
    const { svc, media } = setup();
    media.findMediaItemByTarget.mockImplementation(
      (_id: string, type: MediaTargetType) =>
        Promise.resolve(
          type === MediaTargetType.Atendente ? pdf("legado", "a1") : null,
        ),
    );

    const dto = await svc.findOne("a1");

    expect(dto.pdfEstadual?.id).toBe("legado");
    expect(dto.pdfFederal).toBeUndefined();
  });

  it("nome vem da integração quando o atendido é uma integração", async () => {
    const { svc, repo } = setup();
    repo.findById.mockResolvedValue(
      entity({
        attendableType: AttendableType.INTEGRATION,
        attendableId: "i1",
      }),
    );

    const dto = await svc.findOne("a1");

    expect(dto.attendableDisplayName).toBe("Pedro");
    expect(repo.findUserById).not.toHaveBeenCalled();
  });

  it("sem atendido vinculado não consulta nome algum", async () => {
    const { svc, repo } = setup();
    repo.findById.mockResolvedValue(
      entity({ attendableType: null, attendableId: null }),
    );

    const dto = await svc.findOne("a1");

    expect(dto.attendableDisplayName).toBeUndefined();
    expect(repo.findUserById).not.toHaveBeenCalled();
    expect(repo.findIntegrationById).not.toHaveBeenCalled();
  });
});

describe("GetAtendenteService.findAllPaginated", () => {
  it.each([
    [{ page: 0, limit: 0 }, 1, 10],
    [{ page: -5, limit: 1000 }, 1, 100],
    [{ page: "3", limit: "20" }, 3, 20],
    [{}, 1, 10],
  ])("normaliza %j para página %i e limite %i", async (query, page, limit) => {
    const { svc, repo } = setup();

    const result = await svc.findAllPaginated(query as never);

    expect(repo.findAllPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ page, limit }),
    );
    expect(result).toMatchObject({ page, limit, total: 1 });
  });

  it("resolve os nomes em lote (uma consulta por tipo) e as mídias por alvo", async () => {
    const { svc, repo, media } = setup();
    repo.findAllPaginated.mockResolvedValue({
      data: [
        entity({
          id: "a1",
          attendableType: AttendableType.USER,
          attendableId: "u1",
        }),
        entity({
          id: "a2",
          attendableType: AttendableType.INTEGRATION,
          attendableId: "i1",
        }),
      ],
      total: 2,
    });
    media.findManyMediaItemsByTargets.mockImplementation(
      (_ids: string[], type: MediaTargetType) =>
        Promise.resolve(
          type === MediaTargetType.AtendenteFederal
            ? [pdf("fed-a2", "a2")]
            : [],
        ),
    );

    const result = await svc.findAllPaginated({});
    const [a1, a2] = result.data;

    expect(repo.findUsersByIds).toHaveBeenCalledTimes(1);
    expect(repo.findIntegrationsByIds).toHaveBeenCalledTimes(1);
    expect(a1.attendableDisplayName).toBe("Maria");
    expect(a2.attendableDisplayName).toBe("Pedro");
    expect(a2.pdfFederal?.id).toBe("fed-a2");
    expect(a1.pdfFederal).toBeUndefined();
  });

  it("lista vazia: nenhuma consulta de mídia nem de nomes", async () => {
    const { svc, repo, media } = setup();
    repo.findAllPaginated.mockResolvedValue({ data: [], total: 0 });

    const result = await svc.findAllPaginated({});

    expect(result.data).toEqual([]);
    expect(media.findManyMediaItemsByTargets).not.toHaveBeenCalled();
    expect(repo.findUsersByIds).not.toHaveBeenCalled();
  });
});
