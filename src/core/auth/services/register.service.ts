import { Injectable, Logger } from "@nestjs/common";
import { ResourceConflictException } from "src/common/exceptions";
import { ResourceNotFoundException } from "src/common/exceptions";
import { CreateUserService } from "src/core/user/services/create-user.service";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { UpdateUserService } from "src/core/user/services/update-user.service";
import { MemberProfilesService } from "src/shelter/member-profile/services/member-profiles.service";
import { UserRole } from "../auth.types";
import { CompleteUserDto } from "../dto/complete-register.dto";
import { RegisterUserDto } from "../dto/register.dto";
import {
  MessageResponseDto,
  RegisterResponseDto,
} from "../dto/auth.response.dto";
import { EmailVerificationStatusDto } from "../dto/email-verification.response.dto";
import {
  AuthErrorMessages,
  AuthLogs,
  AuthSuccessMessages,
} from "../constants/auth.constants";
import { toAuthUserDto } from "../mappers/auth-user.mapper";
import { errorMessageOf } from "../utils/auth-token.util";
import { EmailVerificationService } from "./email-verification.service";

@Injectable()
export class RegisterService {
  private readonly logger = new Logger(RegisterService.name);

  constructor(
    private readonly getUsersService: GetUsersService,
    private readonly createUserService: CreateUserService,
    private readonly updateUserService: UpdateUserService,
    private readonly memberProfilesService: MemberProfilesService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  /** Cadastro direto: a conta nasce inativa, aguardando validação. */
  async register(data: RegisterUserDto): Promise<RegisterResponseDto> {
    const existing = await this.getUsersService.findByEmail(data.email);
    if (existing) {
      throw new ResourceConflictException(
        AuthErrorMessages.USER_ALREADY_EXISTS,
      );
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

    await this.assignTeam(user.id, user.role, data.teamId);
    const emailVerification = await this.emailVerification.requestFor(user);
    this.logger.log(AuthLogs.REGISTRATION_SUCCESS);

    return {
      message: AuthSuccessMessages.REGISTRATION_SUCCESS,
      user: toAuthUserDto(user),
      emailVerification,
    };
  }

  /**
   * Completa o cadastro de quem entrou pelo Google: a conta já existe, mas sem
   * telefone, senha e papel.
   */
  async completeRegister(
    data: CompleteUserDto,
  ): Promise<
    MessageResponseDto & { emailVerification: EmailVerificationStatusDto }
  > {
    const user = await this.getUsersService.findByEmail(data.email);
    if (!user) {
      throw new ResourceNotFoundException(AuthErrorMessages.USER_NOT_FOUND);
    }
    if (user.completed) {
      throw new ResourceConflictException(
        AuthErrorMessages.USER_ALREADY_COMPLETED,
      );
    }

    const finalRole = data.role ?? user.role;

    await this.updateUserService.update(user.id, {
      name: data.name,
      phone: data.phone,
      password: data.password,
      completed: true,
      role: data.role,
    });

    await this.assignTeam(user.id, finalRole, data.teamId);
    const emailVerification = await this.emailVerification.requestFor(user);
    this.logger.log(AuthLogs.COMPLETE_REGISTRATION_SUCCESS);

    return {
      message: AuthSuccessMessages.REGISTRATION_COMPLETED,
      emailVerification,
    };
  }

  /**
   * A equipe é opcional e só vale para membro. Falhar aqui não desfaz o
   * cadastro: a conta já existe e a equipe pode ser ajustada depois.
   */
  private async assignTeam(
    userId: string,
    role: UserRole,
    teamId: string | undefined,
  ): Promise<void> {
    if (role !== UserRole.MEMBER || !teamId) return;

    try {
      await this.memberProfilesService.assignTeamForUser(userId, teamId);
    } catch (error: unknown) {
      this.logger.warn(
        AuthLogs.TEAM_ASSIGN_FAILED(userId, errorMessageOf(error)),
      );
    }
  }
}
