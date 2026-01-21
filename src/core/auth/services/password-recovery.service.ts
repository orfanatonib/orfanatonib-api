import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { GetUsersService } from '../../user/services/get-user.service';
import { UpdateUserService } from '../../user/services/update-user.service';
import { NotificationService } from '../../../communication/notification/notification.service';
import { SesIdentityService } from '../../../infrastructure/aws/ses-identity.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import {
    PasswordRecoveryStatus,
    PasswordRecoveryMessages,
    PasswordRecoveryResponse
} from '../constants/password-recovery.constants';

@Injectable()
export class PasswordRecoveryService {
    constructor(
        private getUsersService: GetUsersService,
        private updateUserService: UpdateUserService,
        private notificationService: NotificationService,
        private passwordResetTokenRepo: PasswordResetTokenRepository,
        private sesIdentityService: SesIdentityService,
    ) { }

    async forgotPassword(data: ForgotPasswordDto): Promise<PasswordRecoveryResponse> {
        const user = await this.getUsersService.findByEmail(data.email);
        if (!user) {
            throw new BadRequestException({
                status: PasswordRecoveryStatus.USER_NOT_FOUND,
                message: PasswordRecoveryMessages.USER_NOT_FOUND,
            });
        }

        const sesCheck = await this.sesIdentityService.checkAndResendSesVerification(user.email);

        if (!sesCheck.alreadyVerified) {
            return {
                status: PasswordRecoveryStatus.SES_NOT_VERIFIED,
                message: PasswordRecoveryMessages.SES_NOT_VERIFIED,
                verificationEmailSent: sesCheck.verificationEmailSent,
            };
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);

        await this.passwordResetTokenRepo.invalidateTokensForUser(user.id);
        await this.passwordResetTokenRepo.createToken(user.id, resetToken, expiresAt);

        await this.notificationService.sendPasswordResetEmail(
            user.email,
            user.name,
            resetToken,
        );

        return {
            status: PasswordRecoveryStatus.RESET_LINK_SENT,
            message: PasswordRecoveryMessages.RESET_LINK_SENT,
        };
    }

    async validateResetToken(token: string) {
        const validToken = await this.passwordResetTokenRepo.findValidToken(token);
        if (!validToken) {
            throw new BadRequestException(PasswordRecoveryMessages.TOKEN_INVALID);
        }
        return { valid: true, email: validToken.user.email };
    }

    async resetPassword(dto: ResetPasswordDto) {
        const validToken = await this.passwordResetTokenRepo.findValidToken(dto.token);
        if (!validToken) {
            throw new BadRequestException(PasswordRecoveryMessages.TOKEN_INVALID);
        }

        const user = validToken.user;

        await this.updateUserService.update(user.id, {
            password: dto.newPassword,
        });

        await this.passwordResetTokenRepo.deleteToken(dto.token);

        await this.notificationService.sendPasswordChangedEmail(
            user.email,
            user.name,
        );

        return { message: PasswordRecoveryMessages.PASSWORD_CHANGED };
    }
}
