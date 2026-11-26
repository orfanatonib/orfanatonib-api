import {
  DescribeTableCommand,
  DescribeTimeToLiveCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import { DoctorDescriber, DoctorObservation } from "./types";

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "ResourceNotFoundException"
  );
}

/** Única parte do diagnóstico que fala com a AWS (somente leitura). */
export class AwsDoctorDescriber implements DoctorDescriber {
  constructor(private readonly client: DynamoDBClient) {}

  async describe(tableName: string): Promise<DoctorObservation> {
    try {
      const described = await this.client.send(
        new DescribeTableCommand({ TableName: tableName }),
      );
      const table = described.Table;
      if (!table) return { table: null, ttl: null };
      const ttl = await this.client.send(
        new DescribeTimeToLiveCommand({ TableName: tableName }),
      );
      return {
        table: {
          tableName: table.TableName ?? "",
          tableStatus: table.TableStatus ?? null,
          keySchema: (table.KeySchema ?? []).map((k) => ({
            attributeName: k.AttributeName ?? "",
            keyType: k.KeyType === "HASH" ? "HASH" : "RANGE",
          })),
          attributeDefinitions: (table.AttributeDefinitions ?? []).map((a) => ({
            attributeName: a.AttributeName ?? "",
            attributeType: a.AttributeType ?? "",
          })),
          billingMode:
            table.BillingModeSummary?.BillingMode ??
            (table.ProvisionedThroughput?.ReadCapacityUnits
              ? "PROVISIONED"
              : null),
          globalSecondaryIndexes: (table.GlobalSecondaryIndexes ?? []).map(
            (i) => ({
              indexName: i.IndexName ?? "",
              keySchema: (i.KeySchema ?? []).map((k) => ({
                attributeName: k.AttributeName ?? "",
                keyType: k.KeyType === "HASH" ? "HASH" : "RANGE",
              })),
              projectionType: i.Projection?.ProjectionType ?? null,
              status: i.IndexStatus ?? null,
            }),
          ),
        },
        ttl: {
          status: ttl.TimeToLiveDescription?.TimeToLiveStatus ?? null,
          attributeName: ttl.TimeToLiveDescription?.AttributeName ?? null,
        },
      };
    } catch (error: unknown) {
      if (isNotFound(error)) return { table: null, ttl: null };
      throw error;
    }
  }
}
