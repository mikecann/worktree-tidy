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

function gitPath(worktreePath: string, flag: '--git-dir' | '--git-common-dir'): string {
  // One query per call, and only git's own line ending is removed, so a path that
  // contains a newline still compares as a whole.
  return execFileSync('git', ['rev-parse', '--path-format=absolute', flag], {
    encoding: 'utf8',
    cwd: worktreePath,
    stdio: ['ignore', 'pipe', 'ignore'],
  }).replace(/\r?\n$/, '');
}

function classify(row: ParsedWorktree): WorktreeKind {
  // Running git inside a deleted folder throws ENOENT, so don't try.
  if (row.prunable !== null) return 'prunable';
  // A locked worktree may sit on a drive that isn't mounted, so this check also comes before git runs.
  if (row.locked !== null) return 'locked';
  try {
    const gitDir = gitPath(row.path, '--git-dir');
    const commonDir = gitPath(row.path, '--git-common-dir');
    return isLinkedWorktree({ gitDir, commonDir }) ? 'linked' : 'primary';
  } catch {
    return 'unreadable';
  }
}

export function loadWorktreeRows({ cwd }: { cwd: string }): WorktreeRow[] {
  return parseWorktreePorcelain(gitWorktreePorcelain(cwd)).map((row) => ({ ...row, kind: classify(row) }));
}
