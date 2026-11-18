import { Injectable } from "@nestjs/common";

import { AwsS3Service } from "src/infrastructure/aws/services/aws-s3.service";
import { MediaItemRepository } from "../media-item-repository";
import { MEDIA_RECONCILIATION_MIN_AGE_HOURS } from "./media-storage.constants";
import type { MediaReconciliationReport } from "./media-storage.types";
import { extractStorageKey } from "./media-storage.utils";

@Injectable()
export class MediaReconciliationService {
  constructor(
    private readonly s3: AwsS3Service,
    private readonly media: MediaItemRepository,
  ) {}

  /**
   * Compara bucket × media_items sob o prefixo do ambiente.
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

    const referenced = new Set<string>();
    for (const ref of await this.media.findLocalFileUrls()) {
      referenced.add(extractStorageKey(ref, bucket) ?? ref);
    }

    const objects = await this.s3.listKeys(prefix);
    const present = new Set(objects.map((o) => o.key));

    const orphanKeys = objects
      .filter((o) => !referenced.has(o.key))
      .filter(
        (o) =>
          o.lastModified !== undefined &&
          now.getTime() - o.lastModified.getTime() >= minAgeMs,
      )
      .map((o) => o.key);

    const brokenReferences = [...referenced].filter(
      (k) => k.startsWith(prefix) && !present.has(k),
    );

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
