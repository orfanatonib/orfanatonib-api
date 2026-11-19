import { DoctorObservation, DoctorStatus } from "./types";
import {
  buildExpectation,
  evaluateTable,
  formatReport,
  hasFailures,
} from "./utils";

const NAME = "orfanatonib-log-records-staging";
const expected = buildExpectation(NAME);

function perfect(): DoctorObservation {
  return {
    table: {
      tableName: NAME,
      tableStatus: "ACTIVE",
      keySchema: [
        { attributeName: "pk", keyType: "HASH" },
        { attributeName: "sk", keyType: "RANGE" },
      ],
      attributeDefinitions: ["pk", "sk", "gsi1pk", "gsi1sk"].map(
        (attributeName) => ({
          attributeName,
          attributeType: "S",
        }),
      ),
      billingMode: "PAY_PER_REQUEST",
      globalSecondaryIndexes: [
        {
          indexName: "gsi1-request",
          keySchema: [
            { attributeName: "gsi1pk", keyType: "HASH" },
            { attributeName: "gsi1sk", keyType: "RANGE" },
          ],
          projectionType: "ALL",
          status: "ACTIVE",
        },
      ],
    },
    ttl: { status: "ENABLED", attributeName: "expiresAtEpochSeconds" },
  };
}

const failing = (obs: DoctorObservation) =>
  evaluateTable(expected, obs)
    .filter((c) => c.status === DoctorStatus.Fail)
    .map((c) => c.item);

describe("doctor utils", () => {
  it("tabela perfeita: tudo OK", () => {
    const checks = evaluateTable(expected, perfect());
    expect(hasFailures(checks)).toBe(false);
    expect(formatReport(NAME, checks, "us-east-1")).toContain("Resultado: OK");
  });

  it("sem TTL: falha só no TTL", () => {
    const obs = perfect();
    obs.ttl = { status: "DISABLED", attributeName: null };
    expect(failing(obs)).toEqual(["TTL"]);
  });

  it("TTL no atributo errado falha", () => {
    const obs = perfect();
    obs.ttl = { status: "ENABLED", attributeName: "ttl" };
    expect(failing(obs)).toEqual(["TTL"]);
  });

  it("GSI faltando", () => {
    const obs = perfect();
    obs.table!.globalSecondaryIndexes = [];
    expect(failing(obs)).toEqual(["Índice gsi1-request"]);
  });

  it("chave errada", () => {
    const obs = perfect();
    obs.table!.keySchema = [{ attributeName: "id", keyType: "HASH" }];
    expect(failing(obs)).toEqual(["Chave primária"]);
  });

  it("tabela inexistente", () => {
    const checks = evaluateTable(expected, { table: null, ttl: null });
    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe(DoctorStatus.Fail);
    expect(formatReport(NAME, checks, "x")).toContain("Resultado: FALHA");
  });

  it("tabela não ACTIVE e cobrança diferente falham", () => {
    const obs = perfect();
    obs.table!.tableStatus = "CREATING";
    obs.table!.billingMode = "PROVISIONED";
    expect(failing(obs)).toEqual(["Status da tabela", "Cobrança"]);
  });
});
