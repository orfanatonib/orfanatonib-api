import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { GetFeatureFlagsService } from "src/core/feature-flags/services/get-feature-flags.service";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";
import { EmailDispatchService } from "./email-dispatch.service";
import { EmailOutboxService } from "../outbox/email-outbox.service";
import { EmailTemplateKey } from "../enums/email-template-key.enum";
import { OutboxEnqueueInput } from "../types";

describe("EmailDispatchService", () => {
  const outbox = { enqueue: jest.fn(), recordSkipped: jest.fn() };
  const featureFlags = { isEnabledOrDefault: jest.fn() };
  const configService = { get: jest.fn() };

  let service: EmailDispatchService;

  const dispatchReset = () =>
    service.dispatch(
      EmailTemplateKey.PASSWORD_RESET,
      {
        userName: "Maria",
        resetLink: "https://app.test/recuperar-senha/abc",
        ttlMinutes: 30,
      },
      ["maria@orfanatonib.test"],
    );

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailDispatchService,
        { provide: EmailOutboxService, useValue: outbox },
        { provide: GetFeatureFlagsService, useValue: featureFlags },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(EmailDispatchService);

    outbox.enqueue.mockResolvedValue([]);
    outbox.recordSkipped.mockResolvedValue(undefined);
    featureFlags.isEnabledOrDefault.mockResolvedValue(true);
    configService.get.mockReturnValue(undefined);
  });

  describe("dispatch", () => {
    it("renderiza o template e enfileira para o destinatário", async () => {
      await dispatchReset();

      const [input] = outbox.enqueue.mock.calls[0] as [OutboxEnqueueInput];
      expect(input.templateKey).toBe(EmailTemplateKey.PASSWORD_RESET);
      expect(input.recipients).toEqual(["maria@orfanatonib.test"]);
      expect(input.rendered.subject).toContain("Recuperação de Senha");
      expect(input.rendered.html).toContain("/recuperar-senha/abc");
    });

    it("repassa a chave de deduplicação e o agendamento", async () => {
      const scheduledFor = new Date("2027-01-01T00:00:00.000Z");

      await service.dispatch(
        EmailTemplateKey.PAGELA_REMINDER,
        {
          userName: "Maria",
          shelterName: "Abrigo",
          referenceLabel: "a visita 1",
          pendingCount: 3,
        },
        ["maria@orfanatonib.test"],
        { dedupeKey: "pagela:1", scheduledFor },
      );

      const [input] = outbox.enqueue.mock.calls[0] as [OutboxEnqueueInput];
      expect(input.dedupeKey).toBe("pagela:1");
      expect(input.scheduledFor).toBe(scheduledFor);
    });
  });

  describe("feature flags", () => {
    it("consulta a chave-mestra e a do tipo, ambas ligadas por padrão", async () => {
      await dispatchReset();

      expect(featureFlags.isEnabledOrDefault).toHaveBeenCalledWith(
        FeatureFlagKeys.EMAIL_DELIVERY,
        true,
      );
      expect(featureFlags.isEnabledOrDefault).toHaveBeenCalledWith(
        "email-password-reset",
        true,
      );
    });

    it("a chave-mestra desligada barra qualquer tipo", async () => {
      featureFlags.isEnabledOrDefault.mockImplementation((key: string) =>
        Promise.resolve(key !== String(FeatureFlagKeys.EMAIL_DELIVERY)),
      );

      await dispatchReset();

      expect(outbox.enqueue).not.toHaveBeenCalled();
      expect(outbox.recordSkipped).toHaveBeenCalledTimes(1);
    });

    it("a flag do tipo desligada barra só aquele e-mail", async () => {
      featureFlags.isEnabledOrDefault.mockImplementation((key: string) =>
        Promise.resolve(key !== "email-password-reset"),
      );

      await dispatchReset();

      expect(outbox.enqueue).not.toHaveBeenCalled();
      expect(outbox.recordSkipped).toHaveBeenCalledTimes(1);
    });

    it("o e-mail barrado fica registrado, não some", async () => {
      featureFlags.isEnabledOrDefault.mockResolvedValue(false);

      await dispatchReset();

      const [input] = outbox.recordSkipped.mock.calls[0] as [
        OutboxEnqueueInput,
      ];
      expect(input.rendered.subject).toContain("Recuperação de Senha");
    });
  });

  describe("appUrl", () => {
    it("usa APP_URL quando configurado, sem barra no fim", () => {
      configService.get.mockImplementation((key: string) =>
        key === "APP_URL" ? "https://app.test/" : undefined,
      );

      expect(service.appUrl()).toBe("https://app.test");
    });

    it.each([
      ["prod", "https://www.orfanatonib.com"],
      ["production", "https://www.orfanatonib.com"],
      ["staging", "https://staging.orfanatonib.com"],
      ["local", "http://localhost:5173"],
    ])("cai no mapa por ambiente em %s", (environment, expected) => {
      configService.get.mockImplementation((key: string) =>
        key === "ENVIRONMENT" ? environment : undefined,
      );

      expect(service.appUrl()).toBe(expected);
    });

    it("sem ambiente nenhum, assume local", () => {
      expect(service.appUrl()).toBe("http://localhost:5173");
    });
  });

  describe("logo", () => {
    it("usa APP_LOGO_URL", () => {
      configService.get.mockImplementation((key: string) =>
        key === "APP_LOGO_URL" ? "https://cdn.test/logo.png" : undefined,
      );

      expect(service.renderContext().logoUrl).toBe("https://cdn.test/logo.png");
    });

    it("aceita a variável antiga do template de contato", () => {
      configService.get.mockImplementation((key: string) =>
        key === "CONTACT_EMAIL_LOGO_URL"
          ? "https://cdn.test/antigo.png"
          : undefined,
      );

      expect(service.renderContext().logoUrl).toBe(
        "https://cdn.test/antigo.png",
      );
    });

    it("fica sem logo quando nenhuma está definida", () => {
      expect(service.renderContext().logoUrl).toBeUndefined();
    });
  });
});
