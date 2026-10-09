import { afterEach, describe, expect, it } from 'bun:test';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { listDirtyWorktrees } from './dirty-worktrees';
import { createTempDir, removeTempDirs, runGit } from './test-helpers';

function createRepoWithWorktrees(): { mainPath: string; cleanPath: string; dirtyPath: string } {
  const root = createTempDir('worktree-tidy-it-');

  const mainPath = join(root, 'main');
  const cleanPath = join(root, 'wt-clean');
  const dirtyPath = join(root, 'wt-dirty');

  runGit({ cwd: root, args: ['init', '--initial-branch=main', mainPath] });
  writeFileSync(join(mainPath, 'tracked.txt'), 'baseline\n');
  runGit({ cwd: mainPath, args: ['add', '.'] });
  runGit({ cwd: mainPath, args: ['commit', '-m', 'initial'] });

  runGit({ cwd: mainPath, args: ['branch', 'clean'] });
  runGit({ cwd: mainPath, args: ['branch', 'dirty'] });
  runGit({ cwd: mainPath, args: ['worktree', 'add', cleanPath, 'clean'] });
  runGit({ cwd: mainPath, args: ['worktree', 'add', dirtyPath, 'dirty'] });

  return { mainPath, cleanPath, dirtyPath };
}

afterEach(removeTempDirs);

describe('listDirtyWorktrees integration', () => {
  it('returns only dirty linked worktrees', () => {
    const { cleanPath, dirtyPath } = createRepoWithWorktrees();

    writeFileSync(join(dirtyPath, 'tracked.txt'), 'updated\n');
    writeFileSync(join(dirtyPath, 'new-untracked.txt'), 'new file\n');

    const dirty = listDirtyWorktrees({ paths: [cleanPath, dirtyPath] });
    expect(dirty).toHaveLength(1);
    expect(dirty[0]?.path).toBe(dirtyPath);
    expect(dirty[0]?.changes.some((line) => line.endsWith('tracked.txt'))).toBe(true);
    expect(dirty[0]?.changes.some((line) => line.endsWith('new-untracked.txt'))).toBe(true);
  });

  it('returns untracked files when status config hides them', () => {
    const { cleanPath, dirtyPath, mainPath } = createRepoWithWorktrees();

    runGit({ cwd: mainPath, args: ['config', 'status.showUntrackedFiles', 'no'] });
    writeFileSync(join(dirtyPath, 'new-untracked.txt'), 'new file\n');

    const dirty = listDirtyWorktrees({ paths: [cleanPath, dirtyPath] });
    expect(dirty).toHaveLength(1);
    expect(dirty[0]?.path).toBe(dirtyPath);
    expect(dirty[0]?.changes.some((line) => line.endsWith('new-untracked.txt'))).toBe(true);
  });

  it('returns an empty list when every worktree is clean', () => {
    const { cleanPath, dirtyPath } = createRepoWithWorktrees();
    const dirty = listDirtyWorktrees({ paths: [cleanPath, dirtyPath] });
    expect(dirty).toEqual([]);
  });
});
