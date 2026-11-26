import { Injectable } from "@nestjs/common";

import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaItemRepository } from "../media-item-repository";
import { MediaReferenceRepository } from "./media-reference.repository";
import { MEDIA_RECONCILIATION_MIN_AGE_HOURS } from "./media-storage.constants";
import type { MediaReconciliationReport } from "./media-storage.types";
import { extractStorageKey } from "./media-storage.utils";

@Injectable()
export class MediaReconciliationService {
  constructor(
    private readonly s3: AwsS3Service,
    private readonly media: MediaItemRepository,
    private readonly references: MediaReferenceRepository,
  ) {}

  /**
   * Compara o bucket com TODAS as referências do banco, sob o prefixo do ambiente.
   * Órfãos mais velhos que a janela são removidos (a menos que dryRun);
   * referências sem objeto são apenas reportadas.
   */
  async reconcile(options: {
    dryRun: boolean;
    now?: Date;
    minAgeHours?: number;
  }): Promise<MediaReconciliationReport> {
    const now = options.now ?? new Date();
    const minAgeMs =
      (options.minAgeHours ?? MEDIA_RECONCILIATION_MIN_AGE_HOURS) * 3_600_000;
    const bucket = this.s3.getBucketName();
    const prefix = `${this.s3.getEnvironment()}/`;

    // Bucket primeiro: o envio grava o objeto antes da linha, então quem foi listado e já tem linha fica protegido.
    const objects = await this.s3.listKeys(prefix);
    const present = new Set(objects.map((o) => o.key));

    const referenced = new Set<string>();
    for (const ref of [
      ...(await this.media.findLocalFileUrls()),
      ...(await this.references.findAllReferences()),
    ]) {
      referenced.add(extractStorageKey(ref, bucket) ?? ref);
    }

    const orphanKeys = objects
      .filter((o) => !referenced.has(o.key))
      .filter(
        (o) =>
          o.lastModified !== undefined &&
          now.getTime() - o.lastModified.getTime() >= minAgeMs,
      )
      .map((o) => o.key);

    // Para referência quebrada vale o contrário: confirma numa listagem posterior à leitura do banco.
    let brokenReferences = [...referenced].filter(
      (k) => k.startsWith(prefix) && !present.has(k),
    );
    if (brokenReferences.length > 0) {
      const later = new Set((await this.s3.listKeys(prefix)).map((o) => o.key));
      brokenReferences = brokenReferences.filter((k) => !later.has(k));
    }

    const removedKeys: string[] = [];
    if (!options.dryRun) {
      for (const key of orphanKeys) {
        await this.s3.deleteKey(key);
        removedKeys.push(key);
      }
    }
    return {
      dryRun: options.dryRun,
      orphanKeys,
      removedKeys,
      brokenReferences,
    };
  }
}
