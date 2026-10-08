import { execFileSync } from 'node:child_process';

import { isLinkedWorktreeGitDir, parseWorktreePorcelain, type ParsedWorktree } from './parse-worktrees';

/**
 * - primary: the main checkout, never removable.
 * - linked: a linked worktree that `git worktree remove` can delete.
 * - prunable: git's record of a worktree whose folder (or its .git file) is gone. Only `git worktree prune` cleans it up.
 * - unreadable: any other checkout git can't open (for example a locked worktree on a missing drive).
 */
export type WorktreeKind = 'primary' | 'linked' | 'prunable' | 'unreadable';

export type WorktreeRow = ParsedWorktree & { kind: WorktreeKind };

function gitWorktreePorcelain(cwd: string): string {
  return execFileSync('git', ['worktree', 'list', '--porcelain'], {
    encoding: 'utf8',
    cwd,
  });
}

function gitDirForWorktree(worktreePath: string): string {
  return execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-dir'], {
    encoding: 'utf8',
    cwd: worktreePath,
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function classify(row: ParsedWorktree): WorktreeKind {
  // Running git inside a deleted folder throws ENOENT, so don't try.
  if (row.prunable !== null) return 'prunable';
  try {
    return isLinkedWorktreeGitDir(gitDirForWorktree(row.path)) ? 'linked' : 'primary';
  } catch {
    return 'unreadable';
  }
}

export function loadWorktreeRows({ cwd }: { cwd: string }): WorktreeRow[] {
  return parseWorktreePorcelain(gitWorktreePorcelain(cwd)).map((row) => ({ ...row, kind: classify(row) }));
}
