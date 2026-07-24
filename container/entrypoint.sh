#!/bin/sh
set -eu

agent_dir="${PI_CODING_AGENT_DIR:-/root/.pi/agent}"
template_dir="/opt/mgyoo-pi-harness/agent-template"

mkdir -p "$agent_dir/extensions/workspace-guard"
cp "$template_dir/settings.json" "$agent_dir/settings.json"
cp "$template_dir/APPEND_SYSTEM.md" "$agent_dir/APPEND_SYSTEM.md"
cp "$template_dir/extensions/workspace-guard/"*.ts \
  "$agent_dir/extensions/workspace-guard/"

exec pi "$@"
