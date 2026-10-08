import { afterEach, describe, expect, it } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';

import { loadWorktreeRows, type WorktreeRow } from './worktree-rows';

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

// Git prints its own spelling of each path (forward slashes and resolved temp
// dirs on some platforms), so compare folder names rather than full paths.
// Sorted so the result doesn't depend on the order git lists linked worktrees.
function summarize(rows: WorktreeRow[]): { name: string; kind: WorktreeRow['kind'] }[] {
  return rows
    .map((row) => ({ name: basename(row.path), kind: row.kind }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function createRepoWithWorktrees(): { mainPath: string; gonePath: string } {
  const root = mkdtempSync(join(tmpdir(), 'worktree-tidy-rows-'));
  tempDirs.push(root);

  const mainPath = join(root, 'main');
  const keptPath = join(root, 'wt-1-kept');
  const gonePath = join(root, 'wt-2-gone');

  runGit({ cwd: root, args: ['init', '--initial-branch=main', mainPath] });
  writeFileSync(join(mainPath, 'tracked.txt'), 'baseline\n');
  runGit({ cwd: mainPath, args: ['add', '.'] });
  runGit({ cwd: mainPath, args: ['commit', '-m', 'initial'] });
  runGit({ cwd: mainPath, args: ['worktree', 'add', keptPath, '-b', 'kept'] });
  runGit({ cwd: mainPath, args: ['worktree', 'add', gonePath, '-b', 'gone'] });

  return { mainPath, gonePath };
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0, tempDirs.length)) rmSync(tempDir, { force: true, recursive: true });
});

describe('loadWorktreeRows integration', () => {
  it('labels the primary checkout and linked worktrees', () => {
    const { mainPath } = createRepoWithWorktrees();

    expect(summarize(loadWorktreeRows({ cwd: mainPath }))).toEqual([
      { name: 'main', kind: 'primary' },
      { name: 'wt-1-kept', kind: 'linked' },
      { name: 'wt-2-gone', kind: 'linked' },
    ]);
  });

  it('marks a worktree whose folder was deleted as prunable instead of throwing', () => {
    const { mainPath, gonePath } = createRepoWithWorktrees();
    rmSync(gonePath, { force: true, recursive: true });

    const rows = loadWorktreeRows({ cwd: mainPath });
    expect(summarize(rows)).toEqual([
      { name: 'main', kind: 'primary' },
      { name: 'wt-1-kept', kind: 'linked' },
      { name: 'wt-2-gone', kind: 'prunable' },
    ]);
    expect(rows[2]?.prunable).toBeTruthy();
  });
});
