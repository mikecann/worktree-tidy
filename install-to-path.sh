#!/usr/bin/env bash
# Link worktree-tidy into a directory on your PATH (default: ~/.local/bin).
set -euo pipefail

target_dir="${1:-$HOME/.local/bin}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
src="$here/worktree-tidy"
dest="$target_dir/worktree-tidy"

if [[ ! -f "$src" ]]; then
  echo "install-to-path: missing launcher at $src" >&2
  exit 1
fi

mkdir -p "$target_dir"
chmod +x "$src"
ln -sf "$src" "$dest"

echo "Installed: $dest (points to $here/index.ts)"
echo ""
echo "Open a new terminal and run: worktree-tidy"
echo "If command not found, add this to ~/.zshrc (or ~/.bashrc):"
printf '  export PATH=%q:"$PATH"\n' "$target_dir"
