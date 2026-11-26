import { evaluateGenerationCapacity } from "./generation-capacity.helpers";

const slot = (packageId: string, trackId: string) => ({ packageId, trackId });
const limits = { maxPerCategory: 1, maxPackages: 2 };

describe("evaluateGenerationCapacity", () => {
  it("libera quando não há nada ativo", () => {
    expect(evaluateGenerationCapacity([], slot("p1", "t1"), limits)).toBeNull();
  });

  it("bloqueia a segunda geração na mesma categoria", () => {
    expect(
      evaluateGenerationCapacity([slot("p1", "t1")], slot("p1", "t1"), limits),
    ).toBe("CATEGORY_BUSY");
  });

  it("libera outra categoria do mesmo material", () => {
    expect(
      evaluateGenerationCapacity([slot("p1", "t1")], slot("p1", "t2"), limits),
    ).toBeNull();
  });

  it("libera um segundo material, mas bloqueia o terceiro", () => {
    const active = [slot("p1", "t1"), slot("p2", "t5")];
    expect(
      evaluateGenerationCapacity(active, slot("p2", "t6"), limits),
    ).toBeNull();
    expect(evaluateGenerationCapacity(active, slot("p3", "t9"), limits)).toBe(
      "PACKAGE_LIMIT",
    );
  });

  it("chega a 8 gerações simultâneas (4 categorias × 2 materiais) e nenhuma a mais", () => {
    const active = ["p1", "p2"].flatMap((p) =>
      [1, 2, 3, 4].map((n) => slot(p, `${p}-t${n}`)),
    );
    expect(active).toHaveLength(8);
    expect(
      evaluateGenerationCapacity(active, slot("p1", "p1-t1"), limits),
    ).toBe("CATEGORY_BUSY");
    expect(
      evaluateGenerationCapacity(active, slot("p3", "p3-t1"), limits),
    ).toBe("PACKAGE_LIMIT");
  });
});
