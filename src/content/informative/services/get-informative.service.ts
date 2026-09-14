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

@Injectable()
export class GetInformativeService {
  private readonly logger = new Logger(GetInformativeService.name);

  constructor(
    @Inject(InformativeRepository)
    private readonly informativeRepo: InformativeRepository,
  ) {}

  async findAll(query?: QueryInformativeDto): Promise<InformativeResponseDto[]> {
    try {
      const list = await this.informativeRepo.findAllSorted(query);
      return list.map((entity) => InformativeResponseDto.fromEntity(entity));
    } catch (error) {
      this.logger.error("Error fetching banners", error.stack);
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
