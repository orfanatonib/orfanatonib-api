import { INestApplication, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { DataSource } from "typeorm";

import { HealthController } from "./common/controllers/health.controller";
import { GlobalExceptionFilter } from "./common/filters";
import { RequestContextModule } from "./core/request-context";
import { createCorsOptions } from "./config/cors.config";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    RequestContextModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: DataSource,
      useValue: { query: jest.fn().mockResolvedValue([]) },
    },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
class BootModule {}

describe("bootstrap (DI do filtro/interceptor, health e CORS)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [BootModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableCors(createCorsOptions(["https://app.exemplo.com"]));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health responde ok e traz X-Request-ID do interceptor global", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .expect(200);
    expect((response.body as { status: string }).status).toBe("ok");
    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("GET /health/ready responde 200 com banco disponível", async () => {
    await request(app.getHttpServer()).get("/health/ready").expect(200);
  });

  it("rota inexistente passa pelo filtro global (corpo no contrato de erro)", async () => {
    const response = await request(app.getHttpServer())
      .get("/nao-existe")
      .expect(404);
    expect(response.body).toHaveProperty("statusCode", 404);
    expect(response.body).toHaveProperty("category");
    // O id do corpo de erro é o mesmo devolvido no cabeçalho (antes era "unknown").
    expect((response.body as { requestId: string }).requestId).toBe(
      response.headers["x-request-id"],
    );
  });

  it("CORS: origem permitida recebe o cabeçalho; origem estranha não", async () => {
    const ok = await request(app.getHttpServer())
      .get("/health")
      .set("Origin", "https://app.exemplo.com");
    expect(ok.headers["access-control-allow-origin"]).toBe(
      "https://app.exemplo.com",
    );
    const bad = await request(app.getHttpServer())
      .get("/health")
      .set("Origin", "https://malicioso.com");
    expect(bad.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
