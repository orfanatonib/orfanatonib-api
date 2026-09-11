import { Injectable, Logger } from "@nestjs/common";
import { ShelteredRepository } from "../repositories/sheltered.repository";
import { ShelteredAccessContext } from "../types";
import { GetShelteredService } from "./get-sheltered.service";

@Injectable()
export class DeleteShelteredService {
  private readonly logger = new Logger(DeleteShelteredService.name);

  constructor(
    private readonly shelteredRepository: ShelteredRepository,
    private readonly getShelteredService: GetShelteredService,
  ) {}

  async execute(id: string, actor: ShelteredAccessContext): Promise<void> {
    await this.getShelteredService.findEntityOrFail(id, actor);
    await this.shelteredRepository.deleteById(id);
    this.logger.log(`Sheltered deleted: ${id}`);
  }
}
