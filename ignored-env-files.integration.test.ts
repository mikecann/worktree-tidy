import { afterEach, describe, expect, it } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { listIgnoredEnvFiles } from './ignored-env-files';

const tempDirs: string[] = [];

function runGit({ cwd, args }: { cwd: string; args: string[] }): string {
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

function createRepoWithWorktrees(): { cleanPath: string; envPath: string } {
  const root = mkdtempSync(join(tmpdir(), 'worktree-tidy-env-'));
  tempDirs.push(root);

  const mainPath = join(root, 'main');
  const cleanPath = join(root, 'wt-clean');
  const envPath = join(root, 'wt-env');

  runGit({ cwd: root, args: ['init', '--initial-branch=main', mainPath] });
  writeFileSync(join(mainPath, '.gitignore'), '.env*\n.dev.vars\nnode_modules/\n');
  mkdirSync(join(mainPath, 'apps', 'web'), { recursive: true });
  writeFileSync(join(mainPath, 'apps', 'web', 'page.ts'), 'export {};\n');
  runGit({ cwd: mainPath, args: ['add', '.'] });
  runGit({ cwd: mainPath, args: ['commit', '-m', 'initial'] });
  runGit({ cwd: mainPath, args: ['worktree', 'add', cleanPath, '-b', 'clean'] });
  runGit({ cwd: mainPath, args: ['worktree', 'add', envPath, '-b', 'env'] });

  return { cleanPath, envPath };
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0, tempDirs.length)) rmSync(tempDir, { force: true, recursive: true });
});

describe('listIgnoredEnvFiles integration', () => {
  it('returns ignored env files that git worktree remove would delete', () => {
    const { cleanPath, envPath } = createRepoWithWorktrees();

    writeFileSync(join(envPath, '.env.local'), 'TOKEN=test\n');
    writeFileSync(join(envPath, '.dev.vars'), 'TOKEN=test\n');
    writeFileSync(join(envPath, 'apps', 'web', '.env'), 'TOKEN=test\n');
    // Files inside an ignored dependency folder are not worth a warning.
    mkdirSync(join(envPath, 'node_modules', 'pkg'), { recursive: true });
    writeFileSync(join(envPath, 'node_modules', 'pkg', '.env'), 'TOKEN=test\n');
    mkdirSync(join(cleanPath, 'node_modules'), { recursive: true });
    writeFileSync(join(cleanPath, 'node_modules', 'index.js'), '\n');

    const found = listIgnoredEnvFiles({ paths: [cleanPath, envPath] });
    expect(found).toEqual([{ path: envPath, files: ['.dev.vars', '.env.local', 'apps/web/.env'] }]);
  });

  it('returns an empty list when no worktree has ignored env files', () => {
    const { cleanPath, envPath } = createRepoWithWorktrees();
    expect(listIgnoredEnvFiles({ paths: [cleanPath, envPath] })).toEqual([]);
  });
});
