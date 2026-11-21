/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { BadRequestException } from "@nestjs/common";

import { MediaType } from "../media-item/media-item.entity";
import { MediaStorageService } from "./media-storage.service";

function setup(overrides: { putFailsAt?: number; deleteFails?: boolean } = {}) {
  let puts = 0;
  const s3 = {
    getEnvironment: () => "local",
    getBucketName: () => "b",
    putObject: jest.fn(async (key: string) => {
      puts++;
      if (overrides.putFailsAt === puts) throw new Error("s3 down");
      return `http://x/b/${key}`;
    }),
    deleteKey: jest.fn(async () => {
      if (overrides.deleteFails) throw new Error("denied");
    }),
  };
  const queue = { enqueue: jest.fn(async () => undefined) };
  const svc = new MediaStorageService(s3 as never, queue as never);
  return { svc, s3, queue };
}

const file = (mimetype = "image/png", size = 10) =>
  ({
    originalname: "a.png",
    mimetype,
    size,
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  }) as Express.Multer.File;
const req = (f = file()) => ({
  file: f,
  mediaType: MediaType.IMAGE,
  entity: "Event",
  ownerId: "o1",
});

describe("MediaStorageService", () => {
  it("[media-upload.storage.upload-all#feliz] uploadAll envia com chave única por entidade/dono", async () => {
    const { svc } = setup();
    const batch = await svc.uploadAll([req(), req()]);
    expect(batch.objects).toHaveLength(2);
    expect(batch.objects[0].key).toMatch(
      /^local\/Event\/o1\/[0-9a-f-]{36}\.png$/,
    );
    expect(batch.objects[0].key).not.toBe(batch.objects[1].key);
  });

  it("[media-upload.storage.upload-all#tipo-invalido] recusa MIME inválido sem enviar nada e descarta o que já subiu", async () => {
    const { svc, s3 } = setup();
    await expect(
      svc.uploadAll([req(), req(file("text/html"))]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(s3.putObject).toHaveBeenCalledTimes(1);
    expect(s3.deleteKey).toHaveBeenCalledTimes(1);
  });

  it("[media-upload.storage.upload-all#falha-no-meio-descarta-lote] falha no 2º upload descarta o 1º", async () => {
    const { svc, s3 } = setup({ putFailsAt: 2 });
    await expect(svc.uploadAll([req(), req()])).rejects.toThrow("s3 down");
    expect(s3.deleteKey).toHaveBeenCalledTimes(1);
  });

  it("[media-upload.storage.upload-all#discard-falha-vai-para-fila] discard com falha de remoção vai para a fila (não é engolido)", async () => {
    const { svc, queue } = setup({ deleteFails: true });
    const batch = await svc.uploadAll([req()]);
    await batch.discard();
    expect(queue.enqueue).toHaveBeenCalledWith(
      expect.stringContaining("local/Event/o1/"),
      "denied",
    );
  });

  it("[media-upload.storage.upload-all#commit-zera-lote] commit zera o lote: discard depois não apaga nada", async () => {
    const { svc, s3 } = setup();
    const batch = await svc.uploadAll([req()]);
    batch.commit();
    await batch.discard();
    expect(s3.deleteKey).not.toHaveBeenCalled();
  });

  it("[media-upload.storage.delete-after-commit#falha-e-url-sem-chave-vao-para-fila] deleteAfterCommit: falha e URL sem chave vão para a fila", async () => {
    const { svc, queue, s3 } = setup({ deleteFails: true });
    await svc.deleteAfterCommit([
      "http://x/b/local/E/o/u.png",
      "https://youtube.com/v",
    ]);
    expect(s3.deleteKey).toHaveBeenCalledWith("local/E/o/u.png");
    expect(queue.enqueue).toHaveBeenCalledTimes(2);
  });

  it("[media-upload.storage.delete-strict#propaga-erro] deleteStrict propaga erro", async () => {
    const { svc } = setup({ deleteFails: true });
    await expect(svc.deleteStrict("http://x/b/k.png")).rejects.toThrow(
      "denied",
    );
    await expect(svc.deleteStrict("https://youtube.com/v")).rejects.toThrow(
      "não extraível",
    );
  });
});
