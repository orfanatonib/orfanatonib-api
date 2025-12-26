import { Body, Controller, Post, Logger } from '@nestjs/common';
import { AcceptedChristService } from '../services/accepted-christ.service';
import { CreateAcceptedChristDto } from '../dtos/create-accepted-christ.dto';
import { AcceptedChristEntity } from '../entities/accepted-christ.entity';

@Controller('accepted-christs')
export class AcceptedChristController {
  private readonly logger = new Logger(AcceptedChristController.name);

  constructor(private readonly acceptedChristService: AcceptedChristService) {}

  @Post()
  async create(
    @Body() dto: CreateAcceptedChristDto,
  ): Promise<AcceptedChristEntity> {
    this.logger.log('Creating new accepted christ record');
    const result = await this.acceptedChristService.create(dto);
    this.logger.log(`Accepted christ record created successfully: ${result.id}`);
    return result;
  }
}
