import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedRequest } from "./auth.types";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthLogs } from "./constants/auth.constants";

import { LoginService } from "./services/login.service";
import { GoogleLoginService } from "./services/google-login.service";
import { AuthTokenService } from "./services/auth-token.service";
import { RegisterService } from "./services/register.service";
import { GetMeService } from "./services/get-me.service";
import { EmailVerificationService } from "./services/email-verification.service";
import { PasswordRecoveryService } from "./services/password-recovery.service";

import { LoginDto } from "./dto/login.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterUserDto } from "./dto/register.dto";
import { CompleteUserDto } from "./dto/complete-register.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ResendVerificationDto, VerifyEmailDto } from "./dto/verify-email.dto";
import {
  EmailVerificationStatusDto,
  VerifyEmailResultDto,
} from "./dto/email-verification.response.dto";
import {
  AuthTokensDto,
  GoogleLoginResult,
  LoginResult,
  MessageResponseDto,
  RegisterResponseDto,
} from "./dto/auth.response.dto";
import { MeResponseDto } from "./dto/me-response.dto";
import {
  PasswordRecoveryResponse,
  ResetPasswordResponse,
  ValidateResetTokenResponse,
} from "./types/password-recovery.types";
import { FeatureFlagGuard } from "src/core/feature-flags/guards/feature-flag.guard";
import { FeatureFlag } from "src/core/feature-flags/decorators/feature-flag.decorator";
import { FeatureFlagKeys } from "src/core/feature-flags/enums/feature-flag-keys.enum";

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly loginService: LoginService,
    private readonly googleLoginService: GoogleLoginService,
    private readonly tokenService: AuthTokenService,
    private readonly registerService: RegisterService,
    private readonly getMeService: GetMeService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) {}

  @Post("login")
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    this.logger.log(AuthLogs.LOGIN_ATTEMPT);
    return this.loginService.execute(dto);
  }

  @FeatureFlag(FeatureFlagKeys.GOOGLE_LOGIN)
  @UseGuards(FeatureFlagGuard)
  @Post("google")
  googleLogin(@Body() dto: GoogleLoginDto): Promise<GoogleLoginResult> {
    this.logger.log(AuthLogs.GOOGLE_LOGIN_ATTEMPT);
    return this.googleLoginService.execute(dto.token);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensDto> {
    this.logger.log(AuthLogs.TOKEN_REFRESH_ATTEMPT);
    return this.tokenService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  logout(@Req() request: AuthenticatedRequest): Promise<MessageResponseDto> {
    const userId = request.user!.userId;
    this.logger.log(AuthLogs.LOGOUT(userId));
    return this.tokenService.logout(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMe(@Req() request: AuthenticatedRequest): Promise<MeResponseDto> {
    return this.getMeService.execute(request.user!.userId);
  }

  @FeatureFlag(FeatureFlagKeys.PUBLIC_REGISTRATION)
  @UseGuards(FeatureFlagGuard)
  @Post("register")
  register(@Body() dto: RegisterUserDto): Promise<RegisterResponseDto> {
    this.logger.log(AuthLogs.REGISTRATION_ATTEMPT);
    return this.registerService.register(dto);
  }

  @FeatureFlag(FeatureFlagKeys.PUBLIC_REGISTRATION)
  @UseGuards(FeatureFlagGuard)
  @Post("complete-register")
  completeRegister(@Body() dto: CompleteUserDto) {
    this.logger.log(AuthLogs.COMPLETE_REGISTRATION_ATTEMPT);
    return this.registerService.completeRegister(dto);
  }

  /** Confirma o e-mail a partir do token do link enviado ao usuário. */
  @Post("verify-email")
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<VerifyEmailResultDto> {
    return this.emailVerificationService.confirm(dto.token);
  }

  /**
   * Reenvia o link de confirmação. Responde igual para e-mail existente ou
   * não: quem pede não descobre quais contas existem.
   */
  @Post("resend-verification")
  resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<EmailVerificationStatusDto> {
    return this.emailVerificationService.resend(dto.email);
  }

  @FeatureFlag(FeatureFlagKeys.PASSWORD_RECOVERY)
  @UseGuards(FeatureFlagGuard)
  @Post("forgot-password")
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<PasswordRecoveryResponse> {
    return this.passwordRecoveryService.forgotPassword(dto);
  }

  @FeatureFlag(FeatureFlagKeys.PASSWORD_RECOVERY)
  @UseGuards(FeatureFlagGuard)
  @Get("reset-password/validate")
  validateResetToken(
    @Query("token") token: string,
  ): Promise<ValidateResetTokenResponse> {
    return this.passwordRecoveryService.validateResetToken(token);
  }

  @FeatureFlag(FeatureFlagKeys.PASSWORD_RECOVERY)
  @UseGuards(FeatureFlagGuard)
  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto): Promise<ResetPasswordResponse> {
    return this.passwordRecoveryService.resetPassword(dto);
  }
}
