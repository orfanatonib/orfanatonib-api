import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ResourceConflictException } from "src/common/exceptions";
import { ContentPromptPreferenceEntity } from "../entities/content-prompt-preference.entity";
import { ContentAudience } from "../enums/content-audience.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";

@Injectable()
export class ContentPromptPreferenceRepository {
  constructor(
    @InjectRepository(ContentPromptPreferenceEntity)
    private readonly preferences: Repository<ContentPromptPreferenceEntity>,
  ) {}

  findForUser(
    userId: string,
    audience: ContentAudience,
  ): Promise<ContentPromptPreferenceEntity[]> {
    return this.preferences.find({ where: { userId, audience } });
  }

  /** Orientação ativa (texto) do administrador para a etapa, ou `null`. Usada ao gerar. */
  async findActiveText(
    userId: string,
    audience: ContentAudience,
    stageType: ContentStageType,
  ): Promise<string | null> {
    const row = await this.preferences.findOne({
      where: { userId, audience, stageType },
    });
    return row?.customPrompt?.trim() ? row.customPrompt : null;
  }

  /**
   * Grava (ou apaga o texto de) uma orientação com controle de versão. `expected` é a versão que a tela viu:
   * `undefined` = nunca salva. Divergência ⇒ 409 (alteração em outra aba ou aparelho).
   */
  async write(
    userId: string,
    audience: ContentAudience,
    stageType: ContentStageType,
    customPrompt: string | null,
    expected: number | undefined,
  ): Promise<ContentPromptPreferenceEntity> {
    const current = await this.preferences.findOne({
      where: { userId, audience, stageType },
    });
    if ((current?.lockVersion ?? undefined) !== expected) {
      throw new ResourceConflictException(
        "Esta orientação foi alterada em outra aba ou aparelho.",
      );
    }
    if (!current) {
      try {
        return await this.preferences.save(
          this.preferences.create({
            userId,
            audience,
            stageType,
            customPrompt,
            lockVersion: 1,
          }),
        );
      } catch {
        // Corrida: outra requisição criou a linha entre a leitura e a gravação.
        throw new ResourceConflictException(
          "Esta orientação foi alterada em outra aba ou aparelho.",
        );
      }
    }
    const result = await this.preferences
      .createQueryBuilder()
      .update(ContentPromptPreferenceEntity)
      .set({ customPrompt, lockVersion: () => "lock_version + 1" })
      .where("id = :id AND lock_version = :lockVersion", {
        id: current.id,
        lockVersion: current.lockVersion,
      })
      .execute();
    if (!result.affected)
      throw new ResourceConflictException(
        "Esta orientação foi alterada em outra aba ou aparelho.",
      );
    return this.preferences.findOneOrFail({ where: { id: current.id } });
  }
}
