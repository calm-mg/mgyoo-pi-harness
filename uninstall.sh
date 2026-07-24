#!/bin/sh
set -eu

bin_dir="${MGYOO_PI_BIN_DIR:-$HOME/.local/bin}"
state_dir="${MGYOO_PI_STATE_DIR:-$HOME/.local/state/mgyoo-pi-harness}"
manifest="$state_dir/install-manifest.json"
purge="${1:-}"

if [ -f "$manifest" ] && command -v node >/dev/null 2>&1; then
  node -e '
    const manifest = require(process.argv[1]);
    for (const file of manifest.wrappers ?? []) console.log(file);
  ' "$manifest" |
    while IFS= read -r wrapper; do
      case "$wrapper" in
        "$bin_dir"/*) rm -f -- "$wrapper" ;;
        *) printf 'Refusing unmanaged path: %s\n' "$wrapper" >&2 ;;
      esac
    done
else
  for name in pi pi-yolo pi-login pi-doctor pi-update; do
    rm -f -- "$bin_dir/$name"
  done
fi

printf 'Wrappers removed. Auth, sessions, backups, and Docker volume were preserved.\n'

if [ "$purge" = "--purge" ]; then
  printf 'Type PURGE to remove %s and Docker volume mgyoo-pi-safe-agent: ' "$state_dir"
  IFS= read -r confirmation
  if [ "$confirmation" != "PURGE" ]; then
    printf 'Purge cancelled.\n'
    exit 1
  fi
  docker volume rm mgyoo-pi-safe-agent >/dev/null 2>&1 || true
  if [ -d "$state_dir" ]; then
    rm -r -- "$state_dir"
  fi
fi
