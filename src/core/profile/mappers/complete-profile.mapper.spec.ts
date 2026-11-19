import {
  birthDateOnly,
  toCompleteProfileResponse,
} from "./complete-profile.mapper";

describe("birthDateOnly", () => {
  it("usa o dia como veio (Date em UTC ou string ISO), sem deslocar", () => {
    expect(birthDateOnly(new Date("2000-02-29T00:00:00Z"))).toBe("2000-02-29");
    expect(birthDateOnly("2000-02-29T12:00:00.000Z")).toBe("2000-02-29");
    expect(birthDateOnly("2000-02-29")).toBe("2000-02-29");
  });

  it("vazio vira undefined", () => {
    expect(birthDateOnly(null)).toBeUndefined();
    expect(birthDateOnly(undefined)).toBeUndefined();
    expect(birthDateOnly("")).toBeUndefined();
  });
});

describe("toCompleteProfileResponse", () => {
  const user = {
    id: "u",
    email: "e@x.com",
    phone: "1",
    name: "N",
    role: "member" as never,
  };

  it("sem dados nem preferências devolve só o usuário", () => {
    const out = toCompleteProfileResponse(user, null, undefined);
    expect(out).toEqual({
      ...user,
      personalData: undefined,
      preferences: undefined,
    });
  });

  it("copia só os campos declarados (nada além do contrato vaza)", () => {
    const out = toCompleteProfileResponse(
      user,
      { gender: "F", birthDate: "2001-01-01", secretoExtra: "x" } as never,
      { favoriteColor: "azul", interno: "y" } as never,
    );
    expect(out.personalData).toMatchObject({
      gender: "F",
      birthDate: "2001-01-01",
    });
    expect(out.personalData).not.toHaveProperty("secretoExtra");
    expect(out.preferences).toMatchObject({ favoriteColor: "azul" });
    expect(out.preferences).not.toHaveProperty("interno");
  });
});
