import { errorStack, validationMessage } from "./validation-message.util";

describe("validationMessage", () => {
  it("junta as restrições violadas de todos os campos", () => {
    const errors = [
      { constraints: { isString: "title deve ser texto" } },
      { constraints: { isNotEmpty: "date é obrigatório", min: "min 1" } },
    ];
    expect(validationMessage(errors, "x")).toBe(
      "title deve ser texto; date é obrigatório; min 1",
    );
  });

  it("campo sem constraints não quebra", () => {
    expect(validationMessage([{}, { constraints: { a: "b" } }], "x")).toBe("b");
  });

  it("usa a mensagem do Error e, sem ela, o texto de reserva", () => {
    expect(validationMessage(new Error("json inválido"), "reserva")).toBe(
      "json inválido",
    );
    expect(validationMessage(new Error(""), "reserva")).toBe("reserva");
    expect(validationMessage("qualquer coisa", "reserva")).toBe("reserva");
    expect(validationMessage(undefined, "reserva")).toBe("reserva");
  });
});

describe("errorStack", () => {
  it("devolve a stack só para Error", () => {
    expect(errorStack(new Error("x"))).toContain("Error: x");
    expect(errorStack("texto")).toBeUndefined();
    expect(errorStack(null)).toBeUndefined();
  });
});
