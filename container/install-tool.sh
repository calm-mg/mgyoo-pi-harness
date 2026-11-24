#!/bin/sh
set -eu
tool=$1
version=$2
case "$tool" in
  pi)
    npm install --global --ignore-scripts --no-audit --no-fund "@earendil-works/pi-coding-agent@$version"
    npm cache clean --force
    ;;
  omp)
    node --input-type=module -e 'import { installOmp } from "/usr/local/lib/harness/omp-release.mjs"; await installOmp("/usr/local/bin")'
    ;;
  *) exit 1 ;;
esac
actual=$("$tool" --version)
case "$actual" in
  "$version"|"$tool/$version") ;;
  *) echo "버전 불일치: $tool $version 필요, 확인된 값: $actual" >&2; exit 1 ;;
esac
