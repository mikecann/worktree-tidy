#!/usr/bin/env bun
// Interactive git worktree manager (macOS + Windows).
//
// Usage:
//   worktree-tidy              # run from any directory inside the repo
//   worktree-tidy --force      # pass --force to git worktree remove

import { checkbox, confirm, select } from '@inquirer/prompts';
import { execFileSync } from 'node:child_process';

import { listDirtyWorktrees } from './dirty-worktrees';
import { listIgnoredEnvFiles } from './ignored-env-files';
import { loadWorktreeRows } from './worktree-rows';

function exhaustiveCheck(param: never): never {
  throw new Error(`Exhaustive check failed: ${String(param)}`);
}

function readArgForce(argv: string[]): boolean {
  return argv.includes('--force') || argv.includes('-f');
}

function gitTopLevel(cwd: string): string {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
    cwd,
  }).trim();
}

function gitCommonDir(cwd: string): string {
  return execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    encoding: 'utf8',
    cwd,
  }).trim();
}

function formatBranch(branch: string | null): string {
  if (!branch) return 'detached';
  if (branch.startsWith('refs/heads/')) return branch.slice('refs/heads/'.length);
  return branch;
}

function removeWorktrees(paths: string[], cwd: string, force: boolean): void {
  for (const path of paths) {
    const args = ['worktree', 'remove', path];
    if (force) args.push('--force');
    execFileSync('git', args, { stdio: 'inherit', cwd });
  }
}

function pruneWorktrees(cwd: string): void {
  execFileSync('git', ['worktree', 'prune', '--verbose'], { stdio: 'inherit', cwd });
}

type Action = 'selected' | 'all' | 'prune' | 'exit';

async function main(): Promise<void> {
  const force = readArgForce(process.argv.slice(2));
  const cwd = process.cwd();

  let topLevel: string;
  try {
    topLevel = gitTopLevel(cwd);
  } catch {
    console.error('Not a git repository (run this from inside a checkout).');
    process.exitCode = 1;
    return;
  }

  const commonDir = gitCommonDir(topLevel);
  const rows = loadWorktreeRows({ cwd: topLevel });

  console.log(`Common git dir: ${commonDir}`);
  console.log(`Current checkout: ${topLevel}\n`);
  console.log('Worktrees:');
  for (const row of rows) {
    console.log(`  [${row.kind}] ${row.path}`);
    console.log(`          ${formatBranch(row.branch)}`);
    if (row.prunable) console.log(`          ${row.prunable}`);
  }
  console.log('');

  const linked = rows.filter((r) => r.kind === 'linked');
  const prunable = rows.filter((r) => r.kind === 'prunable');
  if (linked.length === 0 && prunable.length === 0) {
    console.log('No linked worktrees to remove.');
    return;
  }

  const choices: { name: string; value: Action }[] = [];
  if (linked.length > 0) {
    choices.push(
      { name: 'Remove selected linked worktrees', value: 'selected' },
      { name: `Remove all linked worktrees (${linked.length})`, value: 'all' },
    );
  }
  if (prunable.length > 0) {
    choices.push({
      name: `Prune stale worktree records whose folders are gone (${prunable.length})`,
      value: 'prune',
    });
  }
  choices.push({ name: 'Exit', value: 'exit' });

  const action = await select<Action>({ message: 'What do you want to do?', choices });

  if (action === 'exit') return;

  if (action === 'prune') {
    pruneWorktrees(topLevel);
    console.log('Done.');
    return;
  }

  let targets: string[] = [];
  if (action === 'all') targets = linked.map((r) => r.path);
  else if (action === 'selected') {
    const picked = await checkbox({
      message: 'Choose worktrees to remove',
      choices: linked.map((r) => ({
        name: `${r.path} (${formatBranch(r.branch)})`,
        value: r.path,
      })),
      required: true,
    });
    targets = picked;
  } else exhaustiveCheck(action);

  if (targets.length === 0) {
    console.log('Nothing selected.');
    return;
  }

  const dirtyWorktrees = listDirtyWorktrees({ paths: targets });
  if (dirtyWorktrees.length > 0) {
    console.log('These worktrees have local changes that would be deleted:');
    for (const worktree of dirtyWorktrees) {
      console.log(`\n${worktree.path}`);
      for (const change of worktree.changes) console.log(`  ${change}`);
    }
    console.log('');

    const acceptDirtyDelete = await confirm({
      message: `Delete the changes shown above and force-remove ${dirtyWorktrees.length} dirty worktree(s)?`,
      default: false,
    });

    if (!acceptDirtyDelete) {
      console.log('Cancelled.');
      return;
    }
  }

  const envWorktrees = listIgnoredEnvFiles({ paths: targets });
  if (envWorktrees.length > 0) {
    console.log('These worktrees have ignored env files that git deletes along with the worktree:');
    for (const worktree of envWorktrees) {
      console.log(`\n${worktree.path}`);
      for (const file of worktree.files) console.log(`  ${file}`);
    }
    console.log('');

    const acceptEnvDelete = await confirm({
      message: `Delete the env files shown above with ${envWorktrees.length} worktree(s)? Copy out anything you need first.`,
      default: false,
    });

    if (!acceptEnvDelete) {
      console.log('Cancelled.');
      return;
    }
  }

  const shouldForce = force || dirtyWorktrees.length > 0;
  const forceNote = shouldForce ? 'with --force' : 'without --force';
  const ok = await confirm({
    message: `Remove ${targets.length} worktree(s) ${forceNote}?\n${targets.join('\n')}`,
    default: false,
  });

  if (!ok) {
    console.log('Cancelled.');
    return;
  }

  removeWorktrees(targets, topLevel, shouldForce);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
