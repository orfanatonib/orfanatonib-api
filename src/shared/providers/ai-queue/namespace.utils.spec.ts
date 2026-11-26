import { redisNamespace } from './namespace.utils';

const namespace = (values: Record<string, string> = {}): string =>
  redisNamespace((key) => values[key]);

describe('Redis application isolation', () => {
  it('separates production, staging and local keys', () => {
    expect(namespace()).toBe('orfanato-nib-local');
    expect(namespace({ ENVIRONMENT: 'production' })).toBe('orfanato-nib-prod');
    expect(namespace({ ENVIRONMENT: 'staging' })).toBe('orfanato-nib-staging');
  });
  it.each(['clubinho', 'bull', 'orfanato-nib-staging', 'orfanato-nib-prod:*'])
  ('rejects a foreign or ambiguous deployed namespace: %s', (prefix) => {
    expect(() => namespace({ ENVIRONMENT: 'prod', AI_QUEUE_PREFIX: prefix })).toThrow();
  });
  it('permits only local subnamespaces for isolated test runs', () => {
    expect(namespace({ AI_QUEUE_PREFIX: 'orfanato-nib-local-run1' }))
      .toBe('orfanato-nib-local-run1');
    expect(() => namespace({ AI_QUEUE_PREFIX: 'clubinho' })).toThrow();
  });
});
