export interface UploadedObject {
  key: string;
  url: string;
}

export interface MediaReconciliationReport {
  dryRun: boolean;
  orphanKeys: string[];
  removedKeys: string[];
  brokenReferences: string[];
}

/** Coluna do banco que referencia um arquivo do bucket. */
export interface MediaReferenceColumn {
  readonly table: string;
  readonly column: string;
}
