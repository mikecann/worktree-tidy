import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Shared by the integration tests, so the git identity and cleanup only live in one place.

const tempDirs: string[] = [];

/** Runs git with a fixed identity, so commits work on machines with no git config. */
export function runGit({ cwd, args }: { cwd: string; args: string[] }): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
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
