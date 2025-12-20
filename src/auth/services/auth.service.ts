import { Injectable, UnauthorizedException, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { CreateUserService } from 'src/user/services/create-user.service';
import { UserEntity } from 'src/user/user.entity';
import { OAuth2Client } from 'google-auth-library';
import { UserRepository } from 'src/user/user.repository';
import { GetUsersService } from 'src/user/services/get-user.service';
import { UpdateUserService } from 'src/user/services/update-user.service';
import { AuthRepository } from '../auth.repository';
import { CompleteUserDto } from '../dto/complete-register.dto';
import { RegisterUserDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { UserRole } from '../auth.types';
import { MediaItemProcessor } from 'src/share/media/media-item-processor';

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
      expiresIn: this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'),
    });

    return { accessToken, refreshToken };
  }

  async login({ email, password }: LoginDto) {
    const user = await this.authRepo.validateUser(email, password);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Login successful',
      user: this.buildUserResponse(user),
      ...tokens,
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
          role: UserRole.TEACHER,
        });

        return { email, name, completed: user.completed, commonUser: user.commonUser, newUser: true };
      }

      if (!user.completed) {
        return { email, name, completed: false, commonUser: user.commonUser, newUser: true };
      }

      if (!(user as any).active) {
        return { message: 'User is inactive', active: false, completed: user.completed, commonUser: user.commonUser, newUser: false };
      }

      const tokens = this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return { message: 'Login successful', isNewUser: false, user: this.buildUserResponse(user), ...tokens };
    } catch (error) {
      this.logger.error(`Error during Google login: ${error.message}`);
      throw new UnauthorizedException('Invalid Google token');
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
      this.logger.error(`Error refreshing token: ${error.message}`);
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
      teacherProfile: user.teacherProfile
        ? {
          id: user.teacherProfile.id,
          active: user.teacherProfile.active,
          createdAt: user.teacherProfile.createdAt,
          updatedAt: user.teacherProfile.updatedAt,
          team: user.teacherProfile.team
            ? {
              id: user.teacherProfile.team.id,
              numberTeam: user.teacherProfile.team.numberTeam,
              description: user.teacherProfile.team.description,
              createdAt: user.teacherProfile.team.createdAt,
              updatedAt: user.teacherProfile.team.updatedAt,
              shelter: user.teacherProfile.team.shelter
                ? {
                  id: user.teacherProfile.team.shelter.id,
                  name: user.teacherProfile.team.shelter.name,
                  description: user.teacherProfile.team.shelter.description,
                  teamsQuantity: user.teacherProfile.team.shelter.teamsQuantity,
                  createdAt: user.teacherProfile.team.shelter.createdAt,
                  updatedAt: user.teacherProfile.team.shelter.updatedAt,
                  address: user.teacherProfile.team.shelter.address
                    ? {
                      id: user.teacherProfile.team.shelter.address.id,
                      street: user.teacherProfile.team.shelter.address.street,
                      number: user.teacherProfile.team.shelter.address.number,
                      district: user.teacherProfile.team.shelter.address.district,
                      city: user.teacherProfile.team.shelter.address.city,
                      state: user.teacherProfile.team.shelter.address.state,
                      postalCode: user.teacherProfile.team.shelter.address.postalCode,
                      createdAt: user.teacherProfile.team.shelter.address.createdAt,
                      updatedAt: user.teacherProfile.team.shelter.address.updatedAt,
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

    // Buscar imagem do usuário
    const imageMedia = await this.mediaItemProcessor.findMediaItemByTarget(
      userId,
      'UserEntity',
    );

    return this.buildMeResponse(user, imageMedia || undefined);
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

    return { message: 'Registration completed successfully' };
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

    return { message: 'Registration successful', user: this.buildUserResponse(user) };
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
