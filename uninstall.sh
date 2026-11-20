#!/bin/sh
set -eu

if ! node -e 'process.exit(parseInt(process.versions.node) >= 24 ? 0 : 1)' 2>/dev/null; then
  echo 'Install Node.js 24 or newer (https://nodejs.org/), add node to PATH, then retry.' >&2
  exit 1
fi
repo_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
exec node "$repo_dir/scripts/bootstrap.mjs" uninstall "$@"
