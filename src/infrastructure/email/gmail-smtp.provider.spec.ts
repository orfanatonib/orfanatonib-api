import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ProcessException } from '../../common/exceptions';
import {
  EMAIL_CONFIG_KEYS,
  EMAIL_DEFAULTS,
  GMAIL_SMTP_CONFIG,
} from './email.constants';
import {
  GmailSmtpTransportOptions,
  SmtpMailOptions,
  SmtpTransport,
} from './email.types';
import { GmailSmtpProvider } from './gmail-smtp.provider';
import { GmailSmtpTransportFactory } from './gmail-smtp-transport.factory';

describe('GmailSmtpProvider', () => {
  const configValues: Record<string, string> = {
    [EMAIL_CONFIG_KEYS.GMAIL_USER]: 'sender@gmail.com',
    [EMAIL_CONFIG_KEYS.GMAIL_APP_PASSWORD]: 'test-app-password',
  };
  const sendMail = jest.fn(
    async (_message: SmtpMailOptions): Promise<unknown> => undefined,
  );
  const transport: SmtpTransport = { sendMail };
  const createTransport = jest.fn(
    (_options: GmailSmtpTransportOptions): SmtpTransport => transport,
  );
  const configService = {
    get: jest.fn((key: string): string | undefined => configValues[key]),
    getOrThrow: jest.fn((key: string): string => {
      const value = configValues[key];
      if (value === undefined) {
        throw new Error(`Missing config: ${key}`);
      }
      return value;
    }),
  };
  const transportFactory = { create: createTransport };
  let provider: GmailSmtpProvider;

  beforeEach(async () => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue(undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        GmailSmtpProvider,
        { provide: ConfigService, useValue: configService },
        { provide: GmailSmtpTransportFactory, useValue: transportFactory },
      ],
    }).compile();

    provider = moduleRef.get(GmailSmtpProvider);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('creates a secure Gmail transporter and sends the message', async () => {
    await provider.send({
      to: 'recipient@example.com',
      subject: 'Assunto',
      text: 'Conteúdo',
      html: '<p>Conteúdo</p>',
    });

    expect(createTransport).toHaveBeenCalledWith({
      host: GMAIL_SMTP_CONFIG.HOST,
      port: GMAIL_SMTP_CONFIG.PORT,
      secure: true,
      auth: {
        user: configValues[EMAIL_CONFIG_KEYS.GMAIL_USER],
        pass: configValues[EMAIL_CONFIG_KEYS.GMAIL_APP_PASSWORD],
      },
      connectionTimeout: GMAIL_SMTP_CONFIG.CONNECTION_TIMEOUT_MS,
      greetingTimeout: GMAIL_SMTP_CONFIG.GREETING_TIMEOUT_MS,
      socketTimeout: GMAIL_SMTP_CONFIG.SOCKET_TIMEOUT_MS,
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: {
        name: EMAIL_DEFAULTS.FROM_NAME,
        address: configValues[EMAIL_CONFIG_KEYS.GMAIL_USER],
      },
      to: 'recipient@example.com',
      subject: 'Assunto',
      text: 'Conteúdo',
      html: '<p>Conteúdo</p>',
    });
  });

  it('retries a transient SMTP failure and then succeeds', async () => {
    jest.useFakeTimers();
    sendMail
      .mockRejectedValueOnce({ name: 'Error', code: 'ETIMEDOUT' })
      .mockResolvedValueOnce(undefined);

    const delivery = provider.send({
      to: 'recipient@example.com',
      subject: 'Assunto',
      text: 'Conteúdo',
    });
    await jest.runAllTimersAsync();

    await expect(delivery).resolves.toBeUndefined();
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('translates an exhausted timeout into a process exception', async () => {
    jest.useFakeTimers();
    sendMail.mockRejectedValue({ name: 'Error', code: 'ETIMEDOUT' });

    const delivery = provider.send({
      to: 'recipient@example.com',
      subject: 'Assunto',
      text: 'Conteúdo',
    });
    const expectation = expect(delivery).rejects.toBeInstanceOf(ProcessException);
    await jest.runAllTimersAsync();

    await expectation;
    expect(sendMail).toHaveBeenCalledTimes(GMAIL_SMTP_CONFIG.MAX_ATTEMPTS);
  });

  it('does not retry a permanent authentication failure', async () => {
    sendMail.mockRejectedValue({
      name: 'Error',
      code: 'EAUTH',
      responseCode: 535,
    });

    await expect(
      provider.send({
        to: 'recipient@example.com',
        subject: 'Assunto',
        text: 'Conteúdo',
      }),
    ).rejects.toBeInstanceOf(ProcessException);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
