import { execFileSync } from 'node:child_process';

export type WorktreeEnvFiles = {
  path: string;
  files: string[];
};

/**
 * `git worktree remove` deletes ignored files without asking, even without --force.
 * Most of those are rebuildable (node_modules, dist), but env files usually hold
 * keys that only exist in that folder, so they're worth a warning.
 *
 * These pathspecs match `.env*`, `*.env` and `.dev.vars*` files at any depth,
 * including inside folders that are ignored as a whole (like `.vercel/`, where
 * `vercel pull` writes its env files). Env files inside node_modules belong to
 * dependencies, so they're skipped.
 */
const ENV_FILE_PATHSPECS = [
  ':(glob)**/.env*',
  ':(glob)**/*.env',
  ':(glob)**/.dev.vars*',
  ':(exclude,glob)**/node_modules/**',
];

function gitIgnoredEnvFiles({ worktreePath }: { worktreePath: string }): string[] {
  const output = execFileSync(
    'git',
    ['ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--', ...ENV_FILE_PATHSPECS],
    { encoding: 'utf8', cwd: worktreePath },
  );
  return output.split('\0').filter(Boolean);
}

export function listIgnoredEnvFiles({ paths }: { paths: string[] }): WorktreeEnvFiles[] {
  return paths
    .map((path) => ({ path, files: gitIgnoredEnvFiles({ worktreePath: path }).sort() }))
    .filter(({ files }) => files.length > 0);
}
