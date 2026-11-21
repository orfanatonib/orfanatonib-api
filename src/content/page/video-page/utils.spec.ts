import type { MediaItemEntity } from "src/shared/media/media-item/media-item.entity";

import {
  errorReason,
  findRemovedMedia,
  localFileUrls,
  requestedMediaIds,
} from "./utils";

const item = (id: string, isLocalFile: boolean, url = `u-${id}`) =>
  ({ id, isLocalFile, url }) as MediaItemEntity;

describe("utils de página de vídeos", () => {
  it("requestedMediaIds ignora vazio, nulo e indefinido", () => {
    expect([
      ...requestedMediaIds([{ id: "a" }, { id: "" }, { id: null }, {}]),
    ]).toEqual(["a"]);
  });

  it("findRemovedMedia devolve só o que a requisição não lista", () => {
    const existing = [item("a", true), item("b", false)];
    expect(findRemovedMedia(existing, [{ id: "a" }]).map((m) => m.id)).toEqual([
      "b",
    ]);
    expect(findRemovedMedia(existing, [])).toHaveLength(2);
  });

  it("localFileUrls só inclui arquivos locais com URL", () => {
    expect(
      localFileUrls([item("a", true), item("b", false), item("c", true, "")]),
    ).toEqual(["u-a"]);
  });

  it("errorReason devolve a mensagem, nunca o stack", () => {
    expect(errorReason(new Error("x"))).toBe("x");
    expect(errorReason("y")).toBe("y");
  });
});
