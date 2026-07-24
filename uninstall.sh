#!/bin/sh
set -eu

bin_dir="${MGYOO_PI_BIN_DIR:-$HOME/.local/bin}"
state_dir="${MGYOO_PI_STATE_DIR:-$HOME/.local/state/mgyoo-pi-harness}"
manifest="$state_dir/install-manifest.json"
purge="${1:-}"

validate_state_dir() {
  resolved_state="$(CDPATH= cd -- "$state_dir" 2>/dev/null && pwd -P)" || {
    printf 'Refusing unresolved state directory: %s\n' "$state_dir" >&2
    return 1
  }
  resolved_home="$(CDPATH= cd -- "$HOME" && pwd -P)"
  leaf="$(basename "$resolved_state")"
  parent_leaf="$(basename "$(dirname "$resolved_state")")"
  if [ "$resolved_state" = "/" ] || [ "$resolved_state" = "$resolved_home" ]; then
    printf 'Refusing to purge home or filesystem root: %s\n' "$resolved_state" >&2
    return 1
  fi
  if [ "$leaf" != "mgyoo-pi-harness" ] \
    && ! { [ "$leaf" = "state" ] && [ "$parent_leaf" = "mgyoo-pi-harness" ]; }; then
    printf 'Refusing unexpected state directory: %s\n' "$resolved_state" >&2
    return 1
  fi
}

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
  if [ -d "$state_dir" ]; then
    validate_state_dir
  fi
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
