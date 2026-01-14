import { Injectable, UnauthorizedException, Logger, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { CreateUserService } from 'src/core/user/services/create-user.service';
import { UserEntity } from 'src/core/user/entities/user.entity';
import { OAuth2Client } from 'google-auth-library';
import { UserRepository } from 'src/core/user/user.repository';
import { GetUsersService } from 'src/core/user/services/get-user.service';
import { UpdateUserService } from 'src/core/user/services/update-user.service';
import { AuthRepository } from '../auth.repository';
import { CompleteUserDto } from '../dto/complete-register.dto';
import { RegisterUserDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { UserRole } from '../auth.types';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { PersonalDataRepository } from 'src/core/profile/repositories/personal-data.repository';
import { UserPreferencesRepository } from 'src/core/profile/repositories/user-preferences.repository';
import { SesIdentityService } from 'src/infrastructure/aws/ses-identity.service';
import { EmailService } from 'src/infrastructure/aws/email.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import * as crypto from 'crypto';
import { EmailTemplateGenerator } from 'src/shared/email-template-generator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly createUserService: CreateUserService,
    private readonly updateUserService: UpdateUserService,
    private readonly getUsersService: GetUsersService,
    private readonly userRepo: UserRepository,
    private readonly mediaItemProcessor: MediaItemProcessor,
    @Inject(forwardRef(() => PersonalDataRepository))
    private readonly personalDataRepository: PersonalDataRepository,
    @Inject(forwardRef(() => UserPreferencesRepository))
    private readonly userPreferencesRepository: UserPreferencesRepository,
    private readonly sesIdentityService: SesIdentityService,
    private readonly emailService: EmailService,
    private readonly passwordResetTokenRepo: PasswordResetTokenRepository,
  ) {
    this.googleClient = new OAuth2Client(
      configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
    );
  }

  private generateTokens(user: UserEntity) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN') as any,
    });

    return { accessToken, refreshToken };
  }

  async login({ email, password }: LoginDto) {
    const user = await this.authRepo.validateUser(email, password);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sesVerification = await this.sesIdentityService.checkAndResendSesVerification(email);

    if (!user.active) {
      return {
        message: 'User is inactive. Please verify your email to activate your account.',
        user: this.buildUserResponse(user),
        emailVerification: {
          verificationEmailSent: sesVerification.verificationEmailSent,
          message: sesVerification.verificationEmailSent
            ? 'Um email de verificação foi enviado para o seu endereço. Por favor, verifique sua caixa de entrada.'
            : sesVerification.alreadyVerified
              ? 'Email já verificado.'
              : undefined,
        },
      };
    }

    const tokens = this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Login successful',
      user: this.buildUserResponse(user),
      ...tokens,
      emailVerification: {
        verificationEmailSent: sesVerification.verificationEmailSent,
        message: sesVerification.verificationEmailSent
          ? 'Um email de verificação foi enviado para o seu endereço. Por favor, verifique sua caixa de entrada.'
          : sesVerification.alreadyVerified
            ? 'Email já verificado.'
            : undefined,
      },
    };
  }

  async googleLogin(token: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload?.email || !payload?.name) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      const { email, name } = payload;
      let user = await this.getUsersService.findByEmail(email);

      if (!user) {
        user = await this.createUserService.create({
          email,
          name,
          password: '',
          phone: '',
          active: false,
          completed: false,
          commonUser: false,
          role: UserRole.MEMBER,
        });

        const sesVerification = await this.sesIdentityService.verifyEmailIdentitySES(email);

        return {
          email,
          name,
          completed: user.completed,
          commonUser: user.commonUser,
          newUser: true,
          emailVerification: {
            verificationEmailSent: sesVerification.verificationEmailSent,
            message: sesVerification.verificationEmailSent
              ? 'Um email de verificação foi enviado para o seu endereço. Por favor, verifique sua caixa de entrada.'
              : undefined,
          },
        };
      }

      if (!user.completed) {
        const sesVerification = await this.sesIdentityService.checkAndResendSesVerification(email);
        return {
          email,
          name,
          completed: false,
          commonUser: user.commonUser,
          newUser: true,
          emailVerification: {
            verificationEmailSent: sesVerification.verificationEmailSent,
            message: sesVerification.verificationEmailSent
              ? 'Um email de verificação foi enviado para o seu endereço. Por favor, verifique sua caixa de entrada.'
              : undefined,
          },
        };
      }

      if (!(user as any).active) {
        const sesVerification = await this.sesIdentityService.checkAndResendSesVerification(email);
        return {
          message: 'User is inactive',
          active: false,
          completed: user.completed,
          commonUser: user.commonUser,
          newUser: false,
          emailVerification: {
            verificationEmailSent: sesVerification.verificationEmailSent,
            message: sesVerification.verificationEmailSent
              ? 'Um email de verificação foi enviado para o seu endereço. Por favor, verifique sua caixa de entrada.'
              : undefined,
          },
        };
      }

      const sesVerification = await this.sesIdentityService.checkAndResendSesVerification(email);

      const tokens = this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        message: 'Login successful',
        isNewUser: false,
        user: this.buildUserResponse(user),
        ...tokens,
        emailVerification: {
          verificationEmailSent: sesVerification.verificationEmailSent,
          message: sesVerification.verificationEmailSent
            ? 'Um email de verificação foi enviado para o seu endereço. Por favor, verifique sua caixa de entrada.'
            : sesVerification.alreadyVerified
              ? 'Email já verificado.'
              : undefined,
        },
      };
    } catch (error) {
      this.logger.error(`Error during Google login: ${error.message}`, error.stack);

      if (error.message?.includes('Token used too late') || error.message?.includes('expired')) {
        throw new UnauthorizedException('Google authentication token has expired. Please try signing in again.');
      }

      if (error.message?.includes('Invalid token')) {
        throw new UnauthorizedException('Invalid Google authentication token. Please try signing in again.');
      }

      throw new UnauthorizedException('Google authentication failed. Please try signing in with Google again.');
    }
  }

  async refreshToken(token: string) {
    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.getUsersService.findOne(payload.sub);
      if (!user || user.refreshToken !== token) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.updateRefreshToken(userId, null);
    return { message: 'User logged out' };
  }

  private buildMeResponse(user: UserEntity, imageMedia?: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      active: user.active,
      completed: user.completed,
      commonUser: user.commonUser,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: user.role,
      image: imageMedia ? {
        id: imageMedia.id,
        title: imageMedia.title,
        description: imageMedia.description,
        url: imageMedia.url,
        uploadType: imageMedia.uploadType,
        mediaType: imageMedia.mediaType,
        isLocalFile: imageMedia.isLocalFile,
        platformType: imageMedia.platformType,
        originalName: imageMedia.originalName,
        size: imageMedia.size,
        createdAt: imageMedia.createdAt,
        updatedAt: imageMedia.updatedAt,
      } : null,
      memberProfile: user.memberProfile
        ? {
          id: user.memberProfile.id,
          active: user.memberProfile.active,
          createdAt: user.memberProfile.createdAt,
          updatedAt: user.memberProfile.updatedAt,
          team: user.memberProfile.team
            ? {
              id: user.memberProfile.team.id,
              numberTeam: user.memberProfile.team.numberTeam,
              description: user.memberProfile.team.description,
              createdAt: user.memberProfile.team.createdAt,
              updatedAt: user.memberProfile.team.updatedAt,
              shelter: user.memberProfile.team.shelter
                ? {
                  id: user.memberProfile.team.shelter.id,
                  name: user.memberProfile.team.shelter.name,
                  description: user.memberProfile.team.shelter.description,
                  teamsQuantity: user.memberProfile.team.shelter.teamsQuantity,
                  createdAt: user.memberProfile.team.shelter.createdAt,
                  updatedAt: user.memberProfile.team.shelter.updatedAt,
                  address: user.memberProfile.team.shelter.address
                    ? {
                      id: user.memberProfile.team.shelter.address.id,
                      street: user.memberProfile.team.shelter.address.street,
                      number: user.memberProfile.team.shelter.address.number,
                      district: user.memberProfile.team.shelter.address.district,
                      city: user.memberProfile.team.shelter.address.city,
                      state: user.memberProfile.team.shelter.address.state,
                      postalCode: user.memberProfile.team.shelter.address.postalCode,
                      createdAt: user.memberProfile.team.shelter.address.createdAt,
                      updatedAt: user.memberProfile.team.shelter.address.updatedAt,
                    }
                    : null,
                }
                : null,
            }
            : null,
        }
        : null,
      leaderProfile: user.leaderProfile
        ? {
          id: user.leaderProfile.id,
          active: user.leaderProfile.active,
          createdAt: user.leaderProfile.createdAt,
          updatedAt: user.leaderProfile.updatedAt,
          teams: user.leaderProfile.teams && user.leaderProfile.teams.length > 0
            ? user.leaderProfile.teams.map(team => ({
              id: team.id,
              numberTeam: team.numberTeam,
              description: team.description,
              createdAt: team.createdAt,
              updatedAt: team.updatedAt,
              shelter: team.shelter
                ? {
                  id: team.shelter.id,
                  name: team.shelter.name,
                  description: team.shelter.description,
                  teamsQuantity: team.shelter.teamsQuantity,
                  createdAt: team.shelter.createdAt,
                  updatedAt: team.shelter.updatedAt,
                  address: team.shelter.address
                    ? {
                      id: team.shelter.address.id,
                      street: team.shelter.address.street,
                      number: team.shelter.address.number,
                      district: team.shelter.address.district,
                      city: team.shelter.address.city,
                      state: team.shelter.address.state,
                      postalCode: team.shelter.address.postalCode,
                      createdAt: team.shelter.address.createdAt,
                      updatedAt: team.shelter.address.updatedAt,
                    }
                    : null,
                }
                : null,
            }))
            : [],
        }
        : null,
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findByIdWithProfiles(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const imageMedia = await this.mediaItemProcessor.findMediaItemByTarget(
      userId,
      'UserEntity',
    );

    const personalData = await this.personalDataRepository.findByUserId(userId);
    const preferences = await this.userPreferencesRepository.findByUserId(userId);

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      commonUser: user.commonUser,
      image: imageMedia ? {
        id: imageMedia.id,
        title: imageMedia.title,
        description: imageMedia.description,
        url: imageMedia.url,
        uploadType: imageMedia.uploadType,
        mediaType: imageMedia.mediaType,
        isLocalFile: imageMedia.isLocalFile,
        platformType: imageMedia.platformType,
        originalName: imageMedia.originalName,
        size: imageMedia.size,
        createdAt: imageMedia.createdAt,
        updatedAt: imageMedia.updatedAt,
      } : null,
      personalData: personalData ? {
        birthDate: personalData.birthDate
          ? (personalData.birthDate instanceof Date
            ? personalData.birthDate.toISOString().split('T')[0]
            : String(personalData.birthDate).split('T')[0])
          : undefined,
        gender: personalData.gender,
        gaLeaderName: personalData.gaLeaderName,
        gaLeaderContact: personalData.gaLeaderContact,
      } : undefined,
      preferences: preferences ? {
        loveLanguages: preferences.loveLanguages,
        temperaments: preferences.temperaments,
        favoriteColor: preferences.favoriteColor,
        favoriteFood: preferences.favoriteFood,
        favoriteMusic: preferences.favoriteMusic,
        whatMakesYouSmile: preferences.whatMakesYouSmile,
        skillsAndTalents: preferences.skillsAndTalents,
      } : undefined,
    };
  }

  async completeRegister(data: CompleteUserDto) {
    const user = await this.getUsersService.findByEmail(data.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.completed) {
      throw new NotFoundException('User already completed registration');
    }

    await this.updateUserService.update(user.id, {
      name: data.name,
      phone: data.phone,
      password: data.password,
      completed: true,
      role: data.role,
    });

    const sesVerification = await this.sesIdentityService.verifyEmailIdentitySES(data.email);

    return {
      message: 'Registration completed successfully',
      emailVerification: {
        verificationEmailSent: sesVerification.verificationEmailSent,
        message: sesVerification.verificationEmailSent
          ? 'Um email de verificação foi enviado para o seu endereço. Por favor, verifique sua caixa de entrada.'
          : undefined,
      },
    };
  }

  async register(data: RegisterUserDto) {
    const existingUser = await this.getUsersService.findByEmail(data.email);
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const user = await this.createUserService.create({
      email: data.email,
      name: data.name,
      password: data.password,
      phone: data.phone,
      active: false,
      completed: true,
      commonUser: true,
      role: data.role,
    });

    const sesVerification = await this.sesIdentityService.verifyEmailIdentitySES(data.email);

    return {
      message: 'Registration successful',
      user: this.buildUserResponse(user),
      emailVerification: {
        verificationEmailSent: sesVerification.verificationEmailSent,
        message: sesVerification.verificationEmailSent
          ? 'Um email de verificação foi enviado para o seu endereço. Por favor, verifique sua caixa de entrada para completar o cadastro.'
          : undefined,
      },
    };
  }

  async forgotPassword(data: ForgotPasswordDto) {
    const user = await this.getUsersService.findByEmail(data.email);
    if (!user) {
      return { message: 'Se o email existir, as instruções foram enviadas.' };
    }

    const sesCheck = await this.sesIdentityService.checkAndResendSesVerification(user.email);

    if (sesCheck.verificationEmailSent || !sesCheck.alreadyVerified) {
      return {
        status: 'VERIFICATION_EMAIL_SENT',
        message: 'Seu email ainda não foi verificado na AWS. Um novo email de verificação foi enviado.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    await this.passwordResetTokenRepo.invalidateTokensForUser(user.id);
    await this.passwordResetTokenRepo.createToken(user.id, resetToken, expiresAt);

    const env = process.env.ENVIRONMENT || 'local';
    let baseUrl = 'http://localhost:5173';

    if (env === 'prod' || env === 'production') {
      baseUrl = 'https://www.orfanatonib.com';
    } else if (env === 'staging') {
      baseUrl = 'https://staging.orfanatonib.com';
    }

    const resetLink = `${baseUrl}/recuperar-senha/${resetToken}`;

    const emailHtml = EmailTemplateGenerator.generate(
      'Recuperação de Senha',
      user.name,
      `<p>Recebemos uma solicitação para redefinir sua senha.</p>
       <p>Clique no botão abaixo para criar uma nova senha:</p>
       <div style="text-align: center; margin: 30px 0;">
         <a href="${resetLink}" class="button" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir Senha</a>
       </div>
       <p style="font-size: 14px; color: #666;">Ou copie e cole o link abaixo no seu navegador:</p>
       <p style="font-size: 12px; color: #4F46E5; word-break: break-all;">${resetLink}</p>
       <p>Este link é válido por 30 minutos.</p>`
    );

    await this.emailService.sendEmailViaSES(
      user.email,
      'Recuperação de Senha - Orfanatos NIB',
      `Olá ${user.name},\n\nRecebemos uma solicitação para redefinir sua senha.\nClique no link abaixo: \n${resetLink}`,
      emailHtml
    );

    return {
      status: 'RESET_LINK_SENT',
      message: 'Se o email existir, as instruções foram enviadas.'
    };
  }

  async validateResetToken(token: string) {
    const validToken = await this.passwordResetTokenRepo.findValidToken(token);
    if (!validToken) {
      throw new BadRequestException('Token inválido ou expirado.');
    }
    return { valid: true, email: validToken.user.email };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const validToken = await this.passwordResetTokenRepo.findValidToken(dto.token);
    if (!validToken) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

    const user = validToken.user;

    await this.updateUserService.update(user.id, {
      password: dto.newPassword,
    });

    await this.passwordResetTokenRepo.deleteToken(dto.token);

    const emailHtml = EmailTemplateGenerator.generate(
      'Senha Alterada',
      user.name,
      `<p>Sua senha foi alterada com sucesso.</p>
       <p>Agora você pode acessar sua conta com a nova senha.</p>
       <div style="text-align: center; margin: 30px 0;">
         <a href="https://orfanatonib.com.br" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Acessar Plataforma</a>
       </div>`
    );

    await this.emailService.sendEmailViaSES(
      user.email,
      'Senha Alterada com Sucesso - Orfanatos NIB',
      `Olá ${user.name},\n\nSua senha foi alterada com sucesso.`,
      emailHtml
    );

    return { message: 'Senha alterada com sucesso.' };
  }

  private buildUserResponse(user: UserEntity): Partial<UserEntity> {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      active: user.active,
      completed: user.completed,
      commonUser: user.commonUser,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: user.role,
    };
  }

  async updateRefreshToken(userId: string, token: string | null): Promise<void> {
    await this.userRepo.updateRefreshToken(userId, token);
  }
}
