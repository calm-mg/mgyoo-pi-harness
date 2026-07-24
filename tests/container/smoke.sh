#!/bin/sh
set -eu

image="mgyoo-pi-harness:0.82.0"
probe_root="$(mktemp -d)"
workspace="$probe_root/workspace"
sentinel="$probe_root/outside-sentinel"
identity_volume="mgyoo-pi-smoke-$$"
mkdir "$workspace"
printf 'unchanged\n' >"$sentinel"

cleanup() {
  docker volume rm "$identity_volume" >/dev/null 2>&1 || true
  rm -r "$probe_root"
}
trap cleanup EXIT

docker build -t "$image" -f container/Dockerfile .
docker run --rm --entrypoint sh \
  --mount "type=bind,source=$workspace,target=/workspace" \
  "$image" \
  -c 'touch /workspace/inside.txt &&
      test ! -e /workspace/../outside-sentinel &&
      test -f /opt/mgyoo-pi-harness/agent-template/extensions/workspace-guard/index.ts'

test -f "$workspace/inside.txt"
test "$(cat "$sentinel")" = "unchanged"

docker volume create "$identity_volume" >/dev/null
docker run --rm \
  --env MGYOO_HOST_UID=12345 \
  --env MGYOO_HOST_GID=12345 \
  --mount "type=volume,source=$identity_volume,target=/pi-agent" \
  "$image" --version >/dev/null
owner="$(docker run --rm --entrypoint stat \
  --mount "type=volume,source=$identity_volume,target=/pi-agent" \
  "$image" -c '%u:%g' /pi-agent/settings.json)"
test "$owner" = "12345:12345"
