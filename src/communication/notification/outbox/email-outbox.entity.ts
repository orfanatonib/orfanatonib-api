import { BaseEntity } from "src/shared/entity/base.entity";
import { Column, Entity, Index } from "typeorm";
import { EmailTemplateKey } from "../enums/email-template-key.enum";
import { EmailOutboxStatus } from "../enums/email-outbox-status.enum";

/**
 * Cada e-mail que a aplicação decidiu enviar, com o que aconteceu com ele.
 *
 * Antes o envio era síncrono dentro do request e uma falha virava só uma linha
 * de log: ninguém sabia o que deixou de chegar. Aqui a decisão de enviar e o
 * envio em si ficam separados — o request grava a linha, o worker entrega.
 */
@Entity("email_outbox")
@Index(["status", "scheduledFor"])
export class EmailOutboxEntity extends BaseEntity {
  @Column({ type: "varchar", length: 64 })
  templateKey: EmailTemplateKey;

  @Column({ type: "varchar", length: 320 })
  recipient: string;

  @Column({ type: "varchar", length: 255 })
  subject: string;

  @Column({ type: "mediumtext" })
  html: string;

  @Column({ type: "text" })
  text: string;

  @Column({
    type: "enum",
    enum: EmailOutboxStatus,
    default: EmailOutboxStatus.PENDING,
  })
  status: EmailOutboxStatus;

  @Column({ type: "int", default: 0 })
  attempts: number;

  /** Quando o worker deve tentar. O backoff empurra esta data para frente. */
  @Column({ type: "datetime" })
  scheduledFor: Date;

  @Column({ type: "datetime", nullable: true })
  sentAt: Date | null;

  @Column({ type: "text", nullable: true })
  lastError: string | null;

  /**
   * Idempotência: a mesma chave não entra duas vezes na fila. É o que evita
   * que um lembrete diário mande o mesmo aviso a cada passada do agendador.
   */
  @Index({ unique: true })
  @Column({ type: "varchar", length: 191, nullable: true })
  dedupeKey: string | null;
}
