import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './services/auth.service';
import { AuthContextService } from './services/auth-context.service';
import { UserModule } from 'src/user/user.module';
import { MediaModule } from 'src/share/media/media.module';

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
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthContextService, AuthRepository, JwtStrategy],
  exports: [
    AuthService,
    AuthContextService,
    JwtModule,
    PassportModule,
    JwtStrategy,
  ],
})
export class AuthModule {}
