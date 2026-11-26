import {
  groupMediasByTarget,
  shortName,
  toIdeasSectionDto,
  toUserDto,
} from "./ideas-section.mapper";
import {
  buildMediaEntity,
  buildSection,
  buildUser,
  FIXED_CREATED_AT,
} from "../ideas-section.fixtures";

describe("shortName", () => {
  it.each([
    ["Maria Clara dos Santos", "Maria Santos"],
    ["Maria", "Maria"],
    ["  Ana   Paula  Souza  ", "Ana Souza"],
    ["", ""],
  ])("%s vira %s", (input, expected) => {
    expect(shortName(input)).toBe(expected);
  });

  it.each([[undefined], [null]])("devolve vazio para %s", (input) => {
    expect(shortName(input)).toBe("");
  });
});

describe("toUserDto", () => {
  it("expõe nome curto, e-mail e telefone do autor", () => {
    expect(toUserDto(buildSection())).toEqual({
      name: "Maria Santos",
      email: "maria@exemplo.test",
      phone: "92999990000",
    });
  });

  it("omite o autor quando a relação não foi carregada", () => {
    // A seção recém-salva traz só `{ id }` — antes isso virava um autor com
    // nome vazio e e-mail indefinido na resposta.
    const section = buildSection({
      user: buildUser({ name: undefined, email: undefined }),
    });

    expect(toUserDto(section)).toBeUndefined();
  });

  it("omite o autor quando a seção não tem um", () => {
    expect(toUserDto(buildSection({ user: undefined }))).toBeUndefined();
  });
});

describe("toIdeasSectionDto", () => {
  it("monta a resposta sem vazar a entidade nem a página", () => {
    const dto = toIdeasSectionDto(buildSection(), [buildMediaEntity()]);

    expect(Object.keys(dto).sort()).toEqual([
      "createdAt",
      "description",
      "id",
      "medias",
      "public",
      "title",
      "updatedAt",
      "user",
    ]);
    expect(dto).not.toHaveProperty("page");
    expect(dto.createdAt).toBe(FIXED_CREATED_AT);
  });

  it("a mídia sai sem fieldKey nem alvo", () => {
    const [media] = toIdeasSectionDto(buildSection(), [
      buildMediaEntity(),
    ]).medias;

    expect(Object.keys(media).sort()).toEqual([
      "description",
      "id",
      "isLocalFile",
      "mediaType",
      "originalName",
      "platformType",
      "size",
      "title",
      "uploadType",
      "url",
    ]);
  });

  it("seção sem mídia devolve lista vazia", () => {
    expect(toIdeasSectionDto(buildSection(), []).medias).toEqual([]);
  });
});

describe("groupMediasByTarget", () => {
  it("agrupa as mídias por seção", () => {
    const grouped = groupMediasByTarget([
      buildMediaEntity({ id: "m1", targetId: "s1" }),
      buildMediaEntity({ id: "m2", targetId: "s2" }),
      buildMediaEntity({ id: "m3", targetId: "s1" }),
    ]);

    expect(grouped.get("s1")?.map((media) => media.id)).toEqual(["m1", "m3"]);
    expect(grouped.get("s2")?.map((media) => media.id)).toEqual(["m2"]);
    expect(grouped.get("inexistente")).toBeUndefined();
  });

  it("lista vazia devolve mapa vazio", () => {
    expect(groupMediasByTarget([]).size).toBe(0);
  });
});
