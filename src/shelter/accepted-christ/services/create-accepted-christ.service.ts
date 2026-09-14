import { Injectable, NotFoundException } from "@nestjs/common";
import { AcceptedChristRepository } from "../repositories/accepted-christ.repository";
import { CreateAcceptedChristDto } from "../dto/create-accepted-christ.dto";
import { AcceptedChristResponseDto } from "../dto/accepted-christ-response.dto";

@Injectable()
export class CreateAcceptedChristDtoService {
  constructor(
    private readonly acceptedChristRepository: AcceptedChristRepository,
  ) {}

  async create(dto: CreateAcceptedChristDto): Promise<AcceptedChristResponseDto> {
    const sheltered = await this.acceptedChristRepository.findShelteredById(dto.shelteredId);
    if (!sheltered) {
      throw new NotFoundException(`Sheltered with id ${dto.shelteredId} not found.`);
    }

    const accepted = this.acceptedChristRepository.create({
      decision: dto.decision ?? null,
      sheltered,
      notes: dto.notes ?? null,
    });

    const saved = await this.acceptedChristRepository.save(accepted);
    return AcceptedChristResponseDto.fromEntity(saved);
  }
}
export { CreateAcceptedChristDtoService as CreateAcceptedChristService };
