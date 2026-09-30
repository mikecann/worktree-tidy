param([string]$ToolsDir = 'C:\dev\tools')
$ErrorActionPreference = 'Stop'

# Leave the shared tools directory, its PATH entry, and all other tools alone.
foreach ($name in @('worktree-tidy.bat', 'worktree-tidy')) {
    $path = Join-Path $ToolsDir $name
    if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path }
}
Write-Host 'Removed worktree-tidy command stubs.' -ForegroundColor Green
