import { Injectable } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { PersonalData } from "../entities/personal-data.entity";
import { UserPreferences } from "../entities/user-preferences.entity";

export interface ProfileSectionsInput {
  personalData?: Partial<PersonalData>;
  preferences?: Partial<UserPreferences>;
}

export interface ProfileSectionsResult {
  personalData: PersonalData | null;
  preferences: UserPreferences | null;
}

/**
 * Escritas do perfil completo (dados pessoais + preferências) em UMA transação:
 * se a segunda seção falha, a primeira não fica gravada.
 * `userId` do corpo é sempre ignorado — o dono vem do argumento.
 */
@Injectable()
export class ProfileWriteRepository {
  constructor(private readonly dataSource: DataSource) {}

  saveSections(
    userId: string,
    input: ProfileSectionsInput,
  ): Promise<ProfileSectionsResult> {
    return this.dataSource.transaction(async (manager) => {
      const personalData = input.personalData
        ? await this.upsertPersonalData(manager, userId, input.personalData)
        : null;
      const preferences = input.preferences
        ? await this.upsertPreferences(manager, userId, input.preferences)
        : null;
      return { personalData, preferences };
    });
  }

  private async upsertPersonalData(
    manager: EntityManager,
    userId: string,
    data: Partial<PersonalData>,
  ): Promise<PersonalData | null> {
    const repo = manager.getRepository(PersonalData);
    const clean: Partial<PersonalData> = { ...data };
    delete clean.userId;
    const existing = await repo.findOne({ where: { userId } });
    if (!existing) await repo.save(repo.create({ ...clean, userId }));
    else if (Object.keys(clean).length > 0)
      await repo.update({ userId }, clean);
    return repo.findOne({ where: { userId } });
  }

  private async upsertPreferences(
    manager: EntityManager,
    userId: string,
    data: Partial<UserPreferences>,
  ): Promise<UserPreferences | null> {
    const repo = manager.getRepository(UserPreferences);
    const clean: Partial<UserPreferences> = { ...data };
    delete clean.userId;
    const existing = await repo.findOne({ where: { userId } });
    if (!existing) await repo.save(repo.create({ ...clean, userId }));
    else if (Object.keys(clean).length > 0)
      await repo.update({ userId }, clean);
    return repo.findOne({ where: { userId } });
  }
}
