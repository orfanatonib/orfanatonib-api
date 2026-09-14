import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { DocumentEntity } from "src/content/document/entities/document.entity";
import { QueryDocumentDto } from "./dto/query-document.dto";

@Injectable()
export class DocumentRepository {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly repo: Repository<DocumentEntity>,
  ) {}

  async findAllSorted(query?: QueryDocumentDto): Promise<DocumentEntity[]> {
    const search = query?.search?.trim();
    if (search) {
      return this.repo.find({
        where: [
          { name: ILike(`%${search}%`) },
          { description: ILike(`%${search}%`) },
        ],
        order: {
          createdAt: "DESC",
        },
      });
    }

    return this.repo.find({
      order: {
        createdAt: "DESC",
      },
    });
  }

  async findOneById(id: string): Promise<DocumentEntity | null> {
    return this.repo.findOne({
      where: { id },
    });
  }

  async findOneWithRelations(id: string): Promise<DocumentEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ["route"],
    });
  }

  async upsertOne(data: Partial<DocumentEntity>): Promise<DocumentEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async removeOne(entity: DocumentEntity): Promise<DocumentEntity> {
    return this.repo.remove(entity);
  }

  async remove(entity: DocumentEntity): Promise<DocumentEntity> {
    return this.repo.remove(entity);
  }
}
