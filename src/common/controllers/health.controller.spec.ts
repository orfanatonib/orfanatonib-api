import { ServiceUnavailableException } from "@nestjs/common";
import { DataSource } from "typeorm";

import { HealthController } from "./health.controller";
import { HealthStatus } from "./health.types";

const build = (query: jest.Mock): HealthController =>
  new HealthController({ query } as unknown as DataSource);

describe("HealthController", () => {
  it("liveness responde ok sem consultar o banco", () => {
    const query = jest.fn();
    const result = build(query).getHealth();
    expect(result.status).toBe(HealthStatus.OK);
    expect(typeof result.uptime).toBe("number");
    expect(query).not.toHaveBeenCalled();
  });

  it("liveness nunca falha por uso de memória (regressão do corte em 90% do heap)", () => {
    const spy = jest
      .spyOn(process, "memoryUsage")
      .mockReturnValue({ heapUsed: 99, heapTotal: 100 } as NodeJS.MemoryUsage);
    expect(() => build(jest.fn()).getHealth()).not.toThrow();
    spy.mockRestore();
  });

  it("readiness ok quando o banco responde", async () => {
    const query = jest.fn().mockResolvedValue([{ 1: 1 }]);
    const result = await build(query).getReadiness();
    expect(query).toHaveBeenCalledWith("SELECT 1");
    expect(result.checks.database).toBe(HealthStatus.OK);
  });

  it("readiness 503 quando o banco falha", async () => {
    const query = jest.fn().mockRejectedValue(new Error("down"));
    await expect(build(query).getReadiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("readiness 503 quando o banco passa do prazo", async () => {
    jest.useFakeTimers();
    const query = jest.fn().mockReturnValue(new Promise(() => undefined));
    const pending = build(query).getReadiness();
    const assertion = expect(pending).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await jest.advanceTimersByTimeAsync(2100);
    await assertion;
    jest.useRealTimers();
  });
});
