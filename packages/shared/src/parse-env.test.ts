import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseEnv } from './parse-env';

const schema = z.object({
  ENV: z.enum(['dev', 'prod']).default('prod'),
  BUDGET_ALERT_EMAIL: z.email(),
  SITE_DOMAIN: z.string().optional(),
});

describe('parseEnv', () => {
  it('returns typed values and applies defaults', () => {
    expect(parseEnv(schema, { BUDGET_ALERT_EMAIL: 'me@example.com' })).toEqual({
      ENV: 'prod',
      BUDGET_ALERT_EMAIL: 'me@example.com',
    });
  });

  it('names every invalid key', () => {
    expect(() => parseEnv(schema, { ENV: 'staging' })).toThrow(/ENV: .*; BUDGET_ALERT_EMAIL: /);
  });

  it('does not leak values in the error', () => {
    const run = () => parseEnv(schema, { BUDGET_ALERT_EMAIL: 'hunter2-secret' });
    expect(run).toThrow(/BUDGET_ALERT_EMAIL/);
    expect(run).not.toThrow(/hunter2-secret/);
  });
});
