import { execFileSync } from 'node:child_process';

export type WorktreeEnvFiles = {
  path: string;
  files: string[];
};

/**
 * `git worktree remove` deletes ignored files without asking, even without --force.
 * Most of those are rebuildable (node_modules, dist), but env files usually hold
 * keys that only exist in that folder, so they're worth a warning.
 */
export function isEnvFile(entry: string): boolean {
  const name = entry.replace(/\/+$/, '').split('/').pop() ?? '';
  return name.startsWith('.env') || name.startsWith('.dev.vars');
}

function gitIgnoredEntries({ worktreePath }: { worktreePath: string }): string[] {
  // --directory collapses fully ignored folders like node_modules/ into one entry,
  // so this stays fast and doesn't flag env files inside dependencies.
  const output = execFileSync(
    'git',
    ['ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--directory'],
    { encoding: 'utf8', cwd: worktreePath },
  );
  return output.split('\0').filter(Boolean);
}

export function listIgnoredEnvFiles({ paths }: { paths: string[] }): WorktreeEnvFiles[] {
  return paths
    .map((path) => ({ path, files: gitIgnoredEntries({ worktreePath: path }).filter(isEnvFile).sort() }))
    .filter(({ files }) => files.length > 0);
}
