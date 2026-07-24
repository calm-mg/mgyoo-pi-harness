$ErrorActionPreference = "Stop"

$image = "mgyoo-pi-harness:0.82.0"
$temporaryRoot = (Resolve-Path -LiteralPath ([IO.Path]::GetTempPath())).Path
$workspace = Join-Path $temporaryRoot ("mgyoo-workspace-" + [guid]::NewGuid())
$sentinel = New-TemporaryFile
New-Item -ItemType Directory -Path $workspace | Out-Null
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
        -c "touch /workspace/inside.txt && test ! -e /host-sentinel"
    if ($LASTEXITCODE -ne 0) { throw "Docker boundary probe failed." }

    if (-not (Test-Path -LiteralPath (Join-Path $workspaceResolved "inside.txt"))) {
        throw "The container did not write inside the workspace."
    }
    if (-not (Test-Path -LiteralPath $sentinel.FullName)) {
        throw "The host sentinel was changed."
    }
}
finally {
    Remove-Item -LiteralPath $workspaceResolved -Recurse -Force
    Remove-Item -LiteralPath $sentinel.FullName -Force
}
