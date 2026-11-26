import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  InternalServerErrorException,
} from "@nestjs/common";
import { InformativeRepository } from "../informative.repository";
import { InformativeResponseDto } from "../dto/informative-response.dto";
import { QueryInformativeDto } from "../dto/query-informative.dto";
import { InformativeSortBy } from "../enums/informative-sort-by.enum";
import { PaginatedResponseDto } from "src/shared/dto/paginated-response.dto";
import {
  isPaginated,
  toPaginated,
} from "src/shared/list-query/list-query.util";

@Injectable()
export class GetInformativeService {
  private readonly logger = new Logger(GetInformativeService.name);

  constructor(
    @Inject(InformativeRepository)
    private readonly informativeRepo: InformativeRepository,
  ) {}

  async findAll(
    query?: QueryInformativeDto,
  ): Promise<
    InformativeResponseDto[] | PaginatedResponseDto<InformativeResponseDto>
  > {
    try {
      const { items, total } = await this.informativeRepo.findFiltered(query);
      const data = items.map((entity) =>
        InformativeResponseDto.fromEntity(entity),
      );
      if (query && isPaginated(query)) {
        return toPaginated(
          data,
          query,
          total,
          query.sortBy ?? InformativeSortBy.CREATED_AT,
        );
      }
      return data;
    } catch (error) {
      this.logger.error(
        "Error fetching banners",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Erro ao buscar banners informativos",
      );
    }
  }

  async findOne(id: string): Promise<InformativeResponseDto> {
    const item = await this.informativeRepo.findOneById(id);
    if (!item) {
      this.logger.warn(`Banner not found: ID=${id}`);
      throw new NotFoundException("Informative banner not found");
    }

    return InformativeResponseDto.fromEntity(item);
  }
}
