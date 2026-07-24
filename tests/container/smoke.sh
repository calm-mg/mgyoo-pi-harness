#!/bin/sh
set -eu

image="mgyoo-pi-harness:0.82.0"
workspace="$(mktemp -d)"
sentinel="$(mktemp)"

cleanup() {
  rm -r "$workspace"
  rm -f "$sentinel"
}
trap cleanup EXIT

docker build -t "$image" -f container/Dockerfile .
docker run --rm --entrypoint sh \
  --mount "type=bind,source=$workspace,target=/workspace" \
  "$image" \
  -c 'touch /workspace/inside.txt && test ! -e /host-sentinel'

test -f "$workspace/inside.txt"
test -f "$sentinel"
