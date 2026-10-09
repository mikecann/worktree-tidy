import { afterEach, describe, expect, it } from 'bun:test';
import { rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { createTempDir, removeTempDirs, runGit } from './test-helpers';
import { loadWorktreeRows, type WorktreeRow } from './worktree-rows';

// Git prints its own spelling of each path (forward slashes and resolved temp
// dirs on some platforms), so compare folder names rather than full paths.
// Sorted so the result doesn't depend on the order git lists linked worktrees.
function summarize(rows: WorktreeRow[]): { name: string; kind: WorktreeRow['kind'] }[] {
  return rows
    .map((row) => ({ name: basename(row.path), kind: row.kind }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function createRepoWithWorktrees({ initArgs = [] }: { initArgs?: string[] } = {}): {
  mainPath: string;
  keptPath: string;
  gonePath: string;
} {
  const root = createTempDir('worktree-tidy-rows-');

  const mainPath = join(root, 'main');
  const keptPath = join(root, 'wt-1-kept');
  const gonePath = join(root, 'wt-2-gone');

  runGit({ cwd: root, args: ['init', '--initial-branch=main', ...initArgs, mainPath] });
  writeFileSync(join(mainPath, 'tracked.txt'), 'baseline\n');
  runGit({ cwd: mainPath, args: ['add', '.'] });
  runGit({ cwd: mainPath, args: ['commit', '-m', 'initial'] });
  runGit({ cwd: mainPath, args: ['worktree', 'add', keptPath, '-b', 'kept'] });
  runGit({ cwd: mainPath, args: ['worktree', 'add', gonePath, '-b', 'gone'] });

  return { mainPath, keptPath, gonePath };
}

afterEach(removeTempDirs);

describe('loadWorktreeRows integration', () => {
  it('labels the primary checkout and linked worktrees', () => {
    const { mainPath } = createRepoWithWorktrees();

    expect(summarize(loadWorktreeRows({ cwd: mainPath }))).toEqual([
      { name: 'main', kind: 'primary' },
      { name: 'wt-1-kept', kind: 'linked' },
      { name: 'wt-2-gone', kind: 'linked' },
    ]);
  });

  it('labels linked worktrees when the git dir lives outside the checkout', () => {
    // `git init --separate-git-dir` leaves nothing called `.git/worktrees` in the linked git dirs.
    const store = join(createTempDir('worktree-tidy-store-'), 'store');
    const { mainPath } = createRepoWithWorktrees({ initArgs: [`--separate-git-dir=${store}`] });

    // Git lists the primary checkout at the git dir's path in this layout, so it shows up as `store`.
    expect(summarize(loadWorktreeRows({ cwd: mainPath }))).toEqual([
      { name: 'store', kind: 'primary' },
      { name: 'wt-1-kept', kind: 'linked' },
      { name: 'wt-2-gone', kind: 'linked' },
    ]);
  });

  it('marks a locked worktree as locked, so it is never offered for removal', () => {
    const { mainPath, keptPath } = createRepoWithWorktrees();
    runGit({ cwd: mainPath, args: ['worktree', 'lock', '--reason', 'on a USB drive', keptPath] });

    const rows = loadWorktreeRows({ cwd: mainPath });
    expect(summarize(rows)).toEqual([
      { name: 'main', kind: 'primary' },
      { name: 'wt-1-kept', kind: 'locked' },
      { name: 'wt-2-gone', kind: 'linked' },
    ]);
    expect(rows.find((row) => basename(row.path) === 'wt-1-kept')?.locked).toBe('on a USB drive');
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
    expect(rows.find((row) => basename(row.path) === 'wt-2-gone')?.prunable).toBeTruthy();
  });
});
