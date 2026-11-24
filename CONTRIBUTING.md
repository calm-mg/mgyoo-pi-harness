# Contributing

런처는 빌드 없이 Node.js 24 이상에서 실행합니다. 개발 검사만 npm 의존성이 필요합니다.

```sh
npm ci --ignore-scripts
npm run check
```

실제 설치와 확장 로더는 다음 명령으로 검사합니다. Node 24/npm, Git(Windows에서는 Git Bash 포함), 공식 npm·OMP 배포처에 대한 네트워크 연결이 필요합니다. 모델 키, 전역 설치, Docker는 필요 없습니다.

```sh
node tests/install/host-smoke.mjs
```

스모크는 공백이 있는 임시 홈·프로젝트·PATH에 네이티브 설치기로 런처를 설치하고 두 `setup`을 반복합니다. 모델이나 기존 인증 대신 실제 RPC 세션에 `/harness-status`를 전송합니다. 공통 지침·리뷰 스킬, 기본 MCP 부재, 명시적으로 켠 로컬 MCP 도구 목록과 예제 입력의 결과, 중지한 프로필의 백업/복원, 기존 설정 보존과 런처 제거를 검사하고 임시 상태를 지웁니다. 인증·세션·개인 경로를 PR이나 로그에 복사하지 마세요.

| CI 경로 | 확인하는 범위 |
|---|---|
| `ubuntu-latest`, `macos-latest`, `windows-latest` | Node 24, 계약 테스트 + 위 호스트 스모크. Windows는 네이티브 PowerShell 설치기와 CMD 런처 |
| Ubuntu x64 및 ARM64 | `sh tests/container/smoke.sh`: 실제 Linux Docker 데몬, Pi/OMP 버전과 리소스 로딩, 현재 프로젝트와 전용 볼륨의 격리 |
| 미측정 | WSL2 자체, macOS/Windows Docker Desktop, musl 및 모든 OS/CPU 조합, GUI 설치·관리자 정책, 공급자 로그인과 유료 모델 응답 |

호스트 스모크 성공은 호스트 파일 접근 격리를 의미하지 않습니다. 컨테이너 경계를 변경했다면 Docker가 실행되는 Linux에서도 컨테이너 스모크를 실행하세요.
