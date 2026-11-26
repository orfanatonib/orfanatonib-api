import { Logger } from "@nestjs/common";

import { GeneratePackageCoverService } from "./generate-package-cover.service";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const OLD_URL = "https://bucket/test/content-studio/p1/cover-antiga.png";

function setup() {
  const pack = {
    id: "p1",
    theme: "O bom pastor",
    biblicalReferences: "João 10",
    canonicalObjective: "Jesus cuida",
    coverImageUrl: OLD_URL as string | null,
  };
  const packages = {
    findOne: jest.fn(() => Promise.resolve({ ...pack })),
    update: jest.fn((_where: unknown, patch: Partial<typeof pack>) => {
      Object.assign(pack, patch);
      return Promise.resolve();
    }),
  };
  const gateway = {
    generateStructuredText: jest.fn().mockRejectedValue(new Error("sem texto")),
    generateImage: jest.fn().mockResolvedValue({ bytes: PNG }),
  };
  const uploaded: string[] = [];
  const s3 = {
    getEnvironment: () => "test",
    putObject: jest.fn((key: string) => {
      uploaded.push(key);
      return Promise.resolve(`https://bucket/${key}`);
    }),
    deleteKey: jest.fn().mockResolvedValue(undefined),
    keyFromOwnedUrl: (url: string) => url.replace("https://bucket/", ""),
  };
  const pages = {
    findBySourceLessonId: jest.fn().mockResolvedValue({ route: { id: "r1" } }),
  };
  const pageCover = { execute: jest.fn().mockResolvedValue(undefined) };
  const service = new GeneratePackageCoverService(
    packages as never,
    gateway as never,
    s3 as never,
    { get: () => undefined } as never,
    pages as never,
    pageCover as never,
  );
  return { service, pack, s3, uploaded, pageCover };
}

describe("GeneratePackageCoverService", () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  it("troca a capa e só então apaga a imagem antiga", async () => {
    const { service, pack, s3, uploaded } = setup();

    const url = await service.generate("p1");

    expect(pack.coverImageUrl).toBe(url);
    expect(s3.deleteKey).toHaveBeenCalledTimes(1);
    expect(s3.deleteKey).toHaveBeenCalledWith(
      "test/content-studio/p1/cover-antiga.png",
    );
    expect(uploaded).toHaveLength(1);
  });

  it("falha ao atualizar a página publicada: o pacote volta à capa antiga e só a imagem nova é apagada", async () => {
    const { service, pack, s3, uploaded, pageCover } = setup();
    pageCover.execute.mockRejectedValue(new Error("rota travada"));

    await expect(service.generate("p1")).rejects.toThrow("rota travada");

    // Antes o pacote ficava apontando para a imagem recém-apagada.
    expect(pack.coverImageUrl).toBe(OLD_URL);
    expect(s3.deleteKey).toHaveBeenCalledTimes(1);
    expect(s3.deleteKey).toHaveBeenCalledWith(uploaded[0]);
  });
});
