import { Injectable } from "@nestjs/common";
import { PagelasRepository } from "../pagelas.repository";

@Injectable()
export class DeletePagelaService {
  constructor(private readonly repo: PagelasRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.remove(id);
  }
}
