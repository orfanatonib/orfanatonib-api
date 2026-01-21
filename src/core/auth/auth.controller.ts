import { Controller, Post, Body, Request, UseGuards, Get, Logger } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterUserDto } from './dto/register.dto';
import { CompleteUserDto } from './dto/complete-register.dto';
import { AuthService } from './services/auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Query } from '@nestjs/common';
import { PasswordRecoveryService } from './services/password-recovery.service';
import { AuthLogs } from './constants/auth.constants';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) { }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    this.logger.log(AuthLogs.LOGIN_ATTEMPT);
    const result = await this.authService.login(dto);
    this.logger.log(AuthLogs.LOGIN_SUCCESS);
    return result;
  }

  @Post('google')
  async googleLogin(@Body() body: { token: string }) {
    this.logger.log(AuthLogs.GOOGLE_LOGIN_ATTEMPT);
    const result = await this.authService.googleLogin(body.token);
    this.logger.log(AuthLogs.GOOGLE_LOGIN_SUCCESS);
    return result;
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    this.logger.log(AuthLogs.TOKEN_REFRESH_ATTEMPT);
    const result = await this.authService.refreshToken(body.refreshToken);
    this.logger.log(AuthLogs.TOKEN_REFRESH_SUCCESS);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req) {
    this.logger.log(AuthLogs.LOGOUT(req.user.userId));
    const result = await this.authService.logout(req.user.userId);
    this.logger.log(AuthLogs.LOGOUT_SUCCESS(req.user.userId));
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req) {
    return this.authService.getMe(req.user.userId);
  }

  @Post('complete-register')
  async completeRegister(@Body() data: CompleteUserDto) {
    this.logger.log(AuthLogs.COMPLETE_REGISTRATION_ATTEMPT);
    const result = await this.authService.completeRegister(data);
    this.logger.log(AuthLogs.COMPLETE_REGISTRATION_SUCCESS);
    return result;
  }

  @Post('register')
  async register(@Body() data: RegisterUserDto) {
    this.logger.log(AuthLogs.REGISTRATION_ATTEMPT);
    const result = await this.authService.register(data);
    this.logger.log(AuthLogs.REGISTRATION_SUCCESS);
    return result;
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    this.logger.log(`Password reset requested for: ${dto.email}`);
    const result = await this.passwordRecoveryService.forgotPassword(dto);
    this.logger.log(`Password reset processed for: ${dto.email}`);
    return result;
  }

  @Get('reset-password/validate')
  async validateResetToken(@Query('token') token: string) {
    this.logger.log(`Validating reset token`);
    return this.passwordRecoveryService.validateResetToken(token);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    this.logger.log(`Resetting password with token`);
    return this.passwordRecoveryService.resetPassword(dto);
  }
}
