import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Shared by the integration tests, so the git identity and cleanup only live in one place.

const tempDirs: string[] = [];

/**
 * Runs git with a fixed identity and none of the machine's global or system config,
 * so settings like commit.gpgsign can't make the tests prompt, hang or fail.
 */
export function runGit({ cwd, args }: { cwd: string; args: string[] }): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      // Git treats /dev/null as an empty file on every platform, Windows included.
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: 'Test User',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test User',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
  });
}

export function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

/** Pass to afterEach so every temporary repo is deleted after its test. */
export function removeTempDirs(): void {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { force: true, recursive: true });
}
