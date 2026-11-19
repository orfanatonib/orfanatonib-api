import { Test } from "@nestjs/testing";
import {
  ResourceConflictException,
  ResourceNotFoundException,
} from "src/common/exceptions";
import { CreateUserService } from "src/core/user/services/create-user.service";
import { GetUsersService } from "src/core/user/services/get-user.service";
import { UpdateUserService } from "src/core/user/services/update-user.service";
import { UpdateMemberProfileService } from "src/shelter/member-profile/services/update-member-profile.service";
import { RegisterService } from "./register.service";
import { EmailVerificationService } from "./email-verification.service";
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
  const getUsersService = { findByEmail: jest.fn() };
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
      ],
    }).compile();
    moduleRef.useLogger(false);

    service = moduleRef.get(RegisterService);

    getUsersService.findByEmail.mockResolvedValue(null);
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
    it("fills in the account that came from Google", async () => {
      const pending = buildUserEntity({ completed: false });
      getUsersService.findByEmail.mockResolvedValue(pending);
      const dto = buildCompleteRegisterDto({ role: UserRole.LEADER });

      await expect(service.completeRegister(dto)).resolves.toEqual({
        message: AuthSuccessMessages.REGISTRATION_COMPLETED,
        emailVerification: {
          verificationEmailSent: true,
          message: "Enviamos um link de confirmação para o seu e-mail.",
        },
      });

      expect(updateUserService.update).toHaveBeenCalledWith("user-id", {
        name: dto.name,
        phone: dto.phone,
        password: dto.password,
        completed: true,
        role: UserRole.LEADER,
      });
    });

    it("reports 404 for an email that has no account", async () => {
      getUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.completeRegister(buildCompleteRegisterDto()),
      ).rejects.toThrow(
        new ResourceNotFoundException(AuthErrorMessages.USER_NOT_FOUND),
      );
    });

    it("reports a conflict when the registration is already complete", async () => {
      getUsersService.findByEmail.mockResolvedValue(
        buildUserEntity({ completed: true }),
      );

      await expect(
        service.completeRegister(buildCompleteRegisterDto()),
      ).rejects.toThrow(
        new ResourceConflictException(AuthErrorMessages.USER_ALREADY_COMPLETED),
      );
      expect(updateUserService.update).not.toHaveBeenCalled();
    });

    it("keeps the role the account already had when the payload omits it", async () => {
      getUsersService.findByEmail.mockResolvedValue(
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
