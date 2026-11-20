# mgyoo harness

**새 프로젝트를 만드는 도구가 아닙니다.** 이미 있는 프로젝트에서 Pi 또는 OMP를 같은 작업 지침·리뷰 skill·보호 hook과 함께 실행하는 개인용 런처입니다. `harness` 명령 하나만 등록하며 기존 `pi`, `omp`, 기본 프로필과 인증을 교체하지 않습니다.

## 첫 실행

1. 이 저장소를 clone하거나 내려받고 그 디렉터리에서 런처를 설치하세요.

   ```sh
   sh install.sh                 # macOS / Linux
   ```

   ```powershell
   .\install.ps1                 # Windows PowerShell
   ```

   설치기가 안내하는 디렉터리를 PATH에 추가하세요. 설치 전에 볼 때는 `sh install.sh --dry-run` 또는 `.\install.ps1 -DryRun`을 씁니다. 설치 스크립트 자체는 Pi·OMP·Docker를 설치하지 않습니다.

2. **Docker로 사용할 때**는 Docker Desktop 또는 Engine을 시작하고, 작업할 프로젝트로 이동하세요. 이 경우 호스트용 `setup`은 필요 없습니다.

   ```sh
   cd path/to/my-project
   harness doctor omp
   harness run omp
   ```

   첫 실행은 선택한 도구의 이미지를 준비합니다. 컨테이너에 **현재 디렉터리**를 읽기·쓰기로 연결하므로 프로젝트 루트에서 실행하세요. `/login`과 `/model`로 계정과 모델을 선택합니다. Pi를 쓰려면 `omp` 대신 `pi`를 지정합니다.

3. **Docker 없이 사용할 때**는 선택한 도구의 호스트 환경만 설치하고 `--host`를 명시하세요. 이 경우 에이전트는 본인 계정이 접근할 수 있는 다른 파일과 프로그램에도 접근할 수 있습니다.

   ```sh
   harness setup omp --dry-run   # 설치 계획만 출력
   harness setup omp             # 프로젝트 생성 없음
   harness doctor omp --host
   harness run omp --host
   ```

`harness run pi --host -- --version`처럼 `--` 뒤에 도구 자체의 인수를 전달할 수 있습니다. 평소처럼 `pi` 또는 `omp`를 직접 실행하면 이 런처를 거치지 않습니다.

## 무엇을 설치해야 하나?

