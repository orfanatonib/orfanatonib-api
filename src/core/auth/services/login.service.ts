import { Injectable, Logger } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { UnauthenticatedException } from "src/common/exceptions";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { LoginDto } from "../dto/login.dto";
import {
  AuthErrorMessages,
  AuthSuccessMessages,
  AuthLogs,
} from "../constants/auth.constants";
import { LoginResult } from "../dto/auth.response.dto";
import { toAuthUserDto } from "../mappers/auth-user.mapper";
import { AuthTokenService } from "./auth-token.service";
import { EmailVerificationService } from "./email-verification.service";

@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    private readonly getUsersService: GetUsersService,
    private readonly tokenService: AuthTokenService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  async execute({ email, password }: LoginDto): Promise<LoginResult> {
    const user = await this.getUsersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthenticatedException(AuthErrorMessages.INVALID_CREDENTIALS);
    }

    // Conta ainda não validada responde 200 sem tokens: a tela de login lê
    // `user.active === false` para pedir a validação, em vez de tratar erro.
    // Só vai na resposta enquanto o e-mail não foi confirmado; é o que a tela
    // lê para mostrar o aviso de confirmação pendente.
    const emailVerification = this.emailVerification.statusFor(user);

    if (!user.active) {
      return {
        message: AuthSuccessMessages.USER_INACTIVE,
        user: toAuthUserDto(user),
        ...(emailVerification ? { emailVerification } : {}),
      };
    }

    const tokens = await this.tokenService.issueFor(user);
    this.logger.log(AuthLogs.LOGIN_SUCCESS);

    return {
      message: AuthSuccessMessages.LOGIN_SUCCESS,
      user: toAuthUserDto(user),
      ...tokens,
      ...(emailVerification ? { emailVerification } : {}),
    };
  }
}
