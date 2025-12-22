import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { InformativeRepository } from '../informative.repository';
import { RouteRepository } from 'src/route/route-page.repository';

@Injectable()
export class DeleteInformativeService {
  private readonly logger = new Logger(DeleteInformativeService.name);

  constructor(
    @Inject(InformativeRepository)
    private readonly informativeRepo: InformativeRepository,

    @Inject(RouteRepository)
    private readonly routeRepo: RouteRepository,
  ) {}

  async execute(id: string): Promise<void> {

    const informative = await this.informativeRepo.findOneWithRelations(id);

    if (!informative) {
      this.logger.warn(`Banner not found: ID=${id}`);
      throw new NotFoundException('Informative banner not found');
    }

    try {
      if (informative.route) {
        await this.routeRepo.delete(informative.route.id);
      }

      await this.informativeRepo.remove(informative);
    } catch (error) {
      this.logger.error(`Error removing banner ID=${id}`, error.stack);
      throw new InternalServerErrorException('Erro ao remover banner.');
    }
  }
}
