import { ConfigService } from "@nestjs/config";

import { AwsS3Service } from "./aws-s3.service";

const send = jest.fn();
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => ({ send })),
  PutObjectCommand: jest.fn((input: unknown) => ({ kind: "put", input })),
  DeleteObjectCommand: jest.fn((input: unknown) => ({ kind: "delete", input })),
  ListObjectsV2Command: jest.fn((input: unknown) => ({ kind: "list", input })),
}));

function make(env: Record<string, string> = {}) {
  const cfg = {
    get: (k: string) =>
      ({
        AWS_S3_BUCKET_NAME: "b",
        ENVIRONMENT: "local",
        AWS_ENDPOINT: "http://ls:4566",
        ...env,
      })[k],
  };
  return new AwsS3Service(cfg as unknown as ConfigService);
}

describe("AwsS3Service", () => {
  beforeEach(() => send.mockReset());

  it("upload legado: duas chamadas no mesmo ms geram chaves distintas (sem colisão)", async () => {
    send.mockResolvedValue({});
    jest.spyOn(Date, "now").mockReturnValue(1);
    const s = make();
    const f = {
      originalname: "a b.png",
      mimetype: "image/png",
      buffer: Buffer.from("x"),
    } as Express.Multer.File;
    const [u1, u2] = [await s.upload(f), await s.upload(f)];
    expect(u1).not.toBe(u2);
    expect(u1).toMatch(
      /^http:\/\/ls:4566\/b\/local\/uploads\/[0-9a-f-]{36}_a_b\.png$/,
    );
  });

  it("putObject devolve a URL e traduz falha", async () => {
    send.mockResolvedValueOnce({});
    expect(
      await make().putObject("k/1.png", Buffer.from("x"), "image/png"),
    ).toBe("http://ls:4566/b/k/1.png");
    send.mockRejectedValueOnce(new Error("x"));
    await expect(
      make().putObject("k", Buffer.from("x"), "image/png"),
    ).rejects.toThrow("Error uploading to S3");
  });

  it("deleteKey propaga a falha; delete legado continua engolindo (comportamento atual)", async () => {
    send.mockRejectedValue(new Error("denied"));
    await expect(make().deleteKey("k")).rejects.toThrow("denied");
    await expect(
      make().delete("http://ls:4566/b/local/uploads/x.png"),
    ).resolves.toBeUndefined();
  });

  it("delete legado com URL sem chave não chama o S3", async () => {
    await make().delete("https://youtube.com/x");
    expect(send).not.toHaveBeenCalled();
  });

  it("listKeys percorre as páginas", async () => {
    send
      .mockResolvedValueOnce({
        Contents: [{ Key: "a", LastModified: new Date(0) }],
        IsTruncated: true,
        NextContinuationToken: "t",
      })
      .mockResolvedValueOnce({ Contents: [{ Key: "b" }], IsTruncated: false });
    const keys = await make().listKeys("local/");
    expect(keys.map((k) => k.key)).toEqual(["a", "b"]);
  });
});
