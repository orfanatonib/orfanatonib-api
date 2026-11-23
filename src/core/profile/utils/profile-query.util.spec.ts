import { likeParam, resolveProfileSort } from "./profile-query.util";

describe("resolveProfileSort", () => {
  it.each([
    ["name", "u.name"],
    ["email", "u.email"],
    ["createdAt", "u.createdAt"],
    ["birthDate", "pd.birthDate"],
  ])("chave %s ordena por %s", (key, column) => {
    expect(resolveProfileSort(key, "ASC").column).toBe(column);
  });

  it("sem chave usa o nome", () => {
    expect(resolveProfileSort(undefined, undefined)).toEqual({
      column: "u.name",
      direction: "ASC",
    });
  });

  it.each([
    "name; DROP TABLE users;--",
    "u.password",
    "1=1",
    "constructor",
    "__proto__",
    "toString",
  ])(
    "chave maliciosa ou desconhecida (%s) cai no padrão e nunca entra no SQL",
    (bad) => {
      const { column } = resolveProfileSort(bad, "ASC");
      expect(column).toBe("u.name");
      expect(column).not.toContain(
        bad.split(" ")[0] === "name;" ? "DROP" : bad,
      );
    },
  );

  it("direção: só 'DESC' exato inverte; o resto é ASC", () => {
    expect(resolveProfileSort("name", "DESC").direction).toBe("DESC");
    for (const bad of ["desc", "DESC; DROP", "1", "", undefined]) {
      expect(resolveProfileSort("name", bad).direction).toBe("ASC");
    }
  });
});

describe("likeParam", () => {
  it("embrulha o termo em curingas sem alterá-lo", () => {
    expect(likeParam("ana")).toBe("%ana%");
    expect(likeParam("a'b")).toBe("%a'b%");
  });

  it("escapa curingas digitados: % e _ viram literais", () => {
    expect(likeParam("50%_x")).toBe("%50\\%\\_x%");
  });
});
