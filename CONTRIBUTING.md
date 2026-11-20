# Contributing

런처는 빌드 없이 Node.js 24 이상에서 실행합니다. 개발 검사만 npm 의존성이 필요합니다.

```sh
npm ci --ignore-scripts
npm run check
```

권한 경계를 바꾸면 Docker가 실행 중인 환경에서 `sh tests/container/smoke.sh`도 실행하세요.
변경을 확인할 때는 실제 사용자 설정 대신 임시 디렉터리를 사용하세요. 인증, 세션, 로컬 백업, Docker 볼륨을 커밋하지 않습니다.

## Jenkins (Linux arm64)

1. 컨트롤러가 아닌 전용 Linux arm64 에이전트에 `linux-arm64-docker` 라벨을 지정합니다. 에이전트에는 Git, POSIX 셸, Node.js 24 이상, Docker CLI와 로컬 Linux Docker Engine이 필요합니다. 에이전트 계정으로 `docker info`가 성공해야 합니다. 패키지·이미지를 처음 내려받을 때는 인터넷이 필요합니다.
2. Jenkins의 **Multibranch Pipeline**에서 이 저장소와 검증할 브랜치를 연결하고 Script Path를 `Jenkinsfile`로 설정합니다. Declarative Pipeline과 Git 플러그인을 사용하며 Docker Pipeline 플러그인, 모델 API 키, 레지스트리 쓰기 권한은 필요 없습니다.
3. 브랜치 스캔 후 빌드합니다. Node 검사·설치 테스트는 Docker 소켓 없이 `ci-base` 컨테이너에서 실행합니다. 이어서 에이전트가 `tests/container/smoke.sh`로 실제 Pi·OMP 컨테이너를 실행해 작업 공간과 상태 격리를 검증합니다. 기존 GitHub Actions의 Windows/macOS 검사는 유지됩니다.

권장 배치는 에이전트 프로세스와 Docker 데몬을 같은 빌드 전용 VM에 두는 것입니다. **에이전트 자체가 컨테이너라면** 체크아웃 경로와 `TMPDIR`를 호스트와 같은 절대경로로 마운트하세요. Docker의 bind mount는 데몬 기준 경로를 사용합니다. 공개 포크 PR을 사내 Docker 권한으로 자동 실행하지 말고 Jenkins 작업에서 신뢰할 브랜치만 발견·빌드하도록 설정하세요.
