import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { SheltersRepository } from '../repositories/shelters.repository';
import { AuthContextService } from 'src/core/auth/services/auth-context.service';
import { RouteService } from 'src/infrastructure/route/route.service';
import { MediaItemProcessor } from 'src/shared/media/media-item-processor';
import { AwsS3Service } from 'src/infrastructure/aws/aws-s3.service';

type Ctx = { role?: string; userId?: string | null };

@Injectable()
export class DeleteSheltersService {
  private readonly logger = new Logger(DeleteSheltersService.name);

  constructor(
    private readonly sheltersRepository: SheltersRepository,
    private readonly authCtx: AuthContextService,
    private readonly routeService: RouteService,
    private readonly mediaItemProcessor: MediaItemProcessor,
    private readonly s3Service: AwsS3Service,
  ) { }

  private async getCtx(req: Request): Promise<Ctx> {
    const p = await this.authCtx.tryGetPayload(req);
    return { role: p?.role?.toLowerCase(), userId: p?.sub ?? null };
  }

  async remove(id: string, req: Request): Promise<{ message: string }> {
    const ctx = await this.getCtx(req);
    if (!ctx.role || ctx.role === 'member') {
      throw new ForbiddenException('Acesso negado');
    }

    if (ctx.role === 'leader') {
      const allowed = await this.sheltersRepository.userHasAccessToShelter(id, ctx);
      if (!allowed) throw new NotFoundException('Shelter not found');
    }

    const mediaItems = await this.mediaItemProcessor.findMediaItemsByTarget(id, 'ShelterEntity');
    if (mediaItems.length > 0) {
      await this.mediaItemProcessor.deleteMediaItems(
        mediaItems,
        this.s3Service.delete.bind(this.s3Service),
      );
      this.logger.log(`Deleted ${mediaItems.length} media items for Shelter ${id}`);
    }

    await this.routeService.removeRouteByEntity('ShelterEntity', id);
    await this.sheltersRepository.deleteById(id);
    return { message: 'Shelter removido com sucesso' };
  }
}
