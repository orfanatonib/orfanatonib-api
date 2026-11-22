/**
 * Fila por chave: tarefas da MESMA chave rodam uma de cada vez, na ordem de chegada; chaves diferentes não esperam.
 * Serializa, por exemplo, duas trocas simultâneas da foto do mesmo usuário ou abrigo (sem isso as duas leem a foto antiga,
 * as duas enviam um objeto novo e só uma fica referenciada — a outra vira órfã no bucket).
 * Vale por processo da API; com várias instâncias seria preciso um lock no banco.
 */
export class KeyedQueue {
  private readonly tails = new Map<string, Promise<unknown>>();

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const result = previous.then(task, task);
    const tail = result.catch(() => undefined);
    this.tails.set(key, tail);
    void tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key);
    });
    return result;
  }
}
