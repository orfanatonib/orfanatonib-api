/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { VideoPageMediaService } from "./video-page-media.service";

export const FAKE_MANAGER = { tx: true } as never;

export function makeBatch() {
  const objects: Array<{ url: string; key: string }> = [];
  return {
    objects,
    add: jest.fn((o: { url: string; key: string }) => objects.push(o)),
    discard: jest.fn(async () => {
      objects.length = 0;
    }),
    commit: jest.fn(() => {
      objects.length = 0;
    }),
  };
}

export function makeStorage(batch = makeBatch()) {
  let n = 0;
  return {
    batch,
    newBatch: jest.fn(() => batch),
    uploadAll: jest.fn(async (_reqs: unknown, b: typeof batch) => {
      n += 1;
      b.add({ url: `https://b/new-${n}.mp4`, key: `k/new-${n}.mp4` });
      return b;
    }),
    deleteAfterCommit: jest.fn(async () => undefined),
  };
}

export function makeProcessor(existing: unknown[] = []) {
  return {
    buildBaseMediaItem: jest.fn(
      (
        item: Record<string, unknown>,
        targetId: string,
        targetType: string,
      ) => ({
        title: item.title ?? "",
        uploadType: item.uploadType,
        url: item.url ?? "",
        platformType: item.platformType,
        isLocalFile: false,
        targetId,
        targetType,
      }),
    ),
    findManyMediaItemsByTargets: jest.fn(async () => existing),
    findMediaItemsByTarget: jest.fn(async () => existing),
  };
}

export function makeRepo(
  overrides: Record<string, unknown> = {},
  existingMedia: unknown[] = [],
) {
  let n = 0;
  return {
    findById: jest.fn(),
    runInTransaction: jest.fn(async (work: (m: never) => Promise<unknown>) =>
      work(FAKE_MANAGER),
    ),
    createPage: jest.fn(async (_m: unknown, d: object) => ({
      ...d,
      id: "p1",
    })),
    savePage: jest.fn(async (_m: unknown, p: object) => ({
      ...p,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    saveMedia: jest.fn(async (_m: unknown, media: object) => ({
      ...media,
      id: (media as { id?: string }).id ?? `m${++n}`,
    })),
    lockPage: jest.fn(async () => true),
    findMedia: jest.fn(async () => existingMedia),
    removeMedia: jest.fn(async () => undefined),
    removePageWithRoute: jest.fn(async () => undefined),
    ...overrides,
  };
}

export function makeMediaService(
  storage: ReturnType<typeof makeStorage>,
  processor: ReturnType<typeof makeProcessor>,
) {
  return new VideoPageMediaService(processor as never, storage as never);
}

export const route = {
  id: "r1",
  title: "t",
  public: true,
  subtitle: "s",
  image: "i",
  idToFetch: "p1",
  path: "galeria_videos_x",
  entityType: "VideosPage",
  description: "d",
  entityId: "p1",
  type: "page",
};
