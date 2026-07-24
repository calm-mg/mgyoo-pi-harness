#!/bin/sh
set -eu

repo_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
bin_dir="${MGYOO_PI_BIN_DIR:-$HOME/.local/bin}"
state_dir="${MGYOO_PI_STATE_DIR:-$HOME/.local/state/mgyoo-pi-harness}"
agent_dir="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
dry_run="${MGYOO_PI_DRY_RUN:-0}"

if [ "$dry_run" = "1" ]; then
  printf '%s\n' \
    "[dry-run] repository: $repo_dir" \
    "[dry-run] npm ci --ignore-scripts" \
    "[dry-run] npm run check && npm run build" \
    "[dry-run] docker build mgyoo-pi-harness:0.82.0" \
    "[dry-run] wrappers: $bin_dir" \
    "[dry-run] state: $state_dir" \
    "[dry-run] Pi agent directory: $agent_dir"
  exit 0
fi

for command_name in git node npm docker; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing dependency: %s\n' "$command_name" >&2
    printf 'See https://github.com/calm-mg/mgyoo-pi-harness#requirements\n' >&2
    exit 1
  fi
done

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" -lt 24 ]; then
  printf 'Node.js 24 or newer is required.\n' >&2
  exit 1
fi

cd "$repo_dir"
npm ci --ignore-scripts
npm run check
npm run build
docker build -t mgyoo-pi-harness:0.82.0 -f container/Dockerfile .

mkdir -p "$bin_dir" "$state_dir" "$agent_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="$state_dir/backups/$timestamp"
stage_dir="$state_dir/stage-$timestamp"
mkdir -p "$backup_dir" "$stage_dir"

for name in pi pi-yolo pi-login; do
  if [ -e "$bin_dir/$name" ]; then
    cp "$bin_dir/$name" "$backup_dir/$name"
  fi
  sed "s|__REPOSITORY_ROOT__|$repo_dir|g" \
    "$repo_dir/scripts/templates/$name" >"$stage_dir/$name"
  chmod 0755 "$stage_dir/$name"
  mv "$stage_dir/$name" "$bin_dir/$name"
done

for managed in settings.json APPEND_SYSTEM.md; do
  if [ -e "$agent_dir/$managed" ]; then
    cp "$agent_dir/$managed" "$backup_dir/$managed"
  fi
done
cp "$repo_dir/config/settings.yolo.json" "$agent_dir/settings.json"
cp "$repo_dir/config/AGENTS.md" "$agent_dir/APPEND_SYSTEM.md"

cat >"$state_dir/install-manifest.json" <<EOF
{
  "repositoryRoot": "$repo_dir",
  "binDir": "$bin_dir",
  "agentDir": "$agent_dir",
  "wrappers": [
    "$bin_dir/pi",
    "$bin_dir/pi-yolo",
    "$bin_dir/pi-login"
  ],
  "backupDir": "$backup_dir"
}
EOF

rmdir "$stage_dir"
printf 'Installed mgyoo Pi Harness.\n'
case ":$PATH:" in
  *":$bin_dir:"*) ;;
  *) printf 'Add this to your shell profile: export PATH="%s:$PATH"\n' "$bin_dir" ;;
esac
