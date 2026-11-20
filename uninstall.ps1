[CmdletBinding()]
param([switch]$DryRun)

$ErrorActionPreference = "Stop"
if (-not (Get-Command node -CommandType Application -ErrorAction SilentlyContinue)) {
    throw "Install Node.js 24 or newer (https://nodejs.org/), add node to PATH, then retry."
}
& node -e 'process.exit(parseInt(process.versions.node) >= 24 ? 0 : 1)'
if ($LASTEXITCODE -ne 0) { throw "Upgrade to Node.js 24 or newer (https://nodejs.org/), then retry." }
$options = @()
if ($DryRun) { $options += "--dry-run" }
& node (Join-Path $PSScriptRoot "scripts/bootstrap.mjs") uninstall @options
exit $LASTEXITCODE
