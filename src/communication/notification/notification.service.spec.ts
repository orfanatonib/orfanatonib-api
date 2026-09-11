import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ProcessException } from '../../common/exceptions';
import { EventAction } from '../../content/event/constants/event-notification.constants';
import { EmailService } from '../../infrastructure/email/email.service';
import { EmailMessage } from '../../infrastructure/email/email.types';
import { TwilioService } from '../../infrastructure/twilio/twilio.service';
import { ContactEntity } from '../contact/contact.entity';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const dispatch = jest.fn(
    async (_message: EmailMessage): Promise<void> => undefined,
  );
  const sendWhatsAppMessage = jest.fn(
    async (_from: string, _to: string, _message: string): Promise<void> =>
      undefined,
  );
  const configValues: Record<string, string> = {
    ENVIRONMENT: 'local',
  };
  const getConfig = jest.fn(
    (key: string): string | undefined => configValues[key],
  );
  let service: NotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    dispatch.mockResolvedValue(undefined);
    sendWhatsAppMessage.mockResolvedValue(undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: EmailService, useValue: { dispatch } },
        { provide: TwilioService, useValue: { sendWhatsAppMessage } },
        { provide: ConfigService, useValue: { get: getConfig } },
      ],
    }).compile();

    service = moduleRef.get(NotificationService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('routes a password reset email through EmailService.dispatch', async () => {
    await service.sendPasswordResetEmail(
      'user@example.com',
      'Maria',
      'reset-token',
    );

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Recuperação de Senha - Orfanatos NIB',
        text: expect.stringContaining(
          'http://localhost:5173/recuperar-senha/reset-token',
        ),
        html: expect.stringContaining(
          'http://localhost:5173/recuperar-senha/reset-token',
        ),
      }),
    );
  });

  it('preserves the provider process exception for mandatory email delivery', async () => {
    const deliveryError = new ProcessException('Falha de entrega');
    dispatch.mockRejectedValue(deliveryError);

    await expect(
      service.sendPasswordChangedEmail('user@example.com', 'Maria'),
    ).rejects.toBe(deliveryError);
  });

  it('continues event delivery when one recipient fails', async () => {
    jest.useFakeTimers();
    dispatch
      .mockRejectedValueOnce(new ProcessException('Falha de entrega'))
      .mockResolvedValueOnce(undefined);

    const delivery = service.sendEventNotification(
      {
        title: 'Encontro',
        date: '2026-09-12T19:00:00.000Z',
      },
      EventAction.CREATED,
      ['first@example.com', 'second@example.com'],
    );
    await jest.runAllTimersAsync();
    await delivery;

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ to: 'second@example.com' }),
    );
  });

  it('sends contact email to each recipient and keeps WhatsApp optional', async () => {
    const contact = new ContactEntity();
    contact.name = 'Maria';
    contact.email = 'maria@example.com';
    contact.phone = '5592999999999';
    contact.message = 'Quero ajudar';
    contact.read = false;

    await service.sendContactNotification(contact, [
      'first-admin@example.com',
      'second-admin@example.com',
    ]);

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });
});
