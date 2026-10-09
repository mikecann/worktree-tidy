export type ParsedWorktree = {
  path: string;
  head: string;
  branch: string | null;
  /** Git's reason when the worktree's folder is gone and `git worktree prune` would drop it. */
  prunable: string | null;
  /** The lock reason when the worktree is locked. `git worktree remove` refuses locked worktrees. */
  locked: string | null;
};

export function parseWorktreePorcelain(output: string): ParsedWorktree[] {
  const trimmed = output.trim();
  if (!trimmed) return [];

  const blocks = trimmed.split(/\n\n+/);
  const result: ParsedWorktree[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    let path = '';
    let head = '';
    let branch: string | null = null;
    let prunable: string | null = null;
    let locked: string | null = null;

    for (const line of lines) {
      if (line.startsWith('worktree ')) path = line.slice('worktree '.length).trim();
      else if (line.startsWith('HEAD ')) head = line.slice('HEAD '.length).trim();
      else if (line.startsWith('branch ')) branch = line.slice('branch '.length).trim();
      else if (line === 'detached') branch = null;
      else if (line === 'prunable' || line.startsWith('prunable ')) {
        prunable = line.slice('prunable'.length).trim() || 'prunable';
      } else if (line === 'locked' || line.startsWith('locked ')) {
        locked = line.slice('locked'.length).trim() || 'no reason given';
      }
    }

    if (path) result.push({ path, head, branch, prunable, locked });
  }

  return result;
}

/**
 * True when this checkout is a linked worktree (a target for `git worktree remove`).
 * A linked worktree gets its own git dir inside the shared common dir, while the primary
 * checkout uses the common dir itself. Comparing the two also works for repos made with
 * `--separate-git-dir`, where the common dir isn't called `.git`.
 */
export function isLinkedWorktree({ gitDir, commonDir }: { gitDir: string; commonDir: string }): boolean {
  const normalize = (dir: string) => dir.replace(/\\/g, '/').replace(/\/+$/, '');
  return normalize(gitDir) !== normalize(commonDir);
}
