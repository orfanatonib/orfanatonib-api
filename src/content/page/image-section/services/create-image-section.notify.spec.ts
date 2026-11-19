/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { BadRequestException } from "@nestjs/common";
import {
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import { CreateImageSectionService } from "./create-image-section.service";

const png = (key: string) =>
  ({
    fieldname: key,
    originalname: `${key}.png`,
    mimetype: "image/png",
    size: 8,
    buffer: Buffer.alloc(8),
  }) as Express.Multer.File;
const item = (key: string, mediaType = MediaType.IMAGE) => ({
  mediaType,
  uploadType: UploadType.UPLOAD,
  isLocalFile: true,
  fieldKey: key,
  originalName: `${key}.png`,
});

const setup = () => {
  const runner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn((_e: unknown, data: object) => data),
      save: jest.fn(async (data: object) => ({ id: "s1", ...data })),
    },
  };
  const processor = {
    processMediaItemsPolymorphic: jest.fn(async () => [
      { mediaType: MediaType.IMAGE },
      { mediaType: MediaType.IMAGE },
      { mediaType: MediaType.VIDEO },
    ]),
  };
  const notifications = {
    sendPhotoUploadedNotification: jest.fn(async () => undefined),
  };
  const users = {
    findAdminEmails: jest.fn(async () => ["adm@x.com", "adm2@x.com"]),
  };
  const repo = {
    findOne: jest.fn(async () => ({
      id: "s1",
      caption: "Visita",
      author: { name: "Maria Souza Lima", email: "maria@x.com" },
    })),
  };
  const service = new CreateImageSectionService(
    { createQueryRunner: () => runner } as never,
    { upload: jest.fn(), delete: jest.fn() } as never,
    processor as never,
    repo as never,
    notifications as never,
    users as never,
  );
  return { service, runner, notifications, users };
};

const dto = {
  caption: "Visita",
  description: "d",
  public: false,
  mediaItems: [item("a"), item("b")],
};
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("CreateImageSectionService — aviso aos admins", () => {
  it("avisa todos os admins com nome público, legenda e contagens (sem e-mail do autor)", async () => {
    const { service, notifications } = setup();
    await service.createSection(dto as never, { a: png("a"), b: png("b") }, "u1");
    await flush();
    expect(notifications.sendPhotoUploadedNotification).toHaveBeenCalledTimes(1);
    const calls = notifications.sendPhotoUploadedNotification.mock
      .calls as unknown as Array<[Record<string, unknown>, string[]]>;
    const [payload, recipients] = calls[0];
    expect(recipients).toEqual(["adm@x.com", "adm2@x.com"]);
    expect(payload).toEqual({
      authorName: "Maria L.",
      caption: "Visita",
      photoCount: 2,
      videoCount: 1,
    });
    expect(JSON.stringify(payload)).not.toMatch(/maria@x|Souza/);
  });

  it("autor admin (notifyAdmins=false): ninguém é avisado", async () => {
    const { service, notifications, users } = setup();
    await service.createSection(
      dto as never,
      { a: png("a"), b: png("b") },
      "u1",
      { notifyAdmins: false },
    );
    await flush();
    expect(users.findAdminEmails).not.toHaveBeenCalled();
    expect(notifications.sendPhotoUploadedNotification).not.toHaveBeenCalled();
  });

  it("falha do e-mail não derruba nem desfaz a publicação (já commitada)", async () => {
    const { service, notifications, runner } = setup();
    notifications.sendPhotoUploadedNotification.mockRejectedValueOnce(
      new Error("smtp fora"),
    );
    const result = await service.createSection(
      dto as never,
      { a: png("a"), b: png("b") },
      "u1",
    );
    await flush();
    expect(result.id).toBe("s1");
    expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(runner.rollbackTransaction).not.toHaveBeenCalled();
  });

  it("mídia inválida é recusada com mensagem clara ANTES de abrir transação, sem aviso", async () => {
    const { service, notifications, runner } = setup();
    await expect(
      service.createSection(
        { ...dto, mediaItems: [] } as never,
        {},
        "u1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(runner.startTransaction).not.toHaveBeenCalled();
    expect(notifications.sendPhotoUploadedNotification).not.toHaveBeenCalled();
  });
});
