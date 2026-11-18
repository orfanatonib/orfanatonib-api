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
