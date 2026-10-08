# Agent guidance

This repo is worktree-tidy, an interactive Bun and TypeScript CLI for cleaning up
linked Git worktrees on Windows and macOS.

## Development rules

- Use test-first development for non-trivial changes. Write or update the test
  first, then implement the change until the test passes.
- When behaviour or tested contracts change, update the relevant expectations
  and rerun the tests after implementing the change.
- Run `bun install` and `bun test` from this repo root before committing. Then
  smoke-test the launcher from a disposable Git repo, checking its exit code.
- Never remove a real user's worktrees while testing. Integration tests create
  temporary repositories and clean them up.
- Keep the primary checkout excluded from removal. Keep deletion confirmations,
  including the extra confirmations for modified and untracked files and for
  ignored env files, which `git worktree remove` deletes without asking.
- Prunable worktrees (folder already gone) must never crash the listing. Don't
  run git inside their path.
- The command must operate on the caller's current directory. Launchers may
  resolve their own path, but must not switch into this clone before running.

## Installers

- Source code stays in this clone. `C:\dev\tools` contains only generated command
  stubs, never copies of the tool's source.
- Write `.bat` files using PowerShell's `-Encoding ASCII`. Keep their contents
  ASCII and quote paths so clones containing spaces work.
- `install.ps1` installs only this tool's CMD stub and Git Bash wrapper. Run it
  again if the clone moves or launcher setup changes. Editing TypeScript does
  not require a reinstall because the stubs point at this clone's `index.ts`.
- `uninstall.ps1` removes only this tool's stubs. Leave shared directories,
  other commands, registry entries, and PATH settings alone.
- `deps.ps1` must be self-contained, idempotent, and runnable directly with
  `.\deps.ps1`. Detect Bun with `Get-Command`, print clear output with `Write-Host`,
  and fail if dependency installation fails. `install.ps1 -SkipDeps` skips it.
- On macOS, `install.sh` runs `bun install` and invokes `install-to-path.sh` to
  link `worktree-tidy` into `~/.local/bin` or a supplied directory. The launcher
  resolves symlinks so it finds this clone's `index.ts`.
- Parse-check every `.ps1` with
  `[System.Management.Automation.Language.Parser]::ParseFile`. Run install and
  uninstall with a temporary `-ToolsDir` before testing the real Windows setup.
- Keep CI free of secrets, model downloads, and hardware requirements.

## Files

- `index.ts`: inquirer prompts and worktree removal.
- `parse-worktrees.ts`: porcelain parsing and linked checkout detection.
- `worktree-rows.ts`: lists worktrees and labels them primary, linked, prunable
  or unreadable.
- `dirty-worktrees.ts`: modified and untracked file detection.
- `ignored-env-files.ts`: ignored `.env*`, `*.env` and `.dev.vars*` file detection,
  including inside ignored folders. Don't use `--directory`, which hides them.
- `*.test.ts`: unit tests and disposable repository/installer integration tests.
- `worktree-tidy` and `run.sh`: POSIX entry points.
- `install.ps1`, `uninstall.ps1`, `deps.ps1`: Windows setup.
- `install.sh` and `install-to-path.sh`: macOS setup.
- `icons/worktree-tidy.png`: FamFamFam Silk icon, Mark James, CC BY 2.5.

## Writing

Write plainly and conversationally. Keep the README's personal context and icon
credit. Use full stops or commas rather than em dashes or en dashes.
