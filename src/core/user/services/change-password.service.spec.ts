import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";

import { UserErrorMessages } from "../constants/user.constants";
import { ChangePasswordService } from "./change-password.service";

type Repo = { findById: jest.Mock; update: jest.Mock };

describe("ChangePasswordService", () => {
  let repo: Repo;
  let service: ChangePasswordService;
  let currentHash: string;

  beforeAll(async () => {
    currentHash = await bcrypt.hash("Atual@123", 4);
  });

  beforeEach(() => {
    repo = { findById: jest.fn(), update: jest.fn() };
    service = new ChangePasswordService(repo as never);
  });

  it("usuário inexistente: 404 e nada gravado", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(
      service.changePassword("u", { newPassword: "Nova@123" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("usuário comum sem senha atual: 400", async () => {
    repo.findById.mockResolvedValue({
      commonUser: true,
      password: currentHash,
    });
    await expect(
      service.changePassword("u", { newPassword: "Nova@123" }),
    ).rejects.toThrow(
      new BadRequestException(UserErrorMessages.CURRENT_PASSWORD_REQUIRED),
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("usuário comum com senha atual errada: 401", async () => {
    repo.findById.mockResolvedValue({
      commonUser: true,
      password: currentHash,
    });
    await expect(
      service.changePassword("u", {
        currentPassword: "errada",
        newPassword: "Nova@123",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("nova senha igual à atual: 400", async () => {
    repo.findById.mockResolvedValue({
      commonUser: true,
      password: currentHash,
    });
    await expect(
      service.changePassword("u", {
        currentPassword: "Atual@123",
        newPassword: "Atual@123",
      }),
    ).rejects.toThrow(
      new BadRequestException(UserErrorMessages.NEW_PASSWORD_SAME),
    );
  });

  it("feliz: grava hash (nunca o texto) da nova senha", async () => {
    repo.findById.mockResolvedValue({
      commonUser: true,
      password: currentHash,
    });
    const res = await service.changePassword("u", {
      currentPassword: "Atual@123",
      newPassword: "Nova@123",
    });
    expect(res.message).toBeDefined();
    const saved = (
      repo.update.mock.calls[0] as [string, { password: string }]
    )[1].password;
    expect(saved).not.toBe("Nova@123");
    expect(await bcrypt.compare("Nova@123", saved)).toBe(true);
  });

  it("conta Google (commonUser=false) não exige a senha atual", async () => {
    repo.findById.mockResolvedValue({
      commonUser: false,
      password: currentHash,
    });
    await service.changePassword("u", { newPassword: "Nova@123" });
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it("falha do repositório é propagada", async () => {
    repo.findById.mockResolvedValue({
      commonUser: false,
      password: currentHash,
    });
    repo.update.mockRejectedValue(new Error("db"));
    await expect(
      service.changePassword("u", { newPassword: "Nova@123" }),
    ).rejects.toThrow("db");
  });
});
