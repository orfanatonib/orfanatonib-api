import { Injectable, Logger } from '@nestjs/common';
import { AwsSESService } from './aws-ses.service';

export interface SesVerificationResult {
  verificationEmailSent: boolean;
  alreadyVerified: boolean;
  verificationStatus?: 'Success' | 'Pending' | 'Failed' | 'TemporaryFailure' | 'NotStarted';
}

@Injectable()
export class SesIdentityService {
  private readonly logger = new Logger(SesIdentityService.name);

  constructor(private readonly awsSesService: AwsSESService) {}

  /**
   * Checa se o email está verificado no SES. Se não, reenvia email de verificação.
   * @param email - Endereço de email a ser verificado
   * @returns Informações sobre o status de verificação
   */
  async checkAndResendSesVerification(email: string): Promise<SesVerificationResult> {
    this.logger.debug(`Iniciando verificação SES para email: ${email}`);

    try {
      if (!this.awsSesService['sesClient'] || typeof this.awsSesService['sesClient'].send !== 'function') {
        this.logger.warn('Cliente SES não disponível. Pulando verificação de email.');
        return { verificationEmailSent: false, alreadyVerified: false };
      }

      const { GetIdentityVerificationAttributesCommand, VerifyEmailIdentityCommand } = await import('@aws-sdk/client-ses');

      // Checa status de verificação
      this.logger.debug(`Consultando status de verificação para: ${email}`);
      const getCommand = new GetIdentityVerificationAttributesCommand({ Identities: [email] });
      const result = await this.awsSesService['sesClient'].send(getCommand);

      const attrs = result.VerificationAttributes?.[email];
      const verificationStatus = attrs?.VerificationStatus;

      if (!attrs) {
        this.logger.debug(`Email ${email} não possui atributos de verificação. Enviando solicitação de verificação.`);
      } else {
        this.logger.debug(`Status de verificação atual para ${email}: ${verificationStatus}`);
      }

      if (!attrs || verificationStatus !== 'Success') {
        // Não verificado, reenviar email de verificação
        const verifyCommand = new VerifyEmailIdentityCommand({ EmailAddress: email });
        await this.awsSesService['sesClient'].send(verifyCommand);
        this.logger.log(`Email de verificação SES enviado com sucesso para: ${email}`);

        return {
          verificationEmailSent: true,
          alreadyVerified: false,
          verificationStatus: verificationStatus || 'NotStarted',
        };
      } else {
        this.logger.debug(`Email ${email} já está verificado no SES.`);
        return {
          verificationEmailSent: false,
          alreadyVerified: true,
          verificationStatus: 'Success',
        };
      }
    } catch (err) {
      this.logger.error(
        `Erro ao checar/reenviar verificação SES para ${email}: ${err?.message}`,
        err?.stack,
      );
      return { verificationEmailSent: false, alreadyVerified: false };
    }
  }

  /**
   * Cadastra/verifica o email no SES (usado para Google login/registro).
   * @param email - Endereço de email a ser cadastrado/verificado
   * @returns Informações sobre o envio do email de verificação
   */
  async verifyEmailIdentitySES(email: string): Promise<SesVerificationResult> {
    this.logger.debug(`Iniciando cadastro/verificação de email no SES: ${email}`);

    try {
      if (!this.awsSesService['sesClient'] || typeof this.awsSesService['sesClient'].send !== 'function') {
        this.logger.warn('Cliente SES não disponível. Pulando cadastro/verificação de email.');
        return { verificationEmailSent: false, alreadyVerified: false };
      }

      const { VerifyEmailIdentityCommand } = await import('@aws-sdk/client-ses');
      const command = new VerifyEmailIdentityCommand({ EmailAddress: email });

      await this.awsSesService['sesClient'].send(command);
      this.logger.log(`Email ${email} cadastrado/verificado com sucesso no SES.`);

      return {
        verificationEmailSent: true,
        alreadyVerified: false,
        verificationStatus: 'Pending',
      };
    } catch (err) {
      this.logger.error(
        `Erro ao cadastrar/verificar email no SES (${email}): ${err?.message}`,
        err?.stack,
      );
      return { verificationEmailSent: false, alreadyVerified: false };
    }
  }
}
