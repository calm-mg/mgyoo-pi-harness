#!/bin/sh
set -eu

agent_dir="${PI_CODING_AGENT_DIR:-/pi-agent}"
template_dir="/opt/mgyoo-pi-harness/agent-template"

mkdir -p "$agent_dir/extensions/workspace-guard"
cp "$template_dir/settings.json" "$agent_dir/settings.json"
cp "$template_dir/APPEND_SYSTEM.md" "$agent_dir/APPEND_SYSTEM.md"
cp "$template_dir/extensions/workspace-guard/"*.ts \
  "$agent_dir/extensions/workspace-guard/"

if [ -n "${MGYOO_HOST_UID:-}" ] && [ -n "${MGYOO_HOST_GID:-}" ] \
  && [ "$MGYOO_HOST_UID" != "0" ]; then
  runtime_home="/tmp/mgyoo-home"
  mkdir -p "$runtime_home"
  chown -R "$MGYOO_HOST_UID:$MGYOO_HOST_GID" "$agent_dir" "$runtime_home"
  export HOME="$runtime_home"
  export PI_CODING_AGENT_DIR="$agent_dir"
  exec setpriv \
    --reuid="$MGYOO_HOST_UID" \
    --regid="$MGYOO_HOST_GID" \
    --clear-groups \
    pi "$@"
fi

exec pi "$@"
