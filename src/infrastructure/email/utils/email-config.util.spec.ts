import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { ProcessException } from "src/common/exceptions";
import { EMAIL_CONFIG_KEYS } from "../email.constants";
import { GmailSmtpProvider } from "../gmail-smtp.provider";
import { GmailSmtpTransportFactory } from "../gmail-smtp-transport.factory";
import {
  getOptionalEmailConfig,
  getRequiredEmailConfig,
} from "./email-config.util";

const configWith = (values: Record<string, string | undefined>) =>
  ({
    get: (key: string): string | undefined => values[key],
    getOrThrow: (key: string): string => {
      const value = values[key];
      if (value === undefined) throw new Error(`missing ${key}`);
      return value;
    },
  }) as unknown as ConfigService;

const buildProvider = async (
  values: Record<string, string | undefined>,
  create = jest.fn(),
): Promise<GmailSmtpProvider> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      GmailSmtpProvider,
      { provide: ConfigService, useValue: configWith(values) },
      { provide: GmailSmtpTransportFactory, useValue: { create } },
    ],
  }).compile();
  moduleRef.useLogger(false);

  return moduleRef.get(GmailSmtpProvider);
};

describe("getRequiredEmailConfig / getOptionalEmailConfig", () => {
  it("reads and trims the configured value", () => {
    const config = configWith({ KEY: "  valor  " });

    expect(getRequiredEmailConfig(config, "KEY")).toBe("valor");
    expect(getOptionalEmailConfig(config, "KEY")).toBe("valor");
  });

  it.each([[undefined], [""], ["   "]])("treats %p as absent", (value) => {
    const config = configWith({ KEY: value });

    expect(getOptionalEmailConfig(config, "KEY")).toBeNull();
    expect(() => getRequiredEmailConfig(config, "KEY")).toThrow(
      "Configuração obrigatória de e-mail ausente: KEY",
    );
  });
});

describe("GmailSmtpProvider sem credencial", () => {
  const blank = {
    [EMAIL_CONFIG_KEYS.GMAIL_USER]: "   ",
    [EMAIL_CONFIG_KEYS.GMAIL_APP_PASSWORD]: "password",
  };

  /**
   * O provider lia a credencial no construtor: um ambiente sem
   * `GMAIL_SMTP_USER` — o caso de `env/prod.env` — derrubava o boot da API
   * inteira em vez de apenas não enviar e-mail.
   */
  it("é instanciado normalmente, sem derrubar a aplicação", async () => {
    const create = jest.fn();

    await expect(buildProvider(blank, create)).resolves.toBeInstanceOf(
      GmailSmtpProvider,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("reporta que não está configurado", async () => {
    const provider = await buildProvider(blank);

    expect(provider.isConfigured()).toBe(false);
  });

  it("falha só no envio, nomeando a variável que falta", async () => {
    const provider = await buildProvider(blank);

    await expect(
      provider.send({ to: "a@b.test", subject: "s", text: "t" }),
    ).rejects.toThrow(
      new ProcessException(
        `Configuração obrigatória de e-mail ausente: ${EMAIL_CONFIG_KEYS.GMAIL_USER}`,
      ),
    );
  });

  it("aponta a senha quando é ela que falta", async () => {
    const provider = await buildProvider({
      [EMAIL_CONFIG_KEYS.GMAIL_USER]: "conta@orfanatonib.test",
      [EMAIL_CONFIG_KEYS.GMAIL_APP_PASSWORD]: undefined,
    });

    await expect(
      provider.send({ to: "a@b.test", subject: "s", text: "t" }),
    ).rejects.toThrow(
      new ProcessException(
        `Configuração obrigatória de e-mail ausente: ${EMAIL_CONFIG_KEYS.GMAIL_APP_PASSWORD}`,
      ),
    );
  });
});

describe("GmailSmtpProvider com credencial", () => {
  const configured = {
    [EMAIL_CONFIG_KEYS.GMAIL_USER]: "conta@orfanatonib.test",
    [EMAIL_CONFIG_KEYS.GMAIL_APP_PASSWORD]: "senha-de-app",
    [EMAIL_CONFIG_KEYS.FROM_NAME]: "Orfanatos NIB",
  };

  it("monta o transporte na primeira necessidade e o reaproveita", async () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    const create = jest.fn().mockReturnValue({ sendMail });
    const provider = await buildProvider(configured, create);

    expect(provider.isConfigured()).toBe(true);
    expect(create).not.toHaveBeenCalled();

    await provider.send({ to: "a@b.test", subject: "s", text: "t" });
    await provider.send({ to: "c@d.test", subject: "s", text: "t" });

    expect(create).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { name: "Orfanatos NIB", address: "conta@orfanatonib.test" },
        to: "a@b.test",
      }),
    );
  });
});
