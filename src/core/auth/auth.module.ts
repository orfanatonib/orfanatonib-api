import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";

import { AuthContextService } from "./services/auth-context.service";
import { AuthTokenService } from "./services/auth-token.service";
import { LoginService } from "./services/login.service";
import { GoogleLoginService } from "./services/google-login.service";
import { RegisterService } from "./services/register.service";
import { GetMeService } from "./services/get-me.service";
import { PasswordRecoveryService } from "./services/password-recovery.service";
import { PasswordResetTokenRepository } from "./repositories/password-reset-token.repository";
import { EmailVerificationTokenRepository } from "./repositories/email-verification-token.repository";
import { EmailVerificationService } from "./services/email-verification.service";
import { EmailVerificationTokenEntity } from "./entities/email-verification-token.entity";

import { UserModule } from "../user/user.module";
import { ProfileModule } from "../profile/profile.module";
import { MediaModule } from "../../shared/media/media.module";
import { NotificationModule } from "../../communication/notification/notification.module";
import { MemberProfilesModule } from "src/shelter/member-profile/member-profiles.module";
import { toExpiresIn } from "./utils/auth-token.util";

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerificationTokenEntity]),
    ConfigModule,
    PassportModule.register({ defaultStrategy: "jwt", session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: toExpiresIn(config.getOrThrow<string>("JWT_EXPIRES_IN")),
        },
      }),
    }),
    forwardRef(() => UserModule),
    // Era `require('../profile/profile.module').ProfileModule` dentro do array
    // de imports — um require em runtime para driblar o ciclo. O `forwardRef`
    // é o mecanismo do próprio Nest para isso.
    forwardRef(() => ProfileModule),
    forwardRef(() => MemberProfilesModule),
    MediaModule,
    NotificationModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    AuthContextService,
    AuthTokenService,
    LoginService,
    GoogleLoginService,
    RegisterService,
    GetMeService,
    EmailVerificationService,
    PasswordRecoveryService,
    PasswordResetTokenRepository,
    EmailVerificationTokenRepository,
  ],
  exports: [
    AuthContextService,
    AuthTokenService,
    EmailVerificationService,
    PasswordRecoveryService,
    JwtModule,
    PassportModule,
    JwtStrategy,
  ],
})
export class AuthModule {}
