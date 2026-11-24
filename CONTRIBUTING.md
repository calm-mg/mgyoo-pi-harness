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

OMP는 같은 스모크에서 [`claude-work`](presets/claude-work.yml)도 검사합니다. 임시 프로필에 GPT 기본값과 `tiny`를 두고 두 번의 새 RPC 세션을 엽니다. `--config`를 붙이면 여덟 역할과 추론 접미사·활성 Opus/high를, 빼면 원래 GPT/low를 확인합니다. 두 경우 모두 `tiny`와 전역 `config.yml` 바이트가 유지되어야 합니다. 카탈로그는 키 없는 루프백 주소로 설정하고 로컬 슬래시 명령만 실행합니다. 공급자 권한이나 모델 응답을 검사하는 테스트가 아닙니다.

| CI 경로 | 확인하는 범위 |
|---|---|
| `ubuntu-latest`, `macos-latest`, `windows-latest` | Node 24, 계약 테스트 + 위 호스트 스모크. Windows는 네이티브 PowerShell 설치기와 CMD 런처 |
| Ubuntu x64 및 ARM64 | `sh tests/container/smoke.sh`: 실제 Linux Docker 데몬, Pi/OMP 버전과 리소스 로딩, 현재 프로젝트와 전용 볼륨의 격리 |
| 미측정 | WSL2 자체, macOS/Windows Docker Desktop, musl 및 모든 OS/CPU 조합, GUI 설치·관리자 정책, 공급자 로그인과 유료 모델 응답 |

호스트 스모크 성공은 호스트 파일 접근 격리를 의미하지 않습니다. 컨테이너 경계를 변경했다면 Docker가 실행되는 Linux에서도 컨테이너 스모크를 실행하세요.

**Pi 업데이트.** 기존 Dependabot이 `@earendil-works/*`를 별도 `pi` 그룹 PR로 올립니다. `package.json`의 정확한 버전이 호스트 설치·이미지·확장 타입의 유일한 Pi 버전이므로 따로 고칠 카탈로그는 없습니다. 같은 PR에서 README의 Pi 버전과 문서 링크를 맞추고(불일치 시 `tests/config/versions.test.mjs` 실패), upstream 변경 기록의 확장 API·내장 도구·셸 변경을 [`workspace-guard`](extensions/workspace-guard)와 대조한 뒤 위 CI가 모두 통과할 때 병합합니다. `@types/node`는 `engines`의 최소 Node 메이저에 맞춰 메이저 업데이트를 받지 않습니다.
