# Install only worktree-tidy's command stubs, leaving the caller's cwd intact.
param(
    [string]$ToolsDir = 'C:\dev\tools',
    [switch]$SkipDeps
)
$ErrorActionPreference = 'Stop'

if ($PSScriptRoot -match '[^\x00-\x7F]') {
    throw 'Clone into a path containing only ASCII characters so the .bat stub can use it.'
}
if (-not $SkipDeps) { & (Join-Path $PSScriptRoot 'deps.ps1') }
New-Item -ItemType Directory -Path $ToolsDir -Force | Out-Null

$batContent = @"
@echo off
bun run "$PSScriptRoot\index.ts" %*
"@
Set-Content -Path (Join-Path $ToolsDir 'worktree-tidy.bat') -Value $batContent -Encoding ASCII

# Match the original installer's Git Bash wrapper as well as its CMD stub.
$bashContent = @'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/worktree-tidy.bat" "$@"
'@
Set-Content -Path (Join-Path $ToolsDir 'worktree-tidy') -Value $bashContent -Encoding ASCII
Write-Host "Installed worktree-tidy in $ToolsDir" -ForegroundColor Green
Write-Host "Add $ToolsDir to your PATH if needed, then open a new terminal."
