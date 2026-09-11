import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { EmailVerificationTokenEntity } from "../entities/email-verification-token.entity";

@Injectable()
export class EmailVerificationTokenRepository {
  constructor(
    @InjectRepository(EmailVerificationTokenEntity)
    private readonly repo: Repository<EmailVerificationTokenEntity>,
  ) {}

  async createToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<EmailVerificationTokenEntity> {
    return this.repo.save(this.repo.create({ userId, token, expiresAt }));
  }

  /** Token existente, ainda não usado e dentro da validade. */
  async findUsableToken(
    token: string,
  ): Promise<EmailVerificationTokenEntity | null> {
    const entity = await this.repo.findOne({
      where: { token, usedAt: IsNull() },
      relations: ["user"],
    });

    if (!entity) return null;
    return entity.expiresAt < new Date() ? null : entity;
  }

  async markUsed(id: string, usedAt: Date): Promise<void> {
    await this.repo.update({ id }, { usedAt });
  }

  /** Invalida os pendentes antes de emitir um novo. */
  async invalidatePendingForUser(userId: string): Promise<void> {
    await this.repo.delete({ userId, usedAt: IsNull() });
  }
}
