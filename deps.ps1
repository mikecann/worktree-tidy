# Install the Bun dependencies for worktree-tidy.
$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    throw 'Bun not found. Install from https://bun.sh then re-run install.ps1.'
}

Write-Host "  [worktree-tidy] bun $($(& bun --version | Select-Object -First 1))" -ForegroundColor Green
Push-Location $here
try {
    bun install
    if ($LASTEXITCODE -ne 0) { throw "bun install failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}
