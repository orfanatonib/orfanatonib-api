/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { MediaItemProcessor } from "src/shared/media/media-item-processor";
import { MediaItemRepository } from "src/shared/media/media-item-repository";
import { UpdateMeditationService } from "./update-meditation.service";

const OLD = "https://b/local/uploads/old.pdf";
const NEW = "https://b/local/uploads/new.pdf";
const file = {
  originalname: "n.pdf",
  mimetype: "application/pdf",
  size: 4,
  buffer: Buffer.from("%PDF"),
} as Express.Multer.File;

/** 2025-01-06 é segunda; 2025-01-10 é sexta. */
const dto = (extra: object = {}) =>
  ({
    topic: "Tema",
    startDate: "2025-01-06",
    endDate: "2025-01-10",
    media: {
      title: "t",
      uploadType: "upload",
      mediaType: "document",
      isLocalFile: true,
      fieldKey: "file",
    },
    ...extra,
  }) as never;

/** Repositório de mídia em memória: a "tabela" `media_items` do dono. */
function fakeMediaRepo(initial: { id: string; url: string }[]) {
  const rows = initial.map((r) => ({ ...r, isLocalFile: true }));
  return {
    rows,
    repo: {
      findByTarget: jest.fn(async () => [...rows]),
      save: jest.fn(async (m: { id?: string; url: string }) => {
        const saved = { ...m, id: m.id ?? `m${rows.length + 1}` };
        rows.push(saved as never);
        return saved;
      }),
      saveById: jest.fn(async () => undefined),
      removeMany: jest.fn(async (items: { id: string }[]) => {
        for (const item of items) {
          const i = rows.findIndex((r) => r.id === item.id);
          if (i >= 0) rows.splice(i, 1);
        }
      }),
    },
  };
}

interface LockBuilder {
  setLock: () => LockBuilder;
  where: () => LockBuilder;
  getOne: () => Promise<object | null>;
}

function setup(
  opts: {
    failTransaction?: boolean;
    saveFails?: boolean;
    vanished?: boolean;
  } = {},
) {
  const events: string[] = [];
  const existing = {
    id: "med1",
    topic: "Tema",
    startDate: new Date(2025, 0, 6),
    endDate: new Date(2025, 0, 10),
    days: [],
  };
  const meditationRepo = {
    findOneWithRelations: jest.fn(async () => existing as object | null),
    findAllWithRelations: jest.fn(async () => [existing] as object[]),
  };
  const { rows, repo } = fakeMediaRepo([{ id: "m1", url: OLD }]);
  if (opts.saveFails) {
    repo.saveById.mockRejectedValue(new Error("banco"));
    repo.save.mockRejectedValue(new Error("banco"));
  }
  const processor = new MediaItemProcessor(
    repo as unknown as MediaItemRepository,
  );
  const manager = {
    merge: (_e: unknown, cur: object, values: object) => ({
      ...cur,
      ...values,
    }),
    save: jest.fn(async (_e: unknown, v: object) => v),
    remove: jest.fn(),
    create: jest.fn((_e: unknown, v: object) => v),
    // Trava a meditação no começo da transação (edições simultâneas se enfileiram).
    createQueryBuilder: jest.fn((): LockBuilder => {
      const builder: LockBuilder = {
        setLock: () => builder,
        where: () => builder,
        getOne: () => Promise.resolve(opts.vanished ? null : existing),
      };
      return builder;
    }),
  };
  const dataSource = {
    transaction: jest.fn(
      async (work: (m: typeof manager) => Promise<unknown>) => {
        try {
          const out = await work(manager);
          if (opts.failTransaction) throw new Error("commit falhou");
          events.push("commit");
          return out;
        } catch (error) {
          events.push("rollback");
          throw error;
        }
      },
    ),
  };
  const s3 = {
    upload: jest.fn(async () => {
      events.push("upload");
      return NEW;
    }),
  };
  const mediaStorage = {
    deleteAfterCommit: jest.fn(async (urls: string[]) => {
      for (const url of urls) events.push(`delete:${url}`);
    }),
  };
  const svc = new UpdateMeditationService(
    meditationRepo as never,
    dataSource as never,
    processor,
    s3 as never,
    mediaStorage as never,
  );
  return { svc, events, rows, s3, mediaStorage, meditationRepo };
}