| 사용할 기능 | 필요한 도구 |
|---|---|
| 런처 설치와 공통 CLI | [Node.js 24 이상](https://nodejs.org/), POSIX `sh` 또는 Windows PowerShell. Git은 clone·업데이트할 때 사용합니다. |
| 기본 `run` / 기본 `doctor` | **로컬 Linux 컨테이너**를 실행할 수 있는 [Docker Desktop 또는 Engine](https://docs.docker.com/get-started/get-docker/)과 실행 중인 데몬. 첫 이미지 빌드에 인터넷이 필요합니다. 호스트 Pi/OMP 설치나 로그인은 불필요합니다. |
| `setup pi`, `run pi --host` | `setup`에는 Node.js와 함께 제공되는 npm 및 네트워크가 필요합니다. Pi `0.82.0`을 하네스 전용으로 설치하므로 PATH에 있는 이전 `pi` 래퍼를 호출하지 않습니다. |
| `setup omp`, `run omp --host` | OMP `19.0.1` 공식 바이너리. 일치하는 로컬 바이너리가 없으면 해당 플랫폼의 릴리스를 내려받습니다. Docker·Bun·npm은 불필요합니다. |

Windows에서 Pi의 셸 도구를 쓰려면 [Git for Windows의 Bash](https://github.com/earendil-works/pi/blob/v0.82.0/packages/coding-agent/docs/windows.md)도 필요합니다. OMP 호스트 바이너리는 macOS·Linux·Windows의 x64/arm64 대상이며, musl Linux에서는 `libstdc++`와 `libgcc`가 필요합니다.

`doctor`는 선택한 환경만 검사합니다. Docker가 없거나 데몬에 접속할 수 없으면 기본 실행은 중단합니다. 조용히 `--host`로 바뀌지 않습니다. `harness`를 찾지 못하면 설치기의 PATH 안내를, Node 버전 오류라면 `node --version`과 터미널의 버전 관리자 설정을 확인하세요.

## 내가 관리하는 설정

- **항상 적용할 지침:** [`config/AGENTS.md`](config/AGENTS.md). 사용자 변경 보존, 비밀정보 처리처럼 프로젝트나 도구가 달라도 지킬 규칙을 둡니다.
- **필요할 때 쓰는 절차:** [`config/skills/`](config/skills). `harness-review`는 현재 변경을 리뷰할 때 쓰는 예제입니다. 프로젝트 자체의 빌드 명령이나 팀 규칙은 해당 프로젝트에 둡니다.
- **이벤트에 자동으로 반응하는 코드:** [`protect-env.js`](config/protect-env.js)는 두 도구에서 `write`로 `.env*` 파일을 덮어쓰는 호출을 막습니다. 셸 전체를 감시하는 기능은 아닙니다. Pi 안전 모드는 [`workspace-guard`](extensions/workspace-guard)도 사용합니다. hook은 에이전트와 같은 권한으로 실행되므로 신뢰하는 코드만 추가하세요.
- **호스트 상태:** 기본 `~/.mgyoo-harness` 아래 도구별로 분리합니다(`MGYOO_HARNESS_HOME`으로 변경 가능). Pi는 전용 agent directory를, OMP는 별도 홈의 `mgyoo` 프로필을 사용합니다. OMP에서 실행한 프로그램은 원래 홈의 `~/.gitconfig` 같은 설정을 자동으로 읽지 않을 수 있습니다. 이는 호스트 파일 접근 제한이 아닙니다.
- **도구 버전:** [`lib/catalog.mjs`](lib/catalog.mjs). 새 모델이나 공급자를 강제하지 않습니다. API 키·토큰·세션은 Git에 넣지 말고 사용할 도구와 모드 안에서 로그인하세요. 호스트와 컨테이너는 인증을 공유하지 않습니다.

**직접 추가하는 법:** skill은 `config/skills/<이름>/SKILL.md`에 둡니다. 디렉터리 이름은 영문 소문자·숫자·하이픈을 사용하고, [리뷰 예제](config/skills/harness-review/SKILL.md)처럼 `name`과 `description`을 작성하세요. hook은 `config/이름.js`에 작성하고 [`config/package.json`](config/package.json)의 `pi.extensions` 배열에 `./이름.js`를 추가합니다. 두 엔진에서 지원하는 이벤트와 도구 입력을 사용하세요.

수정 후 호스트에서는 `harness setup <도구> --dry-run`으로 차이를 본 뒤 `harness setup <도구>`로 적용합니다. 설치된 사본을 직접 수정한 경우 조용히 덮어쓰지 않습니다. 안전 모드에서는 다음 실행 시 이미지에 반영됩니다.

안전 모드에서도 프로젝트 내부 변경과 외부 네트워크 통신은 가능합니다. 낯선 저장소나 민감한 데이터에는 [보안 경계](SECURITY.md)를 먼저 확인하세요.

## 업데이트·제거·기존 사용자

- 이 저장소를 업데이트하고 사용하는 호스트 도구의 `harness setup pi` 또는 `harness setup omp`를 다시 실행하세요. clone을 이동했다면 설치 스크립트도 다시 실행하세요.
- `sh uninstall.sh` 또는 `.\uninstall.ps1`은 런처만 제거합니다. 프로젝트·인증·세션·컨테이너 상태는 보존합니다.
- **이전 Pi 하네스(v1)에서 전환:** 기존 설치를 유지하려면 v2를 별도 디렉터리에 clone하세요. v1 래퍼는 원래 clone에 의존합니다. v2는 기존 `pi-*` 명령, `~/.pi/agent`, `mgyoo-pi-safe-agent` 볼륨을 정리하거나 이관하지 않습니다. v1 제거가 필요하면 당시 설치본의 manifest와 백업을 먼저 확인하고 그 설치본의 제거 스크립트를 **purge 없이** 사용하세요. v1 설치 전 설정 복원은 별개이므로 현재 설정과 백업을 비교한 뒤 선택하세요.

[v1 설계 기록](docs/superpowers/specs/2026-07-24-pi-harness-design.md) · [개발 검사](CONTRIBUTING.md) · [MIT License](LICENSE)
