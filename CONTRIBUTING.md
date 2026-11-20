# Contributing

런처는 빌드 없이 Node.js 24 이상에서 실행합니다. 개발 검사만 npm 의존성이 필요합니다.

```sh
npm ci --ignore-scripts
npm run check
```

권한 경계를 바꾸면 Docker가 실행 중인 환경에서 `sh tests/container/smoke.sh`도 실행하세요.
변경을 확인할 때는 실제 사용자 설정 대신 임시 디렉터리를 사용하세요. 인증, 세션, 로컬 백업, Docker 볼륨을 커밋하지 않습니다.

GitHub Actions는 Linux·macOS·Windows에서 코드와 설치기를 검사하고, Linux x64와 ARM64에서 각각 Pi·OMP의 Docker 격리를 검증합니다.
