import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import { EmailOutboxEntity } from "./email-outbox.entity";
import { EmailOutboxStatus } from "../enums/email-outbox-status.enum";
import { EmailTemplateKey } from "../enums/email-template-key.enum";

@Injectable()
export class EmailOutboxRepository {
  constructor(
    @InjectRepository(EmailOutboxEntity)
    private readonly repo: Repository<EmailOutboxEntity>,
  ) {}

  create(data: Partial<EmailOutboxEntity>): EmailOutboxEntity {
    return this.repo.create(data);
  }

  save(entries: EmailOutboxEntity[]): Promise<EmailOutboxEntity[]> {
    return this.repo.save(entries);
  }

  /** INSERT em lote, sem reler as linhas gravadas. */
  async insertMany(entries: EmailOutboxEntity[]): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .insert()
      .values(entries)
      .updateEntity(false)
      .execute();
  }

  saveOne(entry: EmailOutboxEntity): Promise<EmailOutboxEntity> {
    return this.repo.save(entry);
  }

  /** Já existe alguma linha com esta chave de deduplicação? */
  async existsByDedupeKey(dedupeKey: string): Promise<boolean> {
    return (await this.repo.countBy({ dedupeKey })) > 0;
  }

  /** Lote pronto para envio: pendente e com a hora já vencida. */
  findDue(limit: number, now: Date): Promise<EmailOutboxEntity[]> {
    return this.repo.find({
      where: {
        status: EmailOutboxStatus.PENDING,
        scheduledFor: LessThanOrEqual(now),
      },
      order: { scheduledFor: "ASC" },
      take: limit,
    });
  }

  findById(id: string): Promise<EmailOutboxEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findRecent(limit: number): Promise<EmailOutboxEntity[]> {
    return this.repo.find({ order: { createdAt: "DESC" }, take: limit });
  }

  countByStatus(status: EmailOutboxStatus): Promise<number> {
    return this.repo.countBy({ status });
  }

  countByTemplate(templateKey: EmailTemplateKey): Promise<number> {
    return this.repo.countBy({ templateKey });
  }

  /** Devolve à fila o que falhou, para uma nova tentativa manual. */
  async requeueFailed(now: Date): Promise<number> {
    const result = await this.repo.update(
      { status: EmailOutboxStatus.FAILED },
      {
        status: EmailOutboxStatus.PENDING,
        attempts: 0,
        scheduledFor: now,
        lastError: null,
      },
    );
    return result.affected ?? 0;
  }
}
