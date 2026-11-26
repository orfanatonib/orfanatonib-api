/**
 * Forma que o `authSlice` do frontend já consome em `LoginResponse` e na
 * resposta do cadastro.
 */
export class EmailVerificationStatusDto {
  verificationEmailSent!: boolean;
  message?: string;
}

export class VerifyEmailResultDto {
  verified!: boolean;
  email!: string;
  message!: string;
}
