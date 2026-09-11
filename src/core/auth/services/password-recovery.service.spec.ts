import { Test } from '@nestjs/testing';
import { NotificationService } from '../../../communication/notification/notification.service';
import { GetUsersService } from '../../user/services/get-user.service';
import { UpdateUserService } from '../../user/services/update-user.service';
import { PasswordRecoveryStatus } from '../constants/password-recovery.constants';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import { PasswordRecoveryService } from './password-recovery.service';

describe('PasswordRecoveryService', () => {
  const user = {
    id: 'user-id',
    email: 'user@example.com',
    name: 'Maria',
  };
  const findByEmail = jest.fn(async (_email: string) => user);
  const update = jest.fn(async (): Promise<void> => undefined);
  const sendPasswordResetEmail = jest.fn(
    async (
      _email: string,
      _name: string,
      _token: string,
    ): Promise<void> => undefined,
  );
  const sendPasswordChangedEmail = jest.fn(
    async (_email: string, _name: string): Promise<void> => undefined,
  );
  const invalidateTokensForUser = jest.fn(
    async (_userId: string): Promise<void> => undefined,
  );
  const createToken = jest.fn(
    async (_userId: string, _token: string, _expiresAt: Date) => ({
      id: 'token-id',
    }),
  );
  const findValidToken = jest.fn();
  const deleteToken = jest.fn(async (_token: string): Promise<void> => undefined);
  let service: PasswordRecoveryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    findByEmail.mockResolvedValue(user);

    const moduleRef = await Test.createTestingModule({
      providers: [
        PasswordRecoveryService,
        { provide: GetUsersService, useValue: { findByEmail } },
        { provide: UpdateUserService, useValue: { update } },
        {
          provide: NotificationService,
          useValue: { sendPasswordResetEmail, sendPasswordChangedEmail },
        },
        {
          provide: PasswordResetTokenRepository,
          useValue: {
            invalidateTokensForUser,
            createToken,
            findValidToken,
            deleteToken,
          },
        },
      ],
    }).compile();

    service = moduleRef.get(PasswordRecoveryService);
  });

  it('creates a reset token and sends it directly without provider identity checks', async () => {
    const result = await service.forgotPassword({ email: user.email });

    expect(invalidateTokensForUser).toHaveBeenCalledWith(user.id);
    expect(createToken).toHaveBeenCalledWith(
      user.id,
      expect.any(String),
      expect.any(Date),
    );
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      user.email,
      user.name,
      expect.any(String),
    );
    expect(result.status).toBe(PasswordRecoveryStatus.RESET_LINK_SENT);
  });
});
