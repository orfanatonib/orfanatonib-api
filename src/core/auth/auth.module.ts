import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './services/auth.service';
import { AuthContextService } from './services/auth-context.service';
import { UserModule } from '../user/user.module';
import { MediaModule } from '../../shared/media/media.module';
import { AwsModule } from '../../infrastructure/aws/aws.module';
import { NotificationModule } from '../../communication/notification/notification.module';

import { PasswordResetTokenRepository } from './repositories/password-reset-token.repository';
import { PasswordRecoveryService } from './services/password-recovery.service';
import { MemberProfilesModule } from 'src/shelter/member-profile/member-profiles.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN') as any,
        },
      }),
    }),
    forwardRef(() => UserModule),
    MediaModule,
    forwardRef(() => require('../profile/profile.module').ProfileModule),
    AwsModule,
    NotificationModule,
    forwardRef(() => MemberProfilesModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthContextService, AuthRepository, JwtStrategy, PasswordResetTokenRepository, PasswordRecoveryService],
  exports: [
    AuthService,
    AuthContextService,
    JwtModule,
    PassportModule,
    JwtStrategy,
    PasswordRecoveryService
  ],
})
export class AuthModule { }
