import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { ContentAssetEntity } from "../entities/content-asset.entity";
import { ContentAssetKind } from "../enums/content-asset-kind.enum";

/** Slot do PDF guardado de uma etapa (um por versão; o `checksum` é a chave de conteúdo: versão + imagens). */
export const STAGE_PDF_SLOT = "stage-pdf";

export interface StoreAssetInput {
  readonly packageId: string;
  readonly stageId: string;
  readonly versionId: string;
  readonly slot: string;
  readonly storageKey: string;
  readonly mediaType: string;
  readonly sizeBytes: number;
  readonly checksum: string;
}

@Injectable()
export class ContentAssetRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Guarda a imagem de um item e devolve as chaves das imagens substituídas (o chamador apaga do bucket depois do
   * commit: falha ao apagar nunca desfaz a regeneração).
   */
  async replaceSlot(input: StoreAssetInput): Promise<string[]> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ContentAssetEntity);
      const old = await repo.find({
        where: {
          versionId: input.versionId,
          slot: input.slot,
          kind: ContentAssetKind.GENERATED_IMAGE,
        },
      });
      if (old.length) await repo.remove(old);
      await repo.save(
        repo.create({
          packageId: input.packageId,
          stageId: input.stageId,
          versionId: input.versionId,
          slot: input.slot,
          kind: ContentAssetKind.GENERATED_IMAGE,
          storageKey: input.storageKey,
          mediaType: input.mediaType,
          sizeBytes: String(input.sizeBytes),
          checksum: input.checksum,
        }),
      );
      return old.map((asset) => asset.storageKey);
    });
  }

  /** PDF já guardado da etapa para ESTA versão e ESTE conteúdo (`checksum`), ou `null` se ainda não foi gerado. */
  async findStagePdf(
    versionId: string,
    checksum: string,
  ): Promise<ContentAssetEntity | null> {
    return this.dataSource.getRepository(ContentAssetEntity).findOne({
      where: {
        versionId,
        slot: STAGE_PDF_SLOT,
        kind: ContentAssetKind.EXPORT_PDF,
        checksum,
      },
    });
  }

  /** Guarda o PDF da etapa e devolve as chaves dos PDFs antigos da mesma versão (o chamador os apaga do bucket depois). */
  async replaceStagePdf(input: StoreAssetInput): Promise<string[]> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ContentAssetEntity);
      const old = await repo.find({
        where: {
          versionId: input.versionId,
          slot: STAGE_PDF_SLOT,
          kind: ContentAssetKind.EXPORT_PDF,
        },
      });
      if (old.length) await repo.remove(old);
      await repo.save(
        repo.create({
          packageId: input.packageId,
          stageId: input.stageId,
          versionId: input.versionId,
          slot: STAGE_PDF_SLOT,
          kind: ContentAssetKind.EXPORT_PDF,
          storageKey: input.storageKey,
          mediaType: input.mediaType,
          sizeBytes: String(input.sizeBytes),
          checksum: input.checksum,
        }),
      );
      return old.map((asset) => asset.storageKey);
    });
  }

  /** Imagens geradas de uma versão, por item. */
  async listForVersion(versionId: string): Promise<ContentAssetEntity[]> {
    return this.dataSource.getRepository(ContentAssetEntity).find({
      where: { versionId, kind: ContentAssetKind.GENERATED_IMAGE },
      order: { slot: "ASC" },
    });
  }

  /** A imagem gerada de um item (slot) de uma versão, se existir. */
  async findGeneratedSlot(
    versionId: string,
    slot: string,
  ): Promise<ContentAssetEntity | null> {
    return this.dataSource.getRepository(ContentAssetEntity).findOne({
      where: { versionId, slot, kind: ContentAssetKind.GENERATED_IMAGE },
      order: { createdAt: "DESC" },
    });
  }

  async findInPackage(
    packageId: string,
    assetId: string,
  ): Promise<ContentAssetEntity | null> {
    return this.dataSource
      .getRepository(ContentAssetEntity)
      .findOne({ where: { id: assetId, packageId } });
  }

  async findManyInPackage(
    packageId: string,
    assetIds: readonly string[],
  ): Promise<ContentAssetEntity[]> {
    if (assetIds.length === 0) return [];
    return this.dataSource
      .getRepository(ContentAssetEntity)
      .createQueryBuilder("asset")
      .where("asset.packageId = :packageId", { packageId })
      .andWhere("asset.id IN (:...assetIds)", { assetIds })
      .getMany();
  }
}
