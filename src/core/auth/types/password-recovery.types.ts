import { PasswordRecoveryStatus } from '../constants/password-recovery.constants';

export interface PasswordRecoveryResponse {
  readonly status: PasswordRecoveryStatus;
  readonly message: string;
}

export interface ValidateResetTokenResponse {
  readonly valid: true;
  readonly email: string;
}

export interface ResetPasswordResponse {
  readonly message: string;
}
