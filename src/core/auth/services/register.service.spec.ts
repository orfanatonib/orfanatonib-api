import { Test } from "@nestjs/testing";
import {
  ResourceConflictException,
  UnauthenticatedException,
} from "src/common/exceptions";
import { CreateUserService } from "src/core/user/services/create-user.service";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { UpdateUserService } from "src/core/user/services/update-user.service";
import { UpdateMemberProfileService } from "src/shelter/member-profile/services/update-member-profile.service";
import { RegisterService } from "./register.service";
import { EmailVerificationService } from "./email-verification.service";
import { CompletionTokenService } from "./completion-token.service";
import { UserRole } from "../auth.types";
import {
  AuthErrorMessages,
  AuthSuccessMessages,
} from "../constants/auth.constants";
import {
  buildCompleteRegisterDto,
  buildRegisterDto,
  buildUserEntity,
} from "../auth.fixtures";

describe("RegisterService", () => {
  const getUsersService = { findByEmail: jest.fn(), findByIdOrNull: jest.fn() };
  const completionTokens = { verify: jest.fn() };
  const createUserService = { create: jest.fn() };
  const updateUserService = { update: jest.fn() };
  const updateMemberProfileService = { assignTeamForUser: jest.fn() };
  const emailVerification = { requestFor: jest.fn() };

  let service: RegisterService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        RegisterService,
        { provide: GetUsersService, useValue: getUsersService },
        { provide: CreateUserService, useValue: createUserService },
        { provide: UpdateUserService, useValue: updateUserService },
        {
          provide: UpdateMemberProfileService,
          useValue: updateMemberProfileService,
        },
        {
          provide: EmailVerificationService,
          useValue: emailVerification,
        },
        { provide: CompletionTokenService, useValue: completionTokens },
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(RegisterService);

    getUsersService.findByEmail.mockResolvedValue(null);
    completionTokens.verify.mockReturnValue("user-id");
    createUserService.create.mockResolvedValue(buildUserEntity());
    updateUserService.update.mockResolvedValue(buildUserEntity());
    updateMemberProfileService.assignTeamForUser.mockResolvedValue(undefined);
    emailVerification.requestFor.mockResolvedValue({
      verificationEmailSent: true,
      message: "Enviamos um link de confirmação para o seu e-mail.",
    });
  });

  describe("register", () => {
    it("creates the account inactive, awaiting validation", async () => {
      const dto = buildRegisterDto();

      const result = await service.register(dto);

      expect(createUserService.create).toHaveBeenCalledWith({
        email: dto.email,
        name: dto.name,
        password: dto.password,
        phone: dto.phone,
        active: false,
        completed: true,
        commonUser: true,
        role: dto.role,
      });
      expect(result.message).toBe(AuthSuccessMessages.REGISTRATION_SUCCESS);
      expect(result.user.id).toBe("user-id");
      expect(result.user).not.toHaveProperty("password");
    });

    it("reports a conflict when the email is taken", async () => {
      getUsersService.findByEmail.mockResolvedValue(buildUserEntity());

      await expect(service.register(buildRegisterDto())).rejects.toThrow(
        new ResourceConflictException(AuthErrorMessages.USER_ALREADY_EXISTS),
      );
      expect(createUserService.create).not.toHaveBeenCalled();
    });

    it("links the member to the chosen team", async () => {
      await service.register(buildRegisterDto({ teamId: "team-id" }));

      expect(updateMemberProfileService.assignTeamForUser).toHaveBeenCalledWith(
        "user-id",
        "team-id",
      );
    });

    it("does not link a team for a role that is not member", async () => {
      createUserService.create.mockResolvedValue(
        buildUserEntity({ role: UserRole.LEADER }),
      );

      await service.register(
        buildRegisterDto({ role: UserRole.LEADER, teamId: "team-id" }),
      );

      expect(
        updateMemberProfileService.assignTeamForUser,
      ).not.toHaveBeenCalled();
    });

    it("does not link a team when none was chosen", async () => {
      await service.register(buildRegisterDto());

      expect(
        updateMemberProfileService.assignTeamForUser,
      ).not.toHaveBeenCalled();
    });

    it("keeps the account when linking the team fails", async () => {
      updateMemberProfileService.assignTeamForUser.mockRejectedValue(
        new Error("Team not found"),
      );

      await expect(
        service.register(buildRegisterDto({ teamId: "inexistente" })),
      ).resolves.toMatchObject({
        message: AuthSuccessMessages.REGISTRATION_SUCCESS,
      });
    });
  });

  describe("completeRegister", () => {
    const rejectedAsUnauthenticated = async () => {
      const error = await service
        .completeRegister(buildCompleteRegisterDto())
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(UnauthenticatedException);
      expect((error as UnauthenticatedException).message).toBe(
        AuthErrorMessages.COMPLETION_TOKEN_INVALID,
      );
      expect(updateUserService.update).not.toHaveBeenCalled();
      expect(emailVerification.requestFor).not.toHaveBeenCalled();
    };

    it("[auth.post.auth-complete-register#feliz] fills in the account owned by the completion token", async () => {
      const pending = buildUserEntity({ completed: false });
      getUsersService.findByIdOrNull.mockResolvedValue(pending);
      const dto = buildCompleteRegisterDto({ role: UserRole.LEADER });

      await expect(service.completeRegister(dto)).resolves.toEqual({
        message: AuthSuccessMessages.REGISTRATION_COMPLETED,
        emailVerification: {
          verificationEmailSent: true,
          message: "Enviamos um link de confirmação para o seu e-mail.",
        },
      });

      expect(completionTokens.verify).toHaveBeenCalledWith("completion-token");
      expect(getUsersService.findByEmail).not.toHaveBeenCalled();
      expect(updateUserService.update).toHaveBeenCalledWith("user-id", {
        name: dto.name,
        phone: dto.phone,
        password: dto.password,
        completed: true,
        role: UserRole.LEADER,
      });
    });

    it("[auth.post.auth-complete-register#token-invalido] an invalid, expired or wrong-purpose token (verify returns null) is a generic 401 with no lookup or write", async () => {
      completionTokens.verify.mockReturnValue(null);

      await rejectedAsUnauthenticated();
      expect(getUsersService.findByIdOrNull).not.toHaveBeenCalled();
    });

    it("[auth.post.auth-complete-register#token-expirado] an expired token is rejected exactly like any invalid one", async () => {
      completionTokens.verify.mockReturnValue(null);

      await rejectedAsUnauthenticated();
    });

    it("[auth.post.auth-complete-register#token-proposito-errado] a token of another purpose (e.g. the session JWT) is rejected exactly like any invalid one", async () => {
      completionTokens.verify.mockReturnValue(null);

      await rejectedAsUnauthenticated();
    });

    it("[auth.post.auth-complete-register#token-reusado] a token whose account is already complete (used once) is the same generic 401", async () => {
      getUsersService.findByIdOrNull.mockResolvedValue(
        buildUserEntity({ completed: true }),
      );

      await rejectedAsUnauthenticated();
    });

    it("[auth.post.auth-complete-register#conta-ativa] an active account is never altered, and the answer does not tell it apart from a missing one", async () => {
      getUsersService.findByIdOrNull.mockResolvedValue(
        buildUserEntity({ completed: true, active: true }),
      );
      await rejectedAsUnauthenticated();

      getUsersService.findByIdOrNull.mockResolvedValue(null);
      await rejectedAsUnauthenticated();
    });

    it("keeps the role the account already had when the payload omits it", async () => {
      getUsersService.findByIdOrNull.mockResolvedValue(
        buildUserEntity({ completed: false, role: UserRole.MEMBER }),
      );

      await service.completeRegister(
        buildCompleteRegisterDto({ role: undefined, teamId: "team-id" }),
      );

      expect(updateMemberProfileService.assignTeamForUser).toHaveBeenCalledWith(
        "user-id",
        "team-id",
      );
    });
  });
});
