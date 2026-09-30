import { afterEach, describe, expect, it } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// Exercise the installed command from another directory. This catches launchers
// that accidentally look for index.ts next to the symlink or change the caller's cwd.
describe.skipIf(process.platform === 'win32')('POSIX installation', () => {
  it('installs from a path with spaces, forwards arguments and preserves cwd', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'worktree-tidy-install-')));
    tempDirs.push(root);
    const repo = join(root, 'clone with spaces');
    mkdirSync(repo);
    for (const file of ['install.sh', 'install-to-path.sh', 'worktree-tidy']) {
      cpSync(join(import.meta.dir, file), join(repo, file));
    }
    const fakeBun = join(root, 'bun');
    const log = join(root, 'bun.log');
    writeFileSync(fakeBun, '#!/usr/bin/env bash\nprintf "%s\\n" "$PWD" "$@" >> "$BUN_TEST_LOG"\n');
    chmodSync(fakeBun, 0o755);
    const env = { ...process.env, PATH: `${root}:${process.env.PATH}`, BUN_TEST_LOG: log };
    const bin = join(root, 'bin with spaces');

    execFileSync('bash', [join(repo, 'install.sh'), bin], { cwd: root, env });
    expect(readFileSync(log, 'utf8')).toBe(`${repo}\ninstall\n`);
    writeFileSync(log, '');
    execFileSync('bash', [join(repo, 'install.sh'), bin, '--skip-deps'], { cwd: root, env });
    execFileSync(join(bin, 'worktree-tidy'), ['--force', 'argument with spaces'], { cwd: root, env });
    expect(readFileSync(log, 'utf8')).toBe(`${root}\nrun\n${repo}/index.ts\n--force\nargument with spaces\n`);
  });
});
