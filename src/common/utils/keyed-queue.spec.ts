import { KeyedQueue } from "./keyed-queue";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("KeyedQueue", () => {
  it("tarefas da mesma chave rodam em série, na ordem de chegada", async () => {
    const queue = new KeyedQueue();
    const log: string[] = [];
    const task = (name: string, ms: number) => async () => {
      log.push(`${name}:inicio`);
      await delay(ms);
      log.push(`${name}:fim`);
    };
    await Promise.all([
      queue.run("u1", task("a", 20)),
      queue.run("u1", task("b", 1)),
    ]);
    expect(log).toEqual(["a:inicio", "a:fim", "b:inicio", "b:fim"]);
  });

  it("chaves diferentes não esperam uma pela outra", async () => {
    const queue = new KeyedQueue();
    const log: string[] = [];
    await Promise.all([
      queue.run("u1", async () => {
        await delay(20);
        log.push("lenta");
      }),
      queue.run("u2", () => {
        log.push("rapida");
        return Promise.resolve();
      }),
    ]);
    expect(log).toEqual(["rapida", "lenta"]);
  });

  it("a falha de uma tarefa propaga a ela e NÃO trava a próxima", async () => {
    const queue = new KeyedQueue();
    const falha = queue.run("u1", () => Promise.reject(new Error("boom")));
    const ok = queue.run("u1", () => Promise.resolve("ok"));
    await expect(falha).rejects.toThrow("boom");
    await expect(ok).resolves.toBe("ok");
  });
});
