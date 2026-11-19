/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { ConflictException, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { REJECTION_REASON_MAX_LENGTH } from "../constants";
import { RejectImageSectionDto } from "../dto/reject-image-section.dto";
import { ImageSectionReviewStatus } from "../enums/image-section-review-status.enum";
import { RejectImageSectionService } from "./reject-image-section.service";

const sectionRow = (over: object = {}) => ({
  id: "s1",
  caption: "Visita de sábado",
  description: "d",
  public: false,
  reviewStatus: ImageSectionReviewStatus.PENDING,
  rejectionReason: null,
  reviewedAt: null,
  author: { id: "u1", name: "Maria Souza", email: "maria@x.com" },
  ...over,
});

const setup = (row: object | null = sectionRow()) => {
  const current = row ? { ...row } : null;
  const repo = {
    findOne: jest.fn(async () => current),
    save: jest.fn(async (section: object) => section),
  };
  const media = {
    findManyMediaItemsByTargets: jest.fn(async () => []),
  };
  const notifications = {
    sendImageRejectedEmail: jest.fn(async () => undefined),
  };
  const service = new RejectImageSectionService(
    repo as never,
    media as never,
    notifications as never,
  );
  return { service, repo, notifications, current };
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("RejectImageSectionService", () => {
  it("reprova a pendente: grava motivo, revisor e data, e avisa o autor só com o necessário", async () => {
    const { service, repo, notifications } = setup();
    const result = await service.reject("s1", "Há rostos de crianças.", "admin1");
    await flush();
    expect(result.reviewStatus).toBe(ImageSectionReviewStatus.REJECTED);
    expect(result.rejectionReason).toBe("Há rostos de crianças.");
    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0] as unknown as [
      { reviewedBy: { id: string }; reviewedAt: Date },
    ];
    expect(saved[0].reviewedBy).toEqual({ id: "admin1" });
    expect(saved[0].reviewedAt).toBeInstanceOf(Date);
    expect(notifications.sendImageRejectedEmail).toHaveBeenCalledWith(
      {
        userName: "Maria Souza",
        postCaption: "Visita de sábado",
        reason: "Há rostos de crianças.",
      },
      "maria@x.com",
    );
  });

  it("aprovada não pode ser reprovada (409) e nada muda", async () => {
    const { service, repo, notifications } = setup(
      sectionRow({ reviewStatus: ImageSectionReviewStatus.APPROVED }),
    );
    await expect(service.reject("s1", "x", "a")).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repo.save).not.toHaveBeenCalled();
    expect(notifications.sendImageRejectedEmail).not.toHaveBeenCalled();
  });

  it("idempotente: reprovar de novo devolve o estado atual, sem regravar nem reenviar e-mail", async () => {
    const { service, repo, notifications } = setup(
      sectionRow({
        reviewStatus: ImageSectionReviewStatus.REJECTED,
        rejectionReason: "motivo original",
      }),
    );
    const result = await service.reject("s1", "outro motivo", "a");
    await flush();
    expect(result.rejectionReason).toBe("motivo original");
    expect(repo.save).not.toHaveBeenCalled();
    expect(notifications.sendImageRejectedEmail).not.toHaveBeenCalled();
  });

  it("inexistente: 404", async () => {
    const { service } = setup(null);
    await expect(service.reject("x", "m", "a")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("falha do e-mail não desfaz a reprovação nem derruba a chamada", async () => {
    const { service, repo, notifications } = setup();
    notifications.sendImageRejectedEmail.mockRejectedValueOnce(new Error("smtp"));
    const result = await service.reject("s1", "motivo", "a");
    await flush();
    expect(result.reviewStatus).toBe(ImageSectionReviewStatus.REJECTED);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it("autor sem e-mail (conta removida): reprova sem tentar enviar", async () => {
    const { service, notifications } = setup(sectionRow({ author: null }));
    await service.reject("s1", "motivo", "a");
    await flush();
    expect(notifications.sendImageRejectedEmail).not.toHaveBeenCalled();
  });
});

describe("RejectImageSectionDto", () => {
  const check = async (reason: unknown) =>
    validate(plainToInstance(RejectImageSectionDto, { reason }));

  it("exige motivo (400): ausente, vazio ou só espaços", async () => {
    expect((await check(undefined)).length).toBeGreaterThan(0);
    expect((await check("")).length).toBeGreaterThan(0);
    expect((await check("   ")).length).toBeGreaterThan(0);
  });

  it("limita o tamanho e aceita o motivo válido (com trim)", async () => {
    expect(
      (await check("a".repeat(REJECTION_REASON_MAX_LENGTH + 1))).length,
    ).toBeGreaterThan(0);
    expect((await check("a".repeat(REJECTION_REASON_MAX_LENGTH))).length).toBe(0);
    const dto = plainToInstance(RejectImageSectionDto, { reason: "  ok  " });
    expect(dto.reason).toBe("ok");
  });
});