describe("UpdateMeditationService (caminho legado de upload)", () => {
  it("[media-upload.legacy-update.meditation#feliz] sobe o novo, confirma e SÓ DEPOIS apaga o antigo do bucket", async () => {
    const { svc, events } = setup();
    await svc.update("med1", dto(), file);
    expect(events).toEqual(["upload", "commit", `delete:${OLD}`]);
  });

  it("[media-upload.legacy-update.meditation#rollback-transacao] commit falha depois do upload: descarta só o NOVO e o antigo segue no bucket", async () => {
    const { svc, events, mediaStorage } = setup({ failTransaction: true });
    await expect(svc.update("med1", dto(), file)).rejects.toThrow(
      "commit falhou",
    );
    expect(events).toContain("rollback");
    expect(events).not.toContain("commit");
    expect(mediaStorage.deleteAfterCommit).toHaveBeenCalledTimes(1);
    expect(mediaStorage.deleteAfterCommit).toHaveBeenCalledWith([NEW]);
    expect(events).not.toContain(`delete:${OLD}`);
  });

  it("[media-upload.legacy-update.meditation#falha-ao-gravar-linha] banco recusa a linha depois do upload: o novo é descartado, o antigo nunca é apagado", async () => {
    const { svc, events } = setup({ saveFails: true });
    await expect(svc.update("med1", dto(), file)).rejects.toThrow("banco");
    expect(events).toEqual(["upload", "rollback", `delete:${NEW}`]);
  });

  it("[media-upload.legacy-update.meditation#sem-arquivo-novo] atualizar só os dados não toca no bucket", async () => {
    const { svc, s3, mediaStorage } = setup();
    await svc.update("med1", dto({ media: undefined }), undefined);
    expect(s3.upload).not.toHaveBeenCalled();
    expect(mediaStorage.deleteAfterCommit).toHaveBeenCalledWith([]);
  });

  it("validações (data fora de segunda/sexta, conflito, inexistente) falham antes de qualquer upload", async () => {
    const a = setup();
    await expect(
      a.svc.update("med1", dto({ startDate: "2025-01-07" }), file),
    ).rejects.toBeInstanceOf(BadRequestException);
    const b = setup();
    await expect(
      b.svc.update("med1", dto({ endDate: "2025-01-09" }), file),
    ).rejects.toBeInstanceOf(BadRequestException);
    const c = setup();
    c.meditationRepo.findOneWithRelations.mockResolvedValue(null);
    await expect(c.svc.update("x", dto(), file)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    const d = setup();
    d.meditationRepo.findAllWithRelations.mockResolvedValue([
      {
        id: "outra",
        startDate: new Date(2025, 0, 6),
        endDate: new Date(2025, 0, 10),
      },
      {
        id: "med1",
        startDate: new Date(2025, 0, 6),
        endDate: new Date(2025, 0, 10),
      },
    ]);
    await expect(d.svc.update("med1", dto(), file)).rejects.toBeInstanceOf(
      ConflictException,
    );
    for (const x of [a, b, c, d]) expect(x.s3.upload).not.toHaveBeenCalled();
  });
  it("trava a meditação no início da transação e responde 404, sem gravar nada, se ela sumiu antes do lock", async () => {
    const { svc, s3, mediaStorage } = setup({ vanished: true });

    await expect(
      svc.update("med1", { topic: "Novo" } as never, undefined),
    ).rejects.toThrow("Meditation not found");

    expect(s3.upload).not.toHaveBeenCalled();
    expect(mediaStorage.deleteAfterCommit).toHaveBeenCalledWith([]);
  });
});
