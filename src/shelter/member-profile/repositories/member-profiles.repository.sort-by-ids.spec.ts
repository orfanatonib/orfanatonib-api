import { MemberProfilesRepository } from "./member-profiles.repository";

describe("MemberProfilesRepository.sortByIds", () => {
  it("devolve os itens na ordem dos ids da página (inclusive decrescente)", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(
      MemberProfilesRepository.sortByIds(items, ["c", "b", "a"]).map(
        (i) => i.id,
      ),
    ).toEqual(["c", "b", "a"]);
    expect(
      MemberProfilesRepository.sortByIds(items, ["b", "c", "a"]).map(
        (i) => i.id,
      ),
    ).toEqual(["b", "c", "a"]);
  });

  it("não muta a lista original", () => {
    const items = [{ id: "a" }, { id: "b" }];
    MemberProfilesRepository.sortByIds(items, ["b", "a"]);
    expect(items.map((i) => i.id)).toEqual(["a", "b"]);
  });
});
