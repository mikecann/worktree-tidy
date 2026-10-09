import { describe, expect, it } from 'bun:test';
import { isLinkedWorktree, parseWorktreePorcelain } from './parse-worktrees';

describe('parseWorktreePorcelain', () => {
  it('parses multiple records', () => {
    const sample = `
worktree /repo/main
HEAD abcdef
branch refs/heads/main

worktree /repo/wt1
HEAD abcdef
branch refs/heads/feature

`.trim();

    const rows = parseWorktreePorcelain(sample);
    expect(rows).toEqual([
      { path: '/repo/main', head: 'abcdef', branch: 'refs/heads/main', prunable: null, locked: null },
      { path: '/repo/wt1', head: 'abcdef', branch: 'refs/heads/feature', prunable: null, locked: null },
    ]);
  });

  it('handles detached', () => {
    const sample = `
worktree /repo/detached
HEAD deadbeef
detached
`.trim();

    expect(parseWorktreePorcelain(sample)).toEqual([
      { path: '/repo/detached', head: 'deadbeef', branch: null, prunable: null, locked: null },
    ]);
  });

  it('keeps the reason git gives for a prunable worktree', () => {
    const sample = `
worktree /repo/main
HEAD abcdef
branch refs/heads/main

worktree /repo/gone
HEAD abcdef
branch refs/heads/gone
prunable gitdir file points to non-existent location
`.trim();

    expect(parseWorktreePorcelain(sample)).toEqual([
      { path: '/repo/main', head: 'abcdef', branch: 'refs/heads/main', prunable: null, locked: null },
      {
        path: '/repo/gone',
        head: 'abcdef',
        branch: 'refs/heads/gone',
        prunable: 'gitdir file points to non-existent location',
        locked: null,
      },
    ]);
  });

  it('keeps the lock reason, with a fallback when the lock has none', () => {
    const sample = `
worktree /repo/usb
HEAD abcdef
branch refs/heads/usb
locked on a USB drive

worktree /repo/held
HEAD abcdef
detached
locked
`.trim();

    expect(parseWorktreePorcelain(sample)).toEqual([
      { path: '/repo/usb', head: 'abcdef', branch: 'refs/heads/usb', prunable: null, locked: 'on a USB drive' },
      { path: '/repo/held', head: 'abcdef', branch: null, prunable: null, locked: 'no reason given' },
    ]);
  });
});

describe('isLinkedWorktree', () => {
  it('detects a linked worktree on posix paths', () => {
    expect(isLinkedWorktree({ gitDir: '/Users/me/proj/.git/worktrees/foo', commonDir: '/Users/me/proj/.git' })).toBe(true);
  });

  it('detects a linked worktree on Windows paths', () => {
    expect(
      isLinkedWorktree({ gitDir: String.raw`C:\dev\repo\.git\worktrees\3qwv`, commonDir: 'C:/dev/repo/.git' }),
    ).toBe(true);
  });

  it('detects a linked worktree when the git dir lives outside the checkout', () => {
    expect(isLinkedWorktree({ gitDir: '/srv/git/proj/worktrees/foo', commonDir: '/srv/git/proj' })).toBe(true);
  });

  it('returns false for the primary checkout', () => {
    expect(isLinkedWorktree({ gitDir: '/Users/me/proj/.git', commonDir: '/Users/me/proj/.git/' })).toBe(false);
  });
});
