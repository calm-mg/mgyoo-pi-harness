$ErrorActionPreference = "Stop"

$image = "mgyoo-pi-harness:0.82.0"
$temporaryRoot = (Resolve-Path -LiteralPath ([IO.Path]::GetTempPath())).Path
$probeRoot = Join-Path $temporaryRoot ("mgyoo-probe-" + [guid]::NewGuid())
$workspace = Join-Path $probeRoot "workspace"
$sentinel = Join-Path $probeRoot "outside-sentinel"
$identityVolume = "mgyoo-pi-smoke-" + [guid]::NewGuid().ToString("N")
New-Item -ItemType Directory -Path $workspace | Out-Null
Set-Content -LiteralPath $sentinel -Value "unchanged" -NoNewline
$workspaceResolved = (Resolve-Path -LiteralPath $workspace).Path

if (-not $workspaceResolved.StartsWith($temporaryRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to use a workspace outside the temporary directory."
}

try {
    docker build -t $image -f container/Dockerfile .
    if ($LASTEXITCODE -ne 0) { throw "Docker build failed." }

    docker run --rm --entrypoint sh `
        --mount "type=bind,source=$workspaceResolved,target=/workspace" `
        $image `
        -c "touch /workspace/inside.txt && test ! -e /workspace/../outside-sentinel && test -f /opt/mgyoo-pi-harness/agent-template/extensions/workspace-guard/index.ts"
    if ($LASTEXITCODE -ne 0) { throw "Docker boundary probe failed." }

    if (-not (Test-Path -LiteralPath (Join-Path $workspaceResolved "inside.txt"))) {
        throw "The container did not write inside the workspace."
    }
    if ((Get-Content -Raw -LiteralPath $sentinel) -ne "unchanged") {
        throw "The adjacent host sentinel was changed."
    }

    docker volume create $identityVolume | Out-Null
    docker run --rm `
        --env MGYOO_HOST_UID=12345 `
        --env MGYOO_HOST_GID=12345 `
        --mount "type=volume,source=$identityVolume,target=/pi-agent" `
        $image --version | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Non-root entrypoint probe failed." }

    $owner = docker run --rm --entrypoint stat `
        --mount "type=volume,source=$identityVolume,target=/pi-agent" `
        $image -c "%u:%g" /pi-agent/settings.json
    if ($LASTEXITCODE -ne 0 -or $owner.Trim() -ne "12345:12345") {
        throw "Safe state is not owned by the mapped host identity."
    }
}
finally {
    docker volume rm $identityVolume 2>$null | Out-Null
    Remove-Item -LiteralPath $probeRoot -Recurse -Force
}
