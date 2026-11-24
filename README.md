# mgyoo harness

**새 프로젝트를 만드는 도구가 아닙니다.** 이미 있는 프로젝트에서 Pi 또는 OMP를 같은 작업 지침·리뷰 skill·보호 hook과 함께 실행하는 개인용 런처입니다. `harness` 명령 하나만 등록하며 기존 `pi`, `omp`, 기본 프로필과 인증을 교체하지 않습니다.

## 처음 쓰기

**1. 터미널에 Git과 npm을 포함한 Node.js 24 이상을 준비하세요.** 설치기는 관리자 권한을 요구하거나 다른 프로그램을 대신 설치하지 않습니다.

| 환경 | 전제 설치 예 | 기본 격리 실행을 쓰려면 |
|---|---|---|
| macOS (Terminal, zsh) | `xcode-select --install`로 Git, [공식 Node macOS 설치 패키지](https://nodejs.org/en/download)로 Node/npm 설치 | [Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install/) 설치 후 시작 |
| Linux (sh/bash) | Ubuntu/Debian은 시스템 관리자가 `apt install git bash ca-certificates xz-utils`. [Node 공식 Linux 배포판](https://nodejs.org/en/download)에서 CPU에 맞는 v24 LTS `.tar.xz`를 홈에 풀고 `bin`을 PATH에 추가 | [배포판별 Docker Engine 및 CLI](https://docs.docker.com/engine/install/), 실행 중인 로컬 데몬. Docker 소켓 권한은 관리자와 협의 |
| Windows 네이티브 (PowerShell) | `winget install --id Git.Git -e` 및 `winget install --id OpenJS.NodeJS.LTS -e`, 터미널 다시 열기. Pi의 셸 도구에는 [Git Bash](https://github.com/earendil-works/pi/blob/v0.82.0/packages/coding-agent/docs/windows.md)가 필요 | [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/), Linux 컨테이너 모드 |
| WSL2 (Ubuntu 터미널) | **배포판 안에서** 위 Linux 절차로 Linux용 Git·Node/npm 설치. clone도 `~/` 아래에 두고 `.sh` 사용. Windows의 Node·PATH·홈을 공유하는 구성이 아님 | Docker Desktop의 해당 배포판 WSL integration 또는 배포판 로컬 Engine |

다음 세 명령이 해당 터미널에서 성공해야 합니다. Windows에서는 `npm --version` 대신 `npm.cmd --version`도 가능합니다.

```sh
git --version
node --version
npm --version
git clone https://github.com/calm-mg/mgyoo-pi-harness.git "pi omp harness"
cd "pi omp harness"
```

**2. 런처를 설치하세요.** clone은 지우지 마세요. 런처가 그 안의 코드를 실행합니다.

```sh
# macOS / Linux / WSL
sh install.sh
export PATH="$HOME/.local/bin:$PATH"
```

```powershell
# Windows 네이티브. 검토한 로컬 스크립트가 다운로드 차단된 경우에만 Unblock-File .\install.ps1
.\install.ps1
$env:Path = "$env:LOCALAPPDATA\mgyoo-harness\bin;$env:Path"
```

PATH 예시는 현재 터미널용입니다. 계속 쓰려면 설치기의 안내대로 셸 프로필 또는 사용자 Path에 추가하세요. `sh install.sh --dry-run` / `.\install.ps1 -DryRun`은 쓰지 않고 미리 보기만 합니다. 재실행은 동일 런처를 보존하고 출처가 다르거나 수정된 런처를 덮어쓰지 않습니다.

**3. 비밀이 없는 신뢰하는 작업 디렉터리에서 실행하세요.** 처음에는 새 빈 폴더를 만들어도 됩니다. 아래 Pi와 OMP는 독립적이므로 필요한 것만 실행합니다.

```sh
cd ..
mkdir "harness demo"
cd "harness demo"
docker info
harness doctor pi
harness run pi
# Pi에서 /harness-status 확인 후 종료
harness doctor omp
harness run omp
# OMP에서도 /harness-status 확인 후 종료
```

기본 모드는 현재 폴더만 `/workspace`에 **읽기·쓰기**로 연결합니다. 호스트 도구 설치나 인증 복사 없이 첫 실행 때 선택한 이미지를 빌드합니다. `doctor`는 데몬·이미지 상태 확인이지 실제 리소스 로드 검사가 아닙니다. 세션 안에서 **`/harness-status` → `AGENTS.md: OK`, `harness-review: OK`, `MCP: 없음`**(빈 프로젝트)을 확인하세요. 이 명령에는 모델 호출이 없습니다. 일반 대화에는 본인이 선택한 공급자 인증·모델이 필요합니다(`/login`, `/model`).

**Docker 없이 신뢰하는 프로젝트를 실행하기로 선택한 경우만** 아래처럼 호스트 프로필을 설치합니다. 기본 모드 실패 시 자동 전환하지 않습니다. `--host`에는 파일·환경변수·프로세스 접근 격리가 없습니다.

```sh
harness setup pi --dry-run
harness setup pi
harness doctor pi --host
harness run pi --host
# /harness-status 확인 후 종료
harness setup omp
harness doctor omp --host
harness run omp --host
# /harness-status 확인 후 종료
```

**무엇이 고정되는가:** [카탈로그](lib/catalog.mjs)의 Pi `@earendil-works/pi-coding-agent@0.82.0`을 npm에서 설치합니다(install scripts 비활성). 배포 패키지에는 upstream `npm-shrinkwrap.json`이 들어 있고, 하네스 호스트 설치는 이 저장소의 개발용 lockfile을 사용하지 않습니다. OMP `19.0.1`은 공식 `build.stencil.so` 바이너리와 [플랫폼별 SHA-256](lib/omp-release.mjs)을 검증합니다. PATH의 OMP도 같은 바이트일 때만 재사용합니다. 호스트 OMP 자체에는 npm/Bun/Docker가 필요 없습니다. macOS·Linux·Windows용 x64/arm64 해시가 있으며 musl Linux에는 `libstdc++`와 `libgcc`가 필요합니다. 도구가 지원하는 플랫폼과 이 저장소에서 실측한 환경은 다릅니다([검증 범위](CONTRIBUTING.md)).

컨테이너는 [digest 고정 Debian/Node 이미지](container/Dockerfile)에 bash·Git·ripgrep·인증서·util-linux 등을 설치합니다. 이미지/apt/npm/OMP 다운로드에 인터넷이 필요합니다. 개발용 TypeScript·Vitest 등은 [`package-lock.json`](package-lock.json) 대상이며 런처 설치 전 `npm ci`를 할 필요는 없습니다. `harness run pi --host -- --version`처럼 `--` 뒤에 도구 인수를 전달할 수 있습니다.

## 내가 관리하는 설정

- **항상 적용할 지침:** [`config/AGENTS.md`](config/AGENTS.md). 사용자 변경 보존, 비밀정보 처리처럼 프로젝트나 도구가 달라도 지킬 규칙을 둡니다.
- **필요할 때 쓰는 절차:** [`config/skills/`](config/skills). `harness-review`는 현재 변경을 리뷰할 때 쓰는 예제입니다. 프로젝트 자체의 빌드 명령이나 팀 규칙은 해당 프로젝트에 둡니다.
- **이벤트에 자동으로 반응하는 코드:** [`protect-env.js`](config/protect-env.js)는 두 도구에서 `write`로 `.env*` 파일을 덮어쓰는 호출을 막습니다. 셸 전체를 감시하는 기능은 아닙니다. Pi 안전 모드는 [`workspace-guard`](extensions/workspace-guard)도 사용합니다. hook은 에이전트와 같은 권한으로 실행되므로 신뢰하는 코드만 추가하세요.
- **호스트 상태:** 기본 `~/.mgyoo-harness` 아래 도구별로 분리합니다(`MGYOO_HARNESS_HOME`으로 변경 가능). Pi는 전용 agent directory를, OMP는 별도 홈의 `mgyoo` 프로필을 사용합니다. OMP에서 실행한 프로그램은 원래 홈의 `~/.gitconfig` 같은 설정을 자동으로 읽지 않을 수 있습니다. 이는 호스트 파일 접근 제한이 아닙니다.
- **도구 버전:** [`lib/catalog.mjs`](lib/catalog.mjs). 새 모델이나 공급자를 강제하지 않습니다. API 키·토큰·세션은 Git에 넣지 말고 사용할 도구와 모드 안에서 로그인하세요. 호스트와 컨테이너는 인증을 공유하지 않습니다.

**한 군데만 편집하세요.** 두 엔진 모두 런처가 명시한 `--extension <resources>/config`를 읽습니다. 스킬은 `config/skills/<이름>/SKILL.md`에 [예제](config/skills/harness-review/SKILL.md)처럼 `name`, `description`, 절차를 씁니다(디렉터리와 같은 영문 소문자·숫자·하이픈 이름). Pi는 manifest의 `pi.skills`, OMP는 확장 디렉터리 옆 `skills/`를 탐색합니다. Pi는 중복 스킬 이름에서 먼저 읽은 것을 유지하고, OMP는 동일본은 합치되 내용이 다른 낮은 우선순위의 스킬에는 namespace를 붙일 수 있습니다.

슬래시 명령은 [`config/status.js`](config/status.js)처럼 `api.registerCommand`를 호출하고 [`config/package.json`](config/package.json)의 `pi.extensions`에 `./이름.js`를 추가합니다. 이 방식은 단순 텍스트 치환이 아니라 양쪽에서 실행되는 코드입니다. 접두사 `harness-`와 고유 이름을 쓰세요. Pi의 동명 extension 명령은 `:1`, `:2` 등으로 구분되고 OMP는 마지막 등록이 이깁니다. 내장 명령 이름은 피하세요. Markdown 프롬프트의 기본 위치도 같지 않습니다([Pi `prompts/`](https://github.com/earendil-works/pi/blob/v0.82.0/packages/coding-agent/docs/prompt-templates.md), [OMP `commands/` 및 우선순위](https://github.com/can1357/oh-my-pi/blob/v19.0.1/docs/slash-command-internals.md)).

**선택 MCP (OMP 전용, 기본 미등록).** [`examples/mcp`](examples/mcp)의 `diffstat` 1.0.0은 이 저장소의 로컬 코드이며 입력으로 받은 Git patch의 추가/삭제 줄 수만 셉니다. 외부 패키지·토큰·네트워크 서버·파일 도구가 없습니다. 고정할 때는 검토한 Git 커밋을 사용하세요. [Pi에는 기본 MCP 클라이언트가 없습니다](https://github.com/earendil-works/pi/blob/v0.82.0/packages/coding-agent/README.md#philosophy). 자동으로 브리지를 설치하지 않습니다.

예제 사용: **새 빈 테스트 프로젝트**의 루트에 `diff-stat.mjs`를, 그 안의 `.omp/mcp.json`에 `mcp.example.json`을 복사하세요. 기본 `harness run omp`로 열고 `/harness-status`에서 `mcp__diffstat_count_changes`를 확인합니다. 새 서버도 [OMP의 프로젝트 `mcpServers`](https://github.com/can1357/oh-my-pi/blob/v19.0.1/docs/mcp-config.md)에 다른 이름으로 추가합니다. 기존 파일을 덮어쓰지 마세요. 이 예제는 Node의 `--permission`으로 파일 쓰기·자식 실행 등을 허용하지 않습니다. 권한 모델은 적대적 코드를 격리하는 샌드박스가 아닙니다. 서버는 부모 환경을 상속하므로 호스트의 글로벌 프로필이나 비밀이 든 세션에 등록하지 마세요. 해당 프로젝트 항목을 제거하고 OMP를 다시 열면 꺼집니다. 설치 없이 소스를 검토하고, 임시 환경에서 도구 연결·호출까지 재현하려면 [호스트 스모크](CONTRIBUTING.md)를 사용하세요.

수정 후 호스트에서는 `harness setup <도구> --dry-run`으로 차이를 본 뒤 `harness setup <도구>`로 적용합니다. 설치된 사본을 직접 수정한 경우 조용히 덮어쓰지 않습니다. 안전 모드에서는 다음 실행 시 이미지에 반영됩니다.

안전 모드에서도 프로젝트 내부 변경과 외부 네트워크 통신은 가능합니다. 낯선 저장소나 민감한 데이터에는 [보안 경계](SECURITY.md)를 먼저 확인하세요.

## 업데이트·제거·기존 사용자

**호스트 설정 되돌리기:** Pi·OMP 세션을 모두 종료하세요. `~/.pi`와 `~/.omp`가 아닌 **하네스 전용** `host` 폴더를 같은 비공개 상태 디렉터리 안에서 이름만 바꿔 보관합니다. 인증 DB를 복사·공유하지 않습니다. 기본 경로 예시이며 `MGYOO_HARNESS_HOME`을 지정했다면 그 경로를 사용하세요. `host.before`, `host.trial`이 이미 있으면 중단하고 사용하지 않은 이름을 고르세요.

```sh
cd "$HOME/.mgyoo-harness"
mv host host.before                 # 백업 (PowerShell: Rename-Item host host.before)
harness setup pi                    # 또는 omp: 새 프로필로 연습
mv host host.trial                  # 연습 상태도 보존 (PowerShell: Rename-Item host host.trial)
mv host.before host                 # 복원 (PowerShell: Rename-Item host.before host)
harness doctor pi --host            # 원래 설치한 도구로 확인
```

Windows PowerShell에서 첫 줄은 `Set-Location "$HOME\.mgyoo-harness"`입니다. 복원 후 작업 폴더로 돌아가 `/harness-status`도 확인하세요. 런타임·npm 캐시는 `host` 밖에 있고 Docker 프로필은 별도 볼륨입니다. 볼륨 이름은 `harness doctor <도구>`가 표시합니다. 제거 전 인증·세션 보존 여부를 먼저 판단하고 다른 볼륨이나 사용자 홈을 일괄 정리하지 마세요.

- 이 저장소를 업데이트하고 사용하는 호스트 도구의 `harness setup pi` 또는 `harness setup omp`를 다시 실행하세요. clone을 이동했다면 설치 스크립트도 다시 실행하세요.
- `sh uninstall.sh` 또는 `.\uninstall.ps1`은 런처만 제거합니다. 프로젝트·인증·세션·컨테이너 상태는 보존합니다.
- **이전 Pi 하네스(v1)에서 전환:** 기존 설치를 유지하려면 v2를 별도 디렉터리에 clone하세요. v1 래퍼는 원래 clone에 의존합니다. v2는 기존 `pi-*` 명령, `~/.pi/agent`, `mgyoo-pi-safe-agent` 볼륨을 정리하거나 이관하지 않습니다. v1 제거가 필요하면 당시 설치본의 manifest와 백업을 먼저 확인하고 그 설치본의 제거 스크립트를 **purge 없이** 사용하세요. v1 설치 전 설정 복원은 별개이므로 현재 설정과 백업을 비교한 뒤 선택하세요.

[v1 설계 기록](docs/superpowers/specs/2026-07-24-pi-harness-design.md) · [개발 검사](CONTRIBUTING.md) · [MIT License](LICENSE)
