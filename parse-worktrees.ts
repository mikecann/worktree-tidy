export type ParsedWorktree = {
  path: string;
  head: string;
  branch: string | null;
  /** Git's reason when the worktree's folder is gone and `git worktree prune` would drop it. */
  prunable: string | null;
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

    for (const line of lines) {
      if (line.startsWith('worktree ')) path = line.slice('worktree '.length).trim();
      else if (line.startsWith('HEAD ')) head = line.slice('HEAD '.length).trim();
      else if (line.startsWith('branch ')) branch = line.slice('branch '.length).trim();
      else if (line === 'detached') branch = null;
      else if (line === 'prunable' || line.startsWith('prunable ')) {
        prunable = line.slice('prunable'.length).trim() || 'prunable';
      }
    }

    if (path) result.push({ path, head, branch, prunable });
  }

  return result;
}

/** True when this checkout is a linked worktree (safe target for `git worktree remove`). */
export function isLinkedWorktreeGitDir(gitDir: string): boolean {
  const normalized = gitDir.replace(/\\/g, '/');
  return /\.git\/worktrees\//i.test(normalized);
}
