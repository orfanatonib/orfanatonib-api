import {
  DYNAMO_GSI1_NAME,
  DYNAMO_GSI1_PK,
  DYNAMO_GSI1_SK,
  DYNAMO_PK,
  DYNAMO_SK,
  DYNAMO_TTL_ATTRIBUTE,
} from "../constants";
import {
  DoctorCheck,
  DoctorExpectation,
  DoctorKeyElement,
  DoctorObservation,
  DoctorStatus,
} from "./types";

/** Contrato de tabela que o provider DynamoDB assume (espelha o provisionador local). */
export function buildExpectation(tableName: string): DoctorExpectation {
  return {
    tableName,
    partitionKey: DYNAMO_PK,
    sortKey: DYNAMO_SK,
    indexName: DYNAMO_GSI1_NAME,
    indexPartitionKey: DYNAMO_GSI1_PK,
    indexSortKey: DYNAMO_GSI1_SK,
    ttlAttribute: DYNAMO_TTL_ATTRIBUTE,
    billingMode: "PAY_PER_REQUEST",
  };
}

function check(
  item: string,
  ok: boolean,
  okText: string,
  failText: string,
): DoctorCheck {
  return {
    item,
    status: ok ? DoctorStatus.Ok : DoctorStatus.Fail,
    detail: ok ? okText : failText,
  };
}

function describeKey(keySchema: DoctorKeyElement[]): string {
  if (keySchema.length === 0) return "(sem chave)";
  return keySchema.map((k) => `${k.attributeName}(${k.keyType})`).join(" + ");
}

function keyMatches(
  keySchema: DoctorKeyElement[],
  partition: string,
  sort: string,
): boolean {
  const hash = keySchema.find((k) => k.keyType === "HASH");
  const range = keySchema.find((k) => k.keyType === "RANGE");
  return (
    keySchema.length === 2 &&
    hash?.attributeName === partition &&
    range?.attributeName === sort
  );
}

/** Compara o observado com o esperado; função pura, sem AWS. */
export function evaluateTable(
  expected: DoctorExpectation,
  observed: DoctorObservation,
): DoctorCheck[] {
  const { table, ttl } = observed;
  if (!table) {
    return [
      check(
        "Tabela",
        false,
        "",
        `a tabela "${expected.tableName}" não existe nesta conta/região (crie-a com infra/dynamodb).`,
      ),
    ];
  }

  const checks: DoctorCheck[] = [];
  checks.push(
    check(
      "Nome da tabela",
      table.tableName === expected.tableName,
      table.tableName,
      `esperado "${expected.tableName}", encontrado "${table.tableName}".`,
    ),
  );
  checks.push(
    check(
      "Status da tabela",
      table.tableStatus === "ACTIVE",
      "ACTIVE",
      `esperado ACTIVE, encontrado ${table.tableStatus ?? "desconhecido"}.`,
    ),
  );
  checks.push(
    check(
      "Chave primária",
      keyMatches(table.keySchema, expected.partitionKey, expected.sortKey),
      `${expected.partitionKey}(HASH) + ${expected.sortKey}(RANGE)`,
      `esperado ${expected.partitionKey}(HASH) + ${expected.sortKey}(RANGE), encontrado ${describeKey(table.keySchema)}.`,
    ),
  );

  const stringAttributes = [
    expected.partitionKey,
    expected.sortKey,
    expected.indexPartitionKey,
    expected.indexSortKey,
  ];
  const badTypes = stringAttributes.filter(
    (name) =>
      table.attributeDefinitions.find((a) => a.attributeName === name)
        ?.attributeType !== "S",
  );
  checks.push(
    check(
      "Tipo dos atributos de chave",
      badTypes.length === 0,
      "todos string (S)",
      `atributos ausentes ou que não são string: ${badTypes.join(", ")}.`,
    ),
  );

  checks.push(
    check(
      "Cobrança",
      table.billingMode === expected.billingMode,
      expected.billingMode,
      `esperado ${expected.billingMode}, encontrado ${table.billingMode ?? "desconhecido"}.`,
    ),
  );

  const index = table.globalSecondaryIndexes.find(
    (i) => i.indexName === expected.indexName,
  );
  if (!index) {
    checks.push(
      check(
        `Índice ${expected.indexName}`,
        false,
        "",
        "índice ausente (necessário para consultar por requestId).",
      ),
    );
  } else {
    const keyOk = keyMatches(
      index.keySchema,
      expected.indexPartitionKey,
      expected.indexSortKey,
    );
    const projectionOk = index.projectionType === "ALL";
    checks.push(
      check(
        `Índice ${expected.indexName}`,
        keyOk &&
          projectionOk &&
          (index.status === null || index.status === "ACTIVE"),
        `${expected.indexPartitionKey}(HASH) + ${expected.indexSortKey}(RANGE), projeção ALL`,
        `chave ${describeKey(index.keySchema)}, projeção ${index.projectionType ?? "desconhecida"}, status ${index.status ?? "desconhecido"}; esperado ${expected.indexPartitionKey}+${expected.indexSortKey}, projeção ALL, ACTIVE.`,
      ),
    );
  }

  const ttlOn = ttl?.status === "ENABLED" || ttl?.status === "ENABLING";
  const ttlRight = ttl?.attributeName === expected.ttlAttribute;
  checks.push(
    check(
      "TTL",
      ttlOn && ttlRight,
      `${ttl?.status} em "${expected.ttlAttribute}"`,
      !ttlOn
        ? `TTL desligado (status ${ttl?.status ?? "desconhecido"}); sem ele a retenção nunca expira os registros.`
        : `TTL ligado no atributo "${ttl?.attributeName ?? ""}", esperado "${expected.ttlAttribute}".`,
    ),
  );

  return checks;
}

export function hasFailures(checks: DoctorCheck[]): boolean {
  return checks.some((c) => c.status === DoctorStatus.Fail);
}

export function formatReport(
  tableName: string,
  checks: DoctorCheck[],
  where: string,
): string {
  const lines = [
    `Diagnóstico da tabela de registros "${tableName}" (${where})`,
    "",
    ...checks.map((c) => `  [${c.status}] ${c.item}: ${c.detail}`),
    "",
    hasFailures(checks)
      ? "Resultado: FALHA — corrija os itens acima antes de ligar OBS_STORAGE/AUDIT_STORAGE=dynamodb."
      : "Resultado: OK — a tabela atende ao que o provider espera.",
  ];
  return lines.join("\n");
}
