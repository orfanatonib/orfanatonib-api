import { REDIS_NAMESPACE } from './constants';
import type { RedisEnvironmentReader } from './types';

/** Every Redis key is owned by this application and environment. */
export function redisNamespace(read: RedisEnvironmentReader): string {
  const raw = read('ENVIRONMENT') || read('NODE_ENV') || 'local';
  const environment = raw === 'production' ? 'prod' : raw === 'test' ? 'local' : raw;
  if (!REDIS_NAMESPACE.environments.includes(environment)) {
    throw new Error('Ambiente inválido para o namespace Redis do Orfanato.');
  }
  const expected = `${REDIS_NAMESPACE.application}-${environment}`;
  const configured = read('AI_QUEUE_PREFIX');
  if (configured && configured !== expected) {
    // Local test runs may reserve a subnamespace; deployed environments cannot
    // accidentally consume another application's or environment's jobs.
    if (environment !== 'local' || !configured.startsWith(`${expected}-`) ||
        !/^[a-zA-Z0-9_-]+$/.test(configured)) {
      throw new Error(`AI_QUEUE_PREFIX deve ser ${expected}.`);
    }
  }
  return configured || expected;
}
