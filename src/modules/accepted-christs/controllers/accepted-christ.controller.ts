import { Body, Controller, Post } from '@nestjs/common';
import { AcceptedChristService } from '../services/accepted-christ.service';
import { CreateAcceptedChristDto } from '../dtos/create-accepted-christ.dto';
import { AcceptedChristEntity } from '../entities/accepted-christ.entity';

@Controller('accepted-christs')
export class AcceptedChristController {
  constructor(private readonly acceptedChristService: AcceptedChristService) {}

  @Post()
  async create(
    @Body() dto: CreateAcceptedChristDto,
  ): Promise<AcceptedChristEntity> {
    return this.acceptedChristService.create(dto);
  }
}
