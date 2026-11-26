import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { fromInstanceMetadata } from "@smithy/credential-provider-imds";

import { DYNAMO_MAX_ATTEMPTS, DYNAMO_REQUEST_TIMEOUT_MS } from "../constants";
import { LogCredentialsSource, LogStorageKind } from "../enums";
import { DynamoDbStorageConfig, LogStorageConfig } from "../types";

/** A configuração DynamoDB de qualquer fluxo que a use; `null` se nenhum. */
export function dynamoDbConfigOf(
  config: LogStorageConfig,
): DynamoDbStorageConfig | null {
  for (const stream of [config.observability, config.audit]) {
    if (stream.storage.kind === LogStorageKind.DynamoDb) return stream.storage;
  }
  return null;
}

/**
 * Um único cliente para a aplicação inteira.
 *
 * Credenciais vêm da cadeia padrão do SDK (Task Role, instance role ou
 * ambiente); nada de access key no código. Sem fluxo em DynamoDB o cliente
 * não é criado, e o processo não carrega o SDK à toa.
 */
export function createDynamoDbDocumentClient(
  config: LogStorageConfig,
): DynamoDBDocumentClient | null {
  const dynamo = dynamoDbConfigOf(config);
  if (!dynamo) return null;

  const client = new DynamoDBClient({
    region: dynamo.region,
    ...(dynamo.endpoint ? { endpoint: dynamo.endpoint } : {}),
    ...(dynamo.credentialsSource === LogCredentialsSource.InstanceProfile
      ? { credentials: fromInstanceMetadata({ timeout: DYNAMO_REQUEST_TIMEOUT_MS, maxRetries: 2 }) }
      : {}),
    maxAttempts: DYNAMO_MAX_ATTEMPTS,
    requestHandler: {
      requestTimeout: DYNAMO_REQUEST_TIMEOUT_MS,
      connectionTimeout: DYNAMO_REQUEST_TIMEOUT_MS,
    },
  });

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}
