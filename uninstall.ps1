[CmdletBinding()]
param(
    [switch]$Purge,
    [string]$ConfirmPurge
)

$ErrorActionPreference = "Stop"
$binDir = if ($env:MGYOO_PI_BIN_DIR) {
    $env:MGYOO_PI_BIN_DIR
} else {
    Join-Path $env:LOCALAPPDATA "mgyoo-pi-harness\bin"
}
$stateDir = if ($env:MGYOO_PI_STATE_DIR) {
    $env:MGYOO_PI_STATE_DIR
} else {
    Join-Path $env:LOCALAPPDATA "mgyoo-pi-harness\state"
}
$manifestPath = Join-Path $stateDir "install-manifest.json"

if (Test-Path -LiteralPath $manifestPath) {
    $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
    foreach ($wrapper in $manifest.wrappers) {
        $resolvedParent = (Resolve-Path -LiteralPath (Split-Path -Parent $wrapper)).Path
        $expectedParent = (Resolve-Path -LiteralPath $binDir).Path
        if ($resolvedParent -ne $expectedParent) {
            Write-Warning "Refusing unmanaged path: $wrapper"
            continue
        }
        if (Test-Path -LiteralPath $wrapper) {
            Remove-Item -LiteralPath $wrapper -Force
        }
    }
} else {
    foreach ($name in @("pi", "pi-yolo", "pi-login", "pi-doctor", "pi-update")) {
        $wrapper = Join-Path $binDir "$name.cmd"
        if (Test-Path -LiteralPath $wrapper) {
            Remove-Item -LiteralPath $wrapper -Force
        }
    }
}

Write-Output "Wrappers removed. Auth, sessions, backups, and Docker volume were preserved."

if ($Purge) {
    if ($ConfirmPurge -ne "mgyoo-pi-harness") {
        $typed = Read-Host "Type PURGE to remove $stateDir and Docker volume mgyoo-pi-safe-agent"
        if ($typed -ne "PURGE") { throw "Purge cancelled." }
    }
    & docker volume rm mgyoo-pi-safe-agent 2>$null
    if (Test-Path -LiteralPath $stateDir) {
        $resolvedState = (Resolve-Path -LiteralPath $stateDir).Path
        if ([IO.Path]::GetFileName($resolvedState) -notin @("state", "mgyoo-pi-harness")) {
            throw "Refusing to purge unexpected state directory: $resolvedState"
        }
        Remove-Item -LiteralPath $resolvedState -Recurse -Force
    }
}
