import * as sharpModule from "sharp";

import { ContentVisualOrientation } from "../../enums/content-visual.enums";
import {
  A4_RATIO,
  cropToA4,
  imageDimensions,
  padToA4,
} from "./image-processing.util";

const sharp = ((sharpModule as unknown as { default?: typeof sharpModule })
  .default ?? sharpModule) as unknown as typeof sharpModule.default;

const png = (width: number, height: number) =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 30, b: 30 },
    },
  })
    .png()
    .toBuffer();

describe("cropToA4", () => {
  it("paisagem: recorta o 3:2 do gerador para a proporção do A4, sem esticar", async () => {
    const out = await cropToA4(
      await png(1536, 1024),
      ContentVisualOrientation.LANDSCAPE,
    );
    expect(out.width / out.height).toBeCloseTo(A4_RATIO, 2);
    expect(out.height).toBe(1024); // só some a sobra dos lados
    expect(out.mediaType).toBe("image/png");
  });

  it("retrato: recorta o 2:3 do gerador para o A4 em pé", async () => {
    const out = await cropToA4(
      await png(1024, 1536),
      ContentVisualOrientation.PORTRAIT,
    );
    expect(out.height / out.width).toBeCloseTo(A4_RATIO, 2);
    expect(out.width).toBe(1024);
  });

  it("devolve as dimensões e recusa lixo", async () => {
    expect(await imageDimensions(await png(40, 30))).toEqual({
      width: 40,
      height: 30,
    });
    await expect(
      cropToA4(new Uint8Array([1, 2, 3]), ContentVisualOrientation.LANDSCAPE),
    ).rejects.toBeDefined();
  });
});

describe("padToA4", () => {
  it("retrato 2:3: estende as laterais até a A4 e mantém toda a altura (nada é cortado)", async () => {
    const out = await padToA4(
      await png(1024, 1536),
      ContentVisualOrientation.PORTRAIT,
    );
    expect(out.height).toBe(1536);
    expect(out.width).toBeGreaterThan(1024);
    expect(out.width / out.height).toBeCloseTo(1 / A4_RATIO, 2);
  });

  it("já na proporção: não muda o tamanho", async () => {
    const out = await padToA4(
      await png(1000, 1414),
      ContentVisualOrientation.PORTRAIT,
    );
    expect(out.width).toBe(1000);
    expect(out.height).toBe(1414);
  });
});
