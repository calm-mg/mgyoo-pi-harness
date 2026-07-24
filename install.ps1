$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
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
$agentDir = if ($env:PI_CODING_AGENT_DIR) {
    $env:PI_CODING_AGENT_DIR
} else {
    Join-Path $HOME ".pi\agent"
}

if ($env:MGYOO_PI_DRY_RUN -eq "1") {
    Write-Output "[dry-run] repository: $repositoryRoot"
    Write-Output "[dry-run] npm ci --ignore-scripts"
    Write-Output "[dry-run] npm run check; npm run build"
    Write-Output "[dry-run] docker build mgyoo-pi-harness:0.82.0"
    Write-Output "[dry-run] wrappers: $binDir"
    Write-Output "[dry-run] state: $stateDir"
    Write-Output "[dry-run] Pi agent directory: $agentDir"
    return
}

foreach ($commandName in @("git", "node", "npm", "docker")) {
    if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
        throw "Missing dependency: $commandName. See https://github.com/calm-mg/mgyoo-pi-harness#requirements"
    }
}

$nodeMajor = [int]((& node -p 'process.versions.node.split(".")[0]').Trim())
if ($nodeMajor -lt 24) {
    throw "Node.js 24 or newer is required."
}

Push-Location $repositoryRoot
try {
    & npm ci --ignore-scripts
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }
    & npm run check
    if ($LASTEXITCODE -ne 0) { throw "npm run check failed." }
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed." }
    & docker build -t mgyoo-pi-harness:0.82.0 -f container/Dockerfile .
    if ($LASTEXITCODE -ne 0) { throw "Docker build failed." }
}
finally {
    Pop-Location
}

New-Item -ItemType Directory -Force -Path $binDir, $stateDir, $agentDir | Out-Null
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$backupDir = Join-Path $stateDir "backups\$timestamp"
$stageDir = Join-Path $stateDir "stage-$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir, $stageDir | Out-Null

& node (Join-Path $repositoryRoot "scripts\render-wrappers.mjs") `
    windows $repositoryRoot $stageDir
if ($LASTEXITCODE -ne 0) { throw "Wrapper rendering failed." }
foreach ($name in @("pi", "pi-yolo", "pi-login", "pi-doctor", "pi-update")) {
    foreach ($extension in @("cmd", "ps1")) {
        $destination = Join-Path $binDir "$name.$extension"
        if (Test-Path -LiteralPath $destination) {
            Copy-Item -LiteralPath $destination -Destination $backupDir
        }
        $staged = Join-Path $stageDir "$name.$extension"
        Move-Item -LiteralPath $staged -Destination $destination -Force
    }
}

foreach ($managed in @("settings.json", "APPEND_SYSTEM.md")) {
    $existing = Join-Path $agentDir $managed
    if (Test-Path -LiteralPath $existing) {
        Copy-Item -LiteralPath $existing -Destination $backupDir
    }
}
Copy-Item -LiteralPath (Join-Path $repositoryRoot "config\settings.yolo.json") `
    -Destination (Join-Path $agentDir "settings.json") -Force
Copy-Item -LiteralPath (Join-Path $repositoryRoot "config\AGENTS.md") `
    -Destination (Join-Path $agentDir "APPEND_SYSTEM.md") -Force

$manifest = [ordered]@{
    repositoryRoot = $repositoryRoot
    binDir = $binDir
    agentDir = $agentDir
    wrappers = @(
        (Join-Path $binDir "pi.cmd"),
        (Join-Path $binDir "pi-yolo.cmd"),
        (Join-Path $binDir "pi-login.cmd"),
        (Join-Path $binDir "pi-doctor.cmd"),
        (Join-Path $binDir "pi-update.cmd"),
        (Join-Path $binDir "pi.ps1"),
        (Join-Path $binDir "pi-yolo.ps1"),
        (Join-Path $binDir "pi-login.ps1"),
        (Join-Path $binDir "pi-doctor.ps1"),
        (Join-Path $binDir "pi-update.ps1")
    )
    backupDir = $backupDir
}
$manifest | ConvertTo-Json -Depth 3 | Set-Content `
    -LiteralPath (Join-Path $stateDir "install-manifest.json") -Encoding UTF8
Remove-Item -LiteralPath $stageDir

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathEntries = @($userPath -split ";" | Where-Object { $_ })
if ($pathEntries -notcontains $binDir) {
    Write-Output "Adding this user PATH entry: $binDir"
    [Environment]::SetEnvironmentVariable(
        "Path",
        (($pathEntries + $binDir) -join ";"),
        "User"
    )
}
Write-Output "Installed mgyoo Pi Harness. Open a new terminal, then run pi-doctor."
