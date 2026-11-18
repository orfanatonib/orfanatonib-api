import { Injectable } from "@nestjs/common";
import { PagelasRepository } from "../pagelas.repository";
import type { ShelterAccessContext } from "src/shelter/shelter/types";
import { PagelaAccessService } from "./pagela-access.service";

@Injectable()
export class DeletePagelaService {
  constructor(
    private readonly repo: PagelasRepository,
    private readonly access: PagelaAccessService,
  ) {}

  async execute(id: string): Promise<void> {
    await this.repo.remove(id);
  }

  async executeAs(actor: ShelterAccessContext, id: string): Promise<void> {
    await this.access.assertCanAccessPagela(id, actor);
    await this.execute(id);
  }
}
