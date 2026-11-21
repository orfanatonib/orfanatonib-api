import { Logger } from "@nestjs/common";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaItemRepository } from "src/shared/media/media-item-repository";
import {
  MediaItemEntity,
  MediaType,
  UploadType,
} from "src/shared/media/media-item/media-item.entity";
import {
  createInMemoryBucket,
  InMemoryBucket,
  pngFile,
} from "src/shared/media/testing/in-memory-bucket";
import { VisitMaterialMediaService } from "./visit-material-media.service";

/**
 * Atualização de material de visita (caminho LEGADO de armazenamento): `AwsS3Service` REAL,
 * `UploadScopeInterceptor` REAL e um bucket/banco em memória. Prova o que sobra no bucket
 * quando a requisição dá certo e quando falha depois do upload.
 */
const PAGE = "page-1";
const TARGET = "VisitMaterialsPage";

describe("Material de visita: troca de arquivo × bucket (rollback)", () => {
  let bucket: InMemoryBucket;
  let rows: MediaItemEntity[];
  let failWrites: boolean;
  let service: VisitMaterialMediaService;
  let oldUrl: string;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, "error").mockImplementation();
    jest.spyOn(Logger.prototype, "warn").mockImplementation();
    bucket = createInMemoryBucket();
    failWrites = false;
    oldUrl = bucket.plant("test/uploads/old.png");
    rows = [
      Object.assign(new MediaItemEntity(), {
        id: "m1",
        targetId: PAGE,
        targetType: TARGET,
        mediaType: MediaType.IMAGE,
        isLocalFile: true,
        uploadType: UploadType.UPLOAD,
        url: oldUrl,
      }),
    ];
    const repo = {
      findById: jest.fn((id: string) =>
        Promise.resolve(rows.find((r) => r.id === id) ?? null),
      ),
      saveById: jest.fn((id: string, data: Partial<MediaItemEntity>) => {
        if (failWrites) return Promise.reject(new Error("banco indisponível"));
        const row = rows.find((r) => r.id === id);
        if (row) Object.assign(row, data);
        return Promise.resolve(row as MediaItemEntity);
      }),
      removeMany: jest.fn((items: MediaItemEntity[]) => {
        rows = rows.filter((r) => !items.includes(r));
        return Promise.resolve();
      }),
    };
    service = new VisitMaterialMediaService(
      new MediaItemProcessor(repo as unknown as MediaItemRepository),
      bucket.s3,
    );
  });

  afterEach(() => {
    bucket.restore();
    jest.restoreAllMocks();
  });

  const referenced = (url: string): boolean => rows.some((r) => r.url === url);
  const replaceWithUpload = () =>
    service.upsert(
      {
        id: "m1",
        title: "t",
        mediaType: MediaType.IMAGE,
        uploadType: UploadType.UPLOAD,
        fieldKey: "f",
      } as never,
      PAGE,
      MediaType.IMAGE,
      { f: pngFile() },
    );

  it("[media-upload.legacy-update.visit-material#feliz] troca com sucesso: só o objeto novo fica, referenciado pela linha", async () => {
    await bucket.request(replaceWithUpload, referenced);
    expect(bucket.keys()).toHaveLength(1);
    expect(bucket.keys()).not.toContain("test/uploads/old.png");
    expect(rows[0].url).toContain(bucket.keys()[0]);
  });

  it("[media-upload.legacy-update.visit-material#rollback-banco-falha] banco falha depois do upload: o novo é descartado e o antigo continua no bucket e na linha", async () => {
    failWrites = true;
    await expect(bucket.request(replaceWithUpload, referenced)).rejects.toThrow(
      "banco indisponível",
    );
    expect(bucket.keys()).toEqual(["test/uploads/old.png"]);
    expect(rows[0].url).toBe(oldUrl);
  });

  it("[media-upload.legacy-update.visit-material#arquivo-invalido-nada-sobe] arquivo que não é imagem de verdade é recusado: bucket e linha inalterados", async () => {
    const html = {
      ...pngFile("x.png"),
      buffer: Buffer.from("<html><script>alert(1)</script></html>"),
    } as Express.Multer.File;
    const work = () =>
      service.upsert(
        {
          id: "m1",
          title: "t",
          mediaType: MediaType.IMAGE,
          uploadType: UploadType.UPLOAD,
          fieldKey: "f",
        } as never,
        PAGE,
        MediaType.IMAGE,
        { f: html },
      );
    await expect(bucket.request(work, referenced)).rejects.toThrow();
    expect(bucket.keys()).toEqual(["test/uploads/old.png"]);
    expect(rows[0].url).toBe(oldUrl);
  });

  it("limite conhecido: itens removidos por `removeMissing` já saíram do banco (sem transação); a falha tardia deixa o objeto sem linha até a reconciliação", async () => {
    const work = async () => {
      await service.removeMissing([rows[0]], []);
      throw new Error("falha tardia");
    };
    await expect(bucket.request(work, referenced)).rejects.toThrow(
      "falha tardia",
    );
    expect(rows).toHaveLength(0);
    // Resíduo registrado no plano 05 (§Fechamento): torná-lo transacional é do plano 35 (visit-material).
    expect(bucket.keys()).toEqual(["test/uploads/old.png"]);
  });
});
