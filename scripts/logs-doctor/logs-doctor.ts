/**
 * Confere se a tabela DynamoDB de registros atende ao que o provider espera.
 * Somente leitura (DescribeTable/DescribeTimeToLive). Lê as variáveis do
 * ambiente do processo; para um arquivo de env use `dotenv -e <arquivo> --`.
 *
 *   npx dotenv -e env/staging.env -- npm run logs:doctor
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import { AwsDoctorDescriber } from "src/shared/providers/log-storage/doctor/aws-describer";
import {
  buildExpectation,
  evaluateTable,
  formatReport,
  hasFailures,
} from "src/shared/providers/log-storage/doctor/utils";
import { dynamoDbConfigOf } from "src/shared/providers/log-storage/dynamodb/dynamodb-client.provider";
import { parseLogStorageConfig } from "src/shared/providers/log-storage/utils";

async function main(): Promise<number> {
  const config = parseLogStorageConfig((key) => process.env[key]);
  const dynamo = dynamoDbConfigOf(config);
  if (!dynamo) {
    process.stderr.write(
      "FALHA: nenhum fluxo usa dynamodb (defina OBS_STORAGE/AUDIT_STORAGE=dynamodb, LOG_DYNAMODB_TABLE_NAME e AWS_REGION).\n",
    );
    return 1;
  }
  if (dynamo.endpoint) {
    // O SDK exige credenciais mesmo no DynamoDB Local.
    process.env.AWS_ACCESS_KEY_ID ??= "local";
    process.env.AWS_SECRET_ACCESS_KEY ??= "local";
  }
  const client = new DynamoDBClient({
    region: dynamo.region,
    ...(dynamo.endpoint ? { endpoint: dynamo.endpoint } : {}),
  });
  try {
    const observed = await new AwsDoctorDescriber(client).describe(
      dynamo.tableName,
    );
    const checks = evaluateTable(buildExpectation(dynamo.tableName), observed);
    process.stdout.write(
      `${formatReport(dynamo.tableName, checks, dynamo.endpoint ?? dynamo.region)}\n`,
    );
    return hasFailures(checks) ? 1 : 0;
  } finally {
    client.destroy();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    process.stderr.write(
      `FALHA ao consultar o DynamoDB: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  });
