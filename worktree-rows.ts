import { execFileSync } from 'node:child_process';

import { isLinkedWorktree, parseWorktreePorcelain, type ParsedWorktree } from './parse-worktrees';

/**
 * - primary: the main checkout, never removable.
 * - linked: a linked worktree that `git worktree remove` can delete.
 * - prunable: git's record of a worktree whose folder (or its .git file) is gone. Only `git worktree prune` cleans it up.
 * - locked: a linked worktree someone ran `git worktree lock` on. Git won't remove it until it's unlocked.
 * - unreadable: any other checkout git can't open.
 */
export type WorktreeKind = 'primary' | 'linked' | 'prunable' | 'locked' | 'unreadable';

export type WorktreeRow = ParsedWorktree & { kind: WorktreeKind };

function gitWorktreePorcelain(cwd: string): string {
  return execFileSync('git', ['worktree', 'list', '--porcelain'], {
    encoding: 'utf8',
    cwd,
  });
}

function gitDirsForWorktree(worktreePath: string): { gitDir: string; commonDir: string } {
  const [gitDir = '', commonDir = ''] = execFileSync(
    'git',
    ['rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir'],
    { encoding: 'utf8', cwd: worktreePath, stdio: ['ignore', 'pipe', 'ignore'] },
  )
    .trim()
    .split(/\r?\n/);
  return { gitDir, commonDir };
}

function classify(row: ParsedWorktree): WorktreeKind {
  // Running git inside a deleted folder throws ENOENT, so don't try.
  if (row.prunable !== null) return 'prunable';
  // A locked worktree may sit on a drive that isn't mounted, so this check also comes before git runs.
  if (row.locked !== null) return 'locked';
  try {
    return isLinkedWorktree(gitDirsForWorktree(row.path)) ? 'linked' : 'primary';
  } catch {
    return 'unreadable';
  }
}

export function loadWorktreeRows({ cwd }: { cwd: string }): WorktreeRow[] {
  return parseWorktreePorcelain(gitWorktreePorcelain(cwd)).map((row) => ({ ...row, kind: classify(row) }));
}
