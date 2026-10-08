import { describe, expect, it } from 'bun:test';

import { isEnvFile } from './ignored-env-files';

describe('isEnvFile', () => {
  it('matches .env files at any depth', () => {
    expect(isEnvFile('.env')).toBe(true);
    expect(isEnvFile('.env.local')).toBe(true);
    expect(isEnvFile('apps/web/.env.production.local')).toBe(true);
    expect(isEnvFile('.envrc')).toBe(true);
  });

  it('matches Cloudflare .dev.vars files', () => {
    expect(isEnvFile('.dev.vars')).toBe(true);
    expect(isEnvFile('worker/.dev.vars.staging')).toBe(true);
  });

  it('ignores other ignored entries', () => {
    expect(isEnvFile('node_modules/')).toBe(false);
    expect(isEnvFile('dist/')).toBe(false);
    expect(isEnvFile('debug.log')).toBe(false);
    expect(isEnvFile('docs/env.md')).toBe(false);
  });
});
