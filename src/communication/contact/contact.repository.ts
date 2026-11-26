import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { ContactEntity } from "./contact.entity";
import { QueryContactDto } from "./dto/query-contact.dto";
import { ContactSortBy } from "./enums/contact-sort-by.enum";
import { SortOrder } from "src/shared/enums/sort-order.enum";
import {
  createdRange,
  escapeLike,
  isPaginated,
  normalizeSearch,
  pageWindow,
} from "src/shared/list-query/list-query.util";

@Injectable()
export class ContactRepository extends Repository<ContactEntity> {
  constructor(private dataSource: DataSource) {
    super(ContactEntity, dataSource.createEntityManager());
  }

  async saveContact(data: Partial<ContactEntity>): Promise<ContactEntity> {
    const entity = this.create(data);
    return this.save(entity);
  }

  /** Filtros, ordenação e (com `page`) recorte da página, tudo no banco. */
  async findFiltered(
    query: QueryContactDto = {},
  ): Promise<{ items: ContactEntity[]; total: number }> {
    const qb = this.createQueryBuilder("c");

    const search = normalizeSearch(query.search);
    if (search) {
      qb.andWhere(
        "(c.name LIKE :search ESCAPE '\\\\' OR c.email LIKE :search ESCAPE '\\\\' OR c.phone LIKE :search ESCAPE '\\\\' OR c.message LIKE :search ESCAPE '\\\\')",
        { search: `%${escapeLike(search)}%` },
      );
    }

    if (query.read !== undefined) {
      qb.andWhere("c.read = :read", { read: query.read });
    }

    const { from, to } = createdRange(query);
    if (from) qb.andWhere("c.createdAt >= :createdFrom", { createdFrom: from });
    if (to) qb.andWhere("c.createdAt <= :createdTo", { createdTo: to });

    const column = query.sortBy ?? ContactSortBy.CREATED_AT;
    qb.orderBy(`c.${column}`, query.order ?? SortOrder.DESC).addOrderBy(
      "c.id",
      "ASC",
    );

    if (isPaginated(query)) {
      const { skip, take } = pageWindow(query);
      qb.skip(skip).take(take);
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /** Mensagens que o admin ainda não marcou como lidas. */
  async countUnread(): Promise<number> {
    return this.countBy({ read: false });
  }

  async findOneById(id: string): Promise<ContactEntity | null> {
    return this.findOne({
      where: { id },
    });
  }
}
