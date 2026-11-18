import { Body, Controller, Post, Logger, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/core/auth/guards/jwt-auth.guard";
import { CreateAcceptedChristService } from "../services/create-accepted-christ.service";
import { CreateAcceptedChristDto } from "../dto/create-accepted-christ.dto";
import { AcceptedChristResponseDto } from "../dto/accepted-christ-response.dto";

/** Registro de decisão por pessoa logada (a tela de pagela); nunca público. */
@Controller("accepted-christs")
@UseGuards(JwtAuthGuard)
export class AcceptedChristController {
  private readonly logger = new Logger(AcceptedChristController.name);

  constructor(
    private readonly createAcceptedChristService: CreateAcceptedChristService,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateAcceptedChristDto,
  ): Promise<AcceptedChristResponseDto> {
    this.logger.log("Creating new accepted christ record");
    const result = await this.createAcceptedChristService.create(dto);
    this.logger.log(
      `Accepted christ record created successfully: ${result.id}`,
    );
    return result;
  }
}
