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
    # Published artifacts and hashes: build.stencil.so/api/products/omp/versions/19.0.1/linux-{arm64,x86_64}
    build=20261119-225504-f40f335
    case "$version/$(dpkg --print-architecture)" in
      19.0.1/amd64) arch=x64; sha=6ceef04430851bb1050c6fda3af467412eb44a11df0a6ff8121fe601013c5415 ;;
      19.0.1/arm64) arch=arm64; sha=237ede0f4994d61f523802c4cf562d4e48bae74c188add792d06d051b907cecf ;;
      *) echo "검증된 OMP $version 바이너리가 없는 아키텍처: $(dpkg --print-architecture)" >&2; exit 1 ;;
    esac
    curl --fail --show-error --silent --location "https://build.stencil.so/d/omp/$build/omp-linux-$arch" -o /usr/local/bin/omp
    printf '%s  /usr/local/bin/omp\n' "$sha" | sha256sum -c -
    chmod 0755 /usr/local/bin/omp
    ;;
  *) exit 1 ;;
esac
actual=$("$tool" --version)
case "$actual" in
  "$version"|"$tool/$version") ;;
  *) echo "버전 불일치: $tool $version 필요, 확인된 값: $actual" >&2; exit 1 ;;
esac
