import { BaseEntity } from "src/shared/entity/base.entity";
import { Column, Entity, Index } from "typeorm";

import { ContentAudience } from "../enums/content-audience.enum";
import { ContentStageType } from "../enums/content-stage-type.enum";

/**
 * Orientação complementar de UM administrador para UMA etapa de UM público. É somada às regras oficiais
 * nas gerações que esse administrador dispara. `customPrompt` nulo = voltou ao padrão (a linha continua,
 * para o `lockVersion` seguir valendo entre abas e aparelhos).
 */
@Entity("content_prompt_preferences")
@Index(["userId", "audience", "stageType"], { unique: true })
export class ContentPromptPreferenceEntity extends BaseEntity {
  @Column({ name: "user_id", type: "varchar", length: 36 })
  userId: string;

  @Column({ type: "enum", enum: ContentAudience })
  audience: ContentAudience;

  @Column({ name: "stage_type", type: "enum", enum: ContentStageType })
  stageType: ContentStageType;

  @Column({ name: "custom_prompt", type: "text", nullable: true })
  customPrompt: string | null;

  @Column({ name: "lock_version", type: "int", unsigned: true, default: 1 })
  lockVersion: number;
}
