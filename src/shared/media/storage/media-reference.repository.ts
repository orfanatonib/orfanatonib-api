import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

/** Pergunta ao banco se alguém ainda referencia um arquivo (mídia ou imagem de rota). */
@Injectable()
export class MediaReferenceRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async isReferenced(url: string): Promise<boolean> {
    const media: unknown[] = await this.dataSource.query(
      "SELECT 1 AS hit FROM media_items WHERE url = ? LIMIT 1",
      [url],
    );
    if (media.length > 0) return true;
    const routes: unknown[] = await this.dataSource.query(
      "SELECT 1 AS hit FROM routes WHERE image = ? LIMIT 1",
      [url],
    );
    return routes.length > 0;
  }
}
