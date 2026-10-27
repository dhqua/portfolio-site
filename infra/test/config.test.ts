import { describe, expect, it } from 'vitest';
import { loadConfig } from '../lib/config.ts';

const base = { BUDGET_ALERT_EMAIL: 'alerts@example.com' };

describe('loadConfig', () => {
  it('leaves the domain unset by default', () => {
    const config = loadConfig(base);
    expect(config.SITE_DOMAIN).toBeUndefined();
    expect(config.HOSTED_ZONE_ID).toBeUndefined();
  });

  it('accepts a domain with its hosted zone ID', () => {
    const config = loadConfig({ ...base, SITE_DOMAIN: 'example.com', HOSTED_ZONE_ID: 'Z0123ABC' });
    expect(config).toMatchObject({ SITE_DOMAIN: 'example.com', HOSTED_ZONE_ID: 'Z0123ABC' });
  });

  it('requires SITE_DOMAIN and HOSTED_ZONE_ID together', () => {
    expect(() => loadConfig({ ...base, SITE_DOMAIN: 'example.com' })).toThrow(/HOSTED_ZONE_ID/);
    expect(() => loadConfig({ ...base, HOSTED_ZONE_ID: 'Z0123ABC' })).toThrow(/HOSTED_ZONE_ID/);
  });

  it('rejects malformed domain values', () => {
    expect(() =>
      loadConfig({ ...base, SITE_DOMAIN: 'https://example.com', HOSTED_ZONE_ID: 'Z0123ABC' }),
    ).toThrow(/SITE_DOMAIN/);
    expect(() =>
      loadConfig({ ...base, SITE_DOMAIN: 'example.com', HOSTED_ZONE_ID: 'not-a-zone' }),
    ).toThrow(/HOSTED_ZONE_ID/);
  });
});
