#!/bin/sh
set -eu

# Only the volume root is touched as root. Never follow state-owned links or
# recursively chown a tree that the agent controls.
uid="${HARNESS_UID:-1000}"
gid="${HARNESS_GID:-1000}"
chown "$uid:$gid" /state
if [ "$HARNESS_TOOL" = pi ]; then
  export PI_CODING_AGENT_DIR=/state/pi
fi
exec setpriv --reuid="$uid" --regid="$gid" --clear-groups -- /bin/sh -ec '
  umask 077
  mkdir -p "$HOME"
  exec "$HARNESS_TOOL" "$@"
' sh "$@"
