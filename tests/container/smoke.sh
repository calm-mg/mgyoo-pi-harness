#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd -P)
tmp=$(mktemp -d)
tmp=$(cd "$tmp" && pwd -P)
export MGYOO_HARNESS_HOME="$tmp/host-state"
export HARNESS_HOST_SENTINEL=private
mkdir -p "$MGYOO_HARNESS_HOME" "$tmp/work, space"
chmod 0777 "$tmp/work, space"  # Also writable by the fallback UID on root-run CI.
printf 'outside\n' > "$MGYOO_HARNESS_HOME/private"
printf 'outside\n' > "$tmp/adjacent"

# Calculate only the disposable namespace's names; never remove user volumes.
ns=$(node -e 'process.stdout.write(require("node:crypto").createHash("sha256").update(require("node:fs").realpathSync.native(process.env.MGYOO_HARNESS_HOME)).digest("hex").slice(0,16))')
cleanup() {
  docker volume rm "mgyoo-harness-pi-$ns" "mgyoo-harness-omp-$ns" >/dev/null 2>&1 || :
  rm -rf -- "$tmp"
}
trap cleanup EXIT
cd "$tmp/work, space"
ln -s "$tmp/adjacent" outside-link

# Exercise the real CLI, image, entrypoint, mount arguments, and both pinned
# agents. An explicitly loaded local extension can probe without any model/key.
cat > probe.ts <<'EOF'
import fs from 'node:fs';
import assert from 'node:assert/strict';
export default function probe(api) {
  api.on('session_start', (_event, ctx) => probeSession(api, ctx));
}
function probeSession(api, ctx) {
  try {
    const tool = process.env.HARNESS_TOOL;
    assert.ok(['pi', 'omp'].includes(tool));
    assert.equal(process.cwd(), '/workspace');
    assert.equal(process.env.HARNESS_HOST_SENTINEL, undefined);
    assert.notEqual(process.getuid(), 0);
    assert.equal(fs.existsSync('/workspace/outside-link'), false);
    assert.equal(fs.existsSync('/adjacent'), false);
    assert.equal(fs.existsSync('/var/run/docker.sock'), false);
    assert.equal(fs.existsSync('/workspace/../host-state/private'), false);
    assert.equal(fs.existsSync('/state/visited'), false, 'per-tool state leaked');
    const prompt = [ctx.getSystemPrompt()].flat().join('\n');
    assert.ok(prompt.includes(fs.readFileSync('/opt/harness/config/AGENTS.md', 'utf8').trim()), 'common instructions not loaded');
    assert.ok(prompt.includes('harness-review') || api.getCommands().some(c => c.source === 'skill' && c.name.includes('harness-review')), 'review skill not loaded');
    assert.ok(fs.readFileSync('/opt/harness/config/skills/harness-review/SKILL.md', 'utf8').trim());
    fs.accessSync('/opt/harness/config/protect-env.js', fs.constants.R_OK);
    fs.writeFileSync('/state/visited', tool);
    fs.writeFileSync(`/workspace/${tool}.ok`, String(process.getuid()));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
EOF

for tool in pi omp; do
  case "$tool" in
    pi) expected=0.82.0; set -- ;;
    omp) expected=19.0.1; set -- --offline --no-title ;;
  esac
  version=$(node "$root/lib/cli.mjs" run "$tool" -- --version)
  [ "$version" = "$expected" ]
  node "$root/lib/cli.mjs" run "$tool" -- --extension /workspace/probe.ts --model openai/gpt-5.2 --mode rpc "$@" </dev/null
  uid=$(id -u)
  [ "$uid" != 0 ] || uid=1000
  [ "$(cat "$tool.ok")" = "$uid" ]
  node "$root/lib/cli.mjs" doctor "$tool"
done
test "$(cat "$tmp/adjacent")" = outside
test "$(cat "$MGYOO_HARNESS_HOME/private")" = outside
