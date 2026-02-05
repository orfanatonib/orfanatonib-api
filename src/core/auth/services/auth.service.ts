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
import { AuthErrorMessages, AuthSuccessMessages, AuthLogs } from '../constants/auth.constants';

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
      throw new UnauthorizedException(AuthErrorMessages.INVALID_CREDENTIALS);
    }

    const sesVerification = await this.sesIdentityService.checkAndResendSesVerification(email);

    if (!user.active) {
      return {
        message: AuthSuccessMessages.USER_INACTIVE,
        user: this.buildUserResponse(user),
        emailVerification: {
          verificationEmailSent: sesVerification.verificationEmailSent,
          message: sesVerification.verificationEmailSent
            ? AuthSuccessMessages.EMAIL_VERIFICATION_SENT
            : sesVerification.alreadyVerified
              ? AuthSuccessMessages.EMAIL_ALREADY_VERIFIED
              : undefined,
        },
      };
    }

    const tokens = this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      message: AuthSuccessMessages.LOGIN_SUCCESS,
      user: this.buildUserResponse(user),
      ...tokens,
      emailVerification: {
        verificationEmailSent: sesVerification.verificationEmailSent,
        message: sesVerification.verificationEmailSent
          ? AuthSuccessMessages.EMAIL_VERIFICATION_SENT
          : sesVerification.alreadyVerified
            ? AuthSuccessMessages.EMAIL_ALREADY_VERIFIED
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
        throw new UnauthorizedException(AuthErrorMessages.INVALID_GOOGLE_TOKEN);
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
              ? AuthSuccessMessages.EMAIL_VERIFICATION_SENT
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
              ? AuthSuccessMessages.EMAIL_VERIFICATION_SENT
              : undefined,
          },
        };
      }

      if (!(user as any).active) {
        const sesVerification = await this.sesIdentityService.checkAndResendSesVerification(email);
        return {
          message: AuthErrorMessages.USER_INACTIVE,
          active: false,
          completed: user.completed,
          commonUser: user.commonUser,
          newUser: false,
          emailVerification: {
            verificationEmailSent: sesVerification.verificationEmailSent,
            message: sesVerification.verificationEmailSent
              ? AuthSuccessMessages.EMAIL_VERIFICATION_SENT
              : undefined,
          },
        };
      }

      const sesVerification = await this.sesIdentityService.checkAndResendSesVerification(email);

      const tokens = this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        message: AuthSuccessMessages.LOGIN_SUCCESS,
        isNewUser: false,
        user: this.buildUserResponse(user),
        ...tokens,
        emailVerification: {
          verificationEmailSent: sesVerification.verificationEmailSent,
          message: sesVerification.verificationEmailSent
            ? AuthSuccessMessages.EMAIL_VERIFICATION_SENT
            : sesVerification.alreadyVerified
              ? AuthSuccessMessages.EMAIL_ALREADY_VERIFIED
              : undefined,
        },
      };
    } catch (error) {
      this.logger.error(`Error during Google login: ${error.message}`, error.stack);

      if (error.message?.includes('Token used too late') || error.message?.includes('expired')) {
        throw new UnauthorizedException(AuthErrorMessages.GOOGLE_TOKEN_EXPIRED);
      }

      if (error.message?.includes('Invalid token')) {
        throw new UnauthorizedException(AuthErrorMessages.GOOGLE_TOKEN_INVALID);
      }

      throw new UnauthorizedException(AuthErrorMessages.GOOGLE_AUTH_FAILED);
    }
  }

  async refreshToken(token: string) {
    if (!token) {
      throw new UnauthorizedException(AuthErrorMessages.REFRESH_TOKEN_REQUIRED);
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.getUsersService.findOne(payload.sub);
      if (!user || user.refreshToken !== token) {
        throw new UnauthorizedException(AuthErrorMessages.INVALID_REFRESH_TOKEN);
      }

      const tokens = this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException(AuthErrorMessages.INVALID_REFRESH_TOKEN);
    }
  }

  async logout(userId: string) {
    await this.updateRefreshToken(userId, null);
    return { message: AuthSuccessMessages.LOGOUT_SUCCESS };
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
      throw new UnauthorizedException(AuthErrorMessages.USER_NOT_FOUND);
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

  async completeRegister(data: CompleteUserDto) {
    const user = await this.getUsersService.findByEmail(data.email);
    if (!user) {
      throw new NotFoundException(AuthErrorMessages.USER_NOT_FOUND);
    }

    if (user.completed) {
      throw new NotFoundException(AuthErrorMessages.USER_ALREADY_COMPLETED);
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
      message: AuthSuccessMessages.REGISTRATION_COMPLETED,
      emailVerification: {
        verificationEmailSent: sesVerification.verificationEmailSent,
        message: sesVerification.verificationEmailSent
          ? AuthSuccessMessages.EMAIL_VERIFICATION_SENT
          : undefined,
      },
    };
  }

  async register(data: RegisterUserDto) {
    const existingUser = await this.getUsersService.findByEmail(data.email);
    if (existingUser) {
      throw new UnauthorizedException(AuthErrorMessages.USER_ALREADY_EXISTS);
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
      message: AuthSuccessMessages.REGISTRATION_SUCCESS,
      user: this.buildUserResponse(user),
      emailVerification: {
        verificationEmailSent: sesVerification.verificationEmailSent,
        message: sesVerification.verificationEmailSent
          ? AuthSuccessMessages.EMAIL_VERIFICATION_COMPLETE
          : undefined,
      },
    };
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
