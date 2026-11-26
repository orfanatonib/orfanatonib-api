/** Chave de uma tabela ou índice, como o DynamoDB a descreve. */
export interface DoctorKeyElement {
  attributeName: string;
  keyType: "HASH" | "RANGE";
}

export interface DoctorAttributeDefinition {
  attributeName: string;
  attributeType: string;
}

export interface DoctorIndexSnapshot {
  indexName: string;
  keySchema: DoctorKeyElement[];
  projectionType: string | null;
  status: string | null;
}

/** O que o `DescribeTable` devolve, reduzido ao que o diagnóstico compara. */
export interface DoctorTableSnapshot {
  tableName: string;
  tableStatus: string | null;
  keySchema: DoctorKeyElement[];
  attributeDefinitions: DoctorAttributeDefinition[];
  billingMode: string | null;
  globalSecondaryIndexes: DoctorIndexSnapshot[];
}

export interface DoctorTtlSnapshot {
  status: string | null;
  attributeName: string | null;
}

/** `null` em `table` significa tabela inexistente. */
export interface DoctorObservation {
  table: DoctorTableSnapshot | null;
  ttl: DoctorTtlSnapshot | null;
}

export interface DoctorExpectation {
  tableName: string;
  partitionKey: string;
  sortKey: string;
  indexName: string;
  indexPartitionKey: string;
  indexSortKey: string;
  ttlAttribute: string;
  billingMode: string;
}

export enum DoctorStatus {
  Ok = "OK",
  Fail = "FALHA",
}

export interface DoctorCheck {
  item: string;
  status: DoctorStatus;
  detail: string;
}

/** Porta fina para a AWS: quem chama o DynamoDB implementa isto. */
export interface DoctorDescriber {
  describe(tableName: string): Promise<DoctorObservation>;
}
