#!/usr/bin/env bash
# Install dependencies and link the command onto PATH. Re-run if the clone moves.
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target_dir="$HOME/.local/bin"
skip_deps=0
for arg in "$@"; do
  case "$arg" in
    --skip-deps) skip_deps=1 ;;
    -h|--help)
      echo 'Usage: install.sh [target_bin_dir] [--skip-deps]'
      exit 0 ;;
    -*) echo "Unknown option: $arg" >&2; exit 1 ;;
    *) target_dir="$arg" ;;
  esac
done

if [[ "$skip_deps" -eq 0 ]]; then
  command -v bun >/dev/null 2>&1 || { echo 'Install Bun from https://bun.sh first.' >&2; exit 1; }
  (cd "$repo_dir" && bun install)
fi
bash "$repo_dir/install-to-path.sh" "$target_dir"
