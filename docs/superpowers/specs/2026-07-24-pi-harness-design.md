# mgyoo Pi Harness 설계

- 작성일: 2026-07-24
- 대상 저장소: `calm-mg/mgyoo-pi-harness`
- 공개 범위: Public
- 지원 플랫폼: Windows, macOS, Linux
- 문서 언어: 한국어 중심

## 1. 목적

이 저장소는 Pi를 처음 사용하는 사용자가 어느 컴퓨터에서든 저장소를 clone한 뒤 동일한 개인용 코딩 하네스를 설치하고 운용할 수 있게 한다.

초기 버전의 성공 조건은 다음과 같다.

1. Windows, macOS, Linux에서 안내된 단일 설치 명령으로 설정을 재현할 수 있다.
2. 기본 `pi` 명령은 현재 프로젝트 밖의 파일을 수정할 수 없는 안전 모드로 실행된다.
3. `pi-yolo` 명령은 사용자가 명시적으로 선택했을 때 호스트 사용자 권한으로 Pi를 실행한다.
4. OpenAI와 Anthropic 인증을 지원하고, Pi의 `/model` 명령으로 모델을 바꿀 수 있다.
5. 인증정보, 세션, 비밀번호 및 기타 비밀정보가 공개 저장소에 포함되지 않는다.
6. 초보자가 설치, 일상 사용, 문제 해결 및 향후 고도화 방법을 문서만 읽고 이해할 수 있다.

## 2. 설계 원칙

### 2.1 안전 모드가 기본이다

`pi`는 컨테이너 안에서 실행한다. 현재 작업 디렉터리만 읽기·쓰기로 연결하여 프로젝트 밖 쓰기를 운영체제 수준의 격리로 차단한다.

Pi의 프로젝트 신뢰 기능은 샌드박스가 아니다. Pi 자체에도 내장 샌드박스가 없으므로, 확장 프로그램의 문자열 검사만으로 프로젝트 밖 쓰기 차단을 보장하지 않는다. 컨테이너가 실제 격리 경계이고, Pi 확장은 추가 방어와 사용자 피드백을 담당한다.

### 2.2 강한 권한은 명시적으로 선택한다

`pi-yolo`는 컨테이너와 workspace guard를 사용하지 않고 호스트에서 Pi를 직접 실행한다. 이 모드는 현재 사용자 계정이 접근할 수 있는 파일, 프로세스, 네트워크에 접근할 수 있다. 명령 이름, 시작 배너 및 문서에서 이 차이를 분명히 표시한다.

### 2.3 비밀정보와 배포 가능한 설정을 분리한다

저장소에는 설정 템플릿, 확장 소스, 설치 도구 및 문서만 둔다. 다음 데이터는 버전 관리하지 않는다.

- Pi의 `auth.json`
- API 키와 OAuth 토큰
- 세션 기록과 대화 내용
- `.env` 파일
- SSH 키와 개인키
- Docker volume 데이터
- 로컬 백업 및 진단 로그

### 2.4 재현성과 학습 가능성을 함께 제공한다

Pi 버전을 명시적으로 고정하고 업데이트 절차를 둔다. 자체 workspace guard 확장은 작고 읽기 쉽게 유지하여 Pi의 extension과 `tool_call` interception을 학습할 수 있는 실제 예제로 사용한다.

## 3. 검토한 접근법

### 3.1 자체 가드 확장만 사용

장점은 가볍고 구조가 투명하며 Pi 확장 기술을 배우기 좋다는 점이다. 단점은 셸 명령이 파일을 간접적으로 변경하거나 명령 문자열 검사를 우회할 수 있어 보안 경계가 될 수 없다는 점이다.

### 3.2 컨테이너 안전 모드와 호스트 YOLO 모드

현재 프로젝트만 컨테이너에 연결하므로 프로젝트 밖 쓰기를 실제로 제한할 수 있다. Windows, macOS, Linux에서 동일한 개념을 유지할 수 있다. 단점은 Docker Desktop 또는 Docker Engine이 필요하고, 안전 모드와 YOLO 모드의 인증 저장소가 분리된다는 점이다.

### 3.3 타사 권한 패키지

기능을 빠르게 확보할 수 있지만 타사 코드와 정책 형식에 의존한다. 초기 학습용 개인 저장소에서는 동작 원리를 파악하기 어렵고 패키지 변화에 영향을 받을 수 있다.

### 3.4 선택

2번을 기본 구조로 사용하고 1번을 보조 방어로 추가한다. 타사 권한 패키지는 v1 범위에서 제외한다.

## 4. 저장소 구조

```text
mgyoo-pi-harness/
├─ README.md
├─ LICENSE
├─ SECURITY.md
├─ CONTRIBUTING.md
├─ install.ps1
├─ install.sh
├─ uninstall.ps1
├─ uninstall.sh
├─ config/
│  ├─ settings.safe.json
│  ├─ settings.yolo.json
│  └─ AGENTS.md
├─ extensions/
│  └─ workspace-guard.ts
├─ container/
│  ├─ Dockerfile
│  └─ entrypoint.sh
├─ scripts/
│  ├─ pi-safe.ps1
│  ├─ pi-safe.sh
│  ├─ pi-yolo.ps1
│  ├─ pi-yolo.sh
│  ├─ pi-login.ps1
│  ├─ pi-login.sh
│  ├─ doctor.ps1
│  ├─ doctor.sh
│  ├─ update.ps1
│  └─ update.sh
├─ docs/
│  ├─ 01-getting-started.md
│  ├─ 02-models-and-login.md
│  ├─ 03-safe-vs-yolo.md
│  ├─ 04-customizing-pi.md
│  ├─ 05-troubleshooting.md
│  └─ learning-roadmap.md
└─ tests/
```

PowerShell과 POSIX shell 구현은 같은 정책과 사용자 경험을 제공한다. 공통 정책 데이터는 가능하면 JSON 등 한 곳에서 관리하여 두 구현이 달라지는 것을 방지한다.

## 5. 실행 아키텍처

### 5.1 `pi`: 안전 모드

안전 모드 래퍼는 다음 순서로 동작한다.

1. 현재 작업 디렉터리의 canonical path를 구한다.
2. Docker 사용 가능 여부와 이미지 버전을 확인한다.
3. 현재 작업 디렉터리만 컨테이너의 workspace에 읽기·쓰기로 mount한다.
4. 안전 모드 전용 named volume을 Pi agent directory에 mount한다.
5. 저장소가 제공한 안전 설정과 workspace guard를 load한다.
6. 컨테이너 안에서 현재 프로젝트를 자동 신뢰하고 Pi를 실행한다.
7. 사용자의 터미널과 종료 코드를 그대로 전달한다.

컨테이너에는 호스트 홈 디렉터리, Docker socket, SSH agent, 클라우드 자격증명 디렉터리 또는 다른 프로젝트를 mount하지 않는다.

### 5.2 `pi-yolo`: 완전 자율 모드

YOLO 래퍼는 저장소에 고정된 호스트 Pi 실행 파일을 직접 호출한다. 전역 설정에서 프로젝트 신뢰 기본값을 `always`로 사용하여 신뢰 질문을 생략한다. workspace guard와 컨테이너 경계를 적용하지 않는다.

시작 시 다음 정보를 눈에 띄게 표시한다.

- 현재 모드가 YOLO임
- 현재 작업 디렉터리
- 호스트 사용자 권한으로 실행됨
- 중단 방법

### 5.3 모델과 공급자

OpenAI와 Anthropic을 모두 지원한다. 인증은 Pi의 `/login` 흐름을 사용하고, 모델 선택은 `/model`을 사용한다. `enabledModels`는 기본적으로 지나치게 좁히지 않는다. 사용자가 자주 쓰는 모델을 알게 된 뒤 설정 예제를 따라 선택적으로 범위를 줄인다.

모델 ID는 빠르게 변할 수 있으므로 v1 설정에 특정 최신 모델을 강제하지 않는다. 문서는 Pi의 모델 선택기를 기준으로 설명하고 공식 문서 기준일을 표시한다.

## 6. 안전 정책

### 6.1 컨테이너 경계

안전 모드에서 프로젝트 밖 쓰기 차단은 컨테이너 mount 구성으로 보장한다. 현재 프로젝트 외 호스트 경로는 컨테이너에 제공하지 않는다. 그 결과 안전 모드에서는 프로젝트 밖 읽기도 기본적으로 허용되지 않는다.

컨테이너 안의 임시 디렉터리, Pi 상태 volume 및 운영에 필요한 시스템 경로는 컨테이너 내부에서만 변경될 수 있으며 호스트의 프로젝트 밖 파일과 분리된다.

### 6.2 workspace guard

workspace guard는 `tool_call` 이벤트에서 built-in tool 호출을 검사한다.

- `read`, `grep`, `find`, `ls`, `write`, `edit`의 경로를 canonicalize한다.
- `..`, 절대경로 및 symlink를 통한 workspace 탈출을 차단한다.
- `.env`, `*.pem`, `*.key`, 일반적인 SSH 키와 클라우드 credential 경로를 읽기·쓰기 모두 차단한다.
- `sudo`, 사용자·디스크·서비스 변경, 재귀 삭제, 강제 Git 초기화 등 위험 명령을 차단한다.
- 차단 시 실행하지 않고 이유와 안전한 대안을 Pi에 반환한다.

가드는 보조 방어이며 운영체제 샌드박스로 표현하지 않는다.

### 6.3 네트워크

v1 안전 모드는 패키지 설치, Git 및 LLM provider 통신을 위해 outbound network를 허용한다. 네트워크 제한은 별도 고도화 단계로 문서화하며 v1 보안 보장에 포함하지 않는다.

### 6.4 프로젝트 신뢰

두 모드 모두 사용자의 요구에 따라 프로젝트 신뢰 질문을 생략한다. 안전 모드의 프로젝트-local extension과 설정은 컨테이너 권한으로 실행되지만, 신뢰하지 않는 저장소의 코드와 prompt injection 위험은 남는다. 문서에서 낯선 저장소는 별도 복사본이나 더 제한된 환경에서 검토하도록 안내한다.

## 7. 설치와 제거

### 7.1 설치 명령

```powershell
.\install.ps1
```

```sh
./install.sh
```

설치 프로그램은 다음을 수행한다.

1. 운영체제와 shell을 감지한다.
2. Git, Node.js 및 Docker 요구사항을 검사한다.
3. 저장소 안에 고정된 Pi 버전과 도구 의존성을 설치한다.
4. 안전 모드 이미지를 build한다.
5. 사용자 전용 실행 경로에 `pi`, `pi-yolo`, `pi-login`, `pi-doctor`, `pi-update`를 등록한다.
6. 기존 Pi 설정이 있으면 변경 전에 타임스탬프가 포함된 백업을 만든다.
7. 관리 대상 설정과 확장을 설치한다.
8. doctor 검사를 실행하고 다음 행동을 안내한다.

설치 프로그램은 관리자 권한을 자동으로 요청하거나 시스템 디렉터리를 임의로 변경하지 않는다. Docker나 Node.js가 없으면 공식 설치 방법과 확인 명령을 안내한 뒤 안전하게 종료한다.

### 7.2 멱등성과 충돌 처리

설치를 반복해도 같은 결과가 나와야 한다. 관리 대상 파일과 사용자 소유 파일을 구분한다. 기존 파일을 덮어써야 할 때는 먼저 백업하고, 어떤 파일이 관리되는지 manifest에 기록한다.

설치 도중 실패하면 이미 존재하던 사용자 설정을 유지한다. 새 파일은 staging directory에 준비하고 검증을 통과한 뒤 적용한다.

### 7.3 제거와 복구

기본 제거는 실행 래퍼와 관리 대상 설정만 제거한다. 인증, 세션, Docker volume 및 백업은 보존한다.

`--purge`는 삭제할 정확한 경로와 volume을 표시하고 명시적인 확인을 받은 뒤 실행한다. 백업 복원 명령은 가장 최근 백업을 기본 후보로 보여주되 자동 선택하지 않는다.

## 8. 인증과 데이터

안전 모드와 YOLO 모드의 인증 저장소를 분리한다.

- `pi-login safe`: 안전 모드 named volume 안에서 `/login` 실행
- `pi-login yolo`: 호스트 Pi agent directory에서 `/login` 실행

이 분리는 안전 컨테이너가 호스트 자격증명을 읽지 못하게 한다. 사용자는 공급자별로 두 모드에 각각 한 번 로그인해야 한다.

안전 모드 세션과 캐시는 named volume에 저장한다. YOLO 세션과 캐시는 호스트 Pi 기본 위치에 저장한다. update와 uninstall은 이 데이터를 기본적으로 변경하지 않는다.

어떤 설치·진단 명령도 비밀번호, API 키 또는 토큰 값을 출력하지 않는다.

## 9. 업데이트

`pi-update`는 다음 순서로 동작한다.

1. 현재 Git 작업 트리가 깨끗한지 검사한다.
2. 원격 변경을 가져오기 전에 현재 버전과 적용 상태를 기록한다.
3. 설정 차이와 변경 요약을 보여준다.
4. 사용자 관리 파일을 백업한다.
5. 고정된 Pi 버전과 컨테이너 이미지를 갱신한다.
6. 설정을 재적용하고 doctor 및 smoke test를 실행한다.
7. 실패하면 이전 관리 버전과 설정으로 복구하는 명령을 출력한다.

Pi 버전 업데이트는 자동으로 최신 버전을 추종하지 않는다. 별도 변경에서 공식 release note와 호환성을 검토하고 고정 버전을 올린다.

## 10. 진단과 오류 처리

`pi-doctor`는 최소한 다음을 검사한다.

- 운영체제와 shell
- Git, Node.js, Docker 설치 및 버전
- Docker daemon 접근
- 안전 모드 이미지와 named volume
- 실행 래퍼가 PATH에서 해석되는 위치
- Pi 고정 버전
- 설정 JSON 유효성
- workspace guard load 여부
- safe 및 yolo 인증 존재 여부를 값 노출 없이 확인
- workspace 내부 쓰기 성공과 외부 쓰기 실패

각 실패 항목은 상태, 원인, 확인 명령 및 해결 절차를 함께 출력한다. 진단 로그는 기본적으로 비밀값과 전체 환경변수를 포함하지 않는다.

## 11. 문서

`README.md`는 10분 빠른 시작과 문서 목차를 제공한다. 세부 문서는 다음 내용을 다룬다.

### 11.1 시작하기

- Pi와 coding harness의 의미
- 사전 요구사항
- Windows PowerShell, 선택적 WSL, macOS, Linux별 설치
- 첫 로그인, 첫 모델 선택, 첫 프로젝트 실행

### 11.2 모델과 인증

- provider, model, API 및 subscription의 차이
- `/login`, `/model`, `Ctrl+P`, thinking level
- OpenAI와 Anthropic을 함께 사용하는 방법
- 인증 파일을 Git에 넣으면 안 되는 이유와 노출 시 대응

### 11.3 안전 모드와 YOLO

- 두 실행 경로의 구조
- 허용 및 차단 예제
- YOLO를 사용해야 하는 경우와 사용하지 말아야 하는 경우
- Pi project trust가 sandbox가 아닌 이유

### 11.4 커스터마이징

- settings, AGENTS.md, prompt, skill, extension의 역할
- 작은 설정 변경부터 자체 extension까지 단계별 예제
- 변경 후 검증 및 되돌리기

### 11.5 문제 해결

- `pi-doctor` 출력 해석
- Docker daemon, PATH, Node.js, provider login 문제
- 플랫폼별 shell 차이
- 설정 복원과 완전 제거

### 11.6 학습 로드맵

첫 주에는 기본 명령, session, 모델 선택 및 안전 모드 사용을 익힌다. 이후 prompt, skill, extension, subagent, 자동화 순서로 확장한다. 각 단계에는 작은 실습과 완료 기준을 둔다.

모든 문서는 공식 Pi 문서 링크와 확인 날짜를 포함한다. 최신 모델명처럼 변동이 잦은 정보는 고정된 사실처럼 서술하지 않는다.

## 12. 테스트와 CI

### 12.1 단위 테스트

- 상대경로와 절대경로 정규화
- `..` 경로 탈출
- 기존 및 새 symlink를 통한 탈출
- Windows drive 및 UNC path 처리
- 비밀파일 패턴
- 위험 명령 패턴
- 허용해야 하는 정상 명령의 오탐 방지
- 설정 merge와 manifest 처리

### 12.2 통합 테스트

- 빈 사용자 환경에 최초 설치
- 기존 Pi 설정이 있는 환경에서 백업 후 설치
- 두 번째 설치의 멱등성
- 안전 컨테이너의 workspace 내부 쓰기 성공
- 안전 컨테이너의 workspace 외부 호스트 쓰기 실패
- 안전 모드와 YOLO 모드가 서로 다른 agent directory를 사용하는지 확인
- 제거 후 사용자 데이터 보존

### 12.3 CI

GitHub Actions에서 Windows, macOS, Linux의 script lint와 단위 테스트를 실행한다. Docker smoke test는 지원되는 Linux runner에서 실행한다. 실제 provider API, 실제 계정 및 유료 token은 CI에서 사용하지 않는다.

비밀정보 탐지 검사를 CI와 로컬 검증 명령에 포함한다.

## 13. 공개 저장소 운영

저장소는 `calm-mg/mgyoo-pi-harness`라는 public repository로 만든다. 다음 파일을 포함한다.

- MIT License
- 기여 방법
- 보안 취약점 및 비밀정보 노출 신고 방법
- 지원 범위와 비보장 항목

GitHub 저장소를 만들고 push하기 전 로컬 구현과 검증을 완료한다. GitHub 연결 또는 CLI 권한이 부족하면 로컬 commit까지 완료한 뒤 필요한 최소 연결 단계만 사용자에게 요청한다.

## 14. v1 범위

v1에 포함한다.

- 두 실행 모드
- cross-platform 설치, 제거, 업데이트 및 doctor
- 컨테이너 안전 경계
- 자체 workspace guard
- OpenAI와 Anthropic 로그인 안내
- 상세 한국어 문서
- 핵심 단위 및 통합 테스트
- 공개 저장소 운영 파일과 CI

v1에서 제외한다.

- 타사 permission package
- subagent orchestration
- MCP 기본 번들
- 자동 모델 routing
- inbound service 또는 Slack/Discord 연동
- 완전한 network sandbox
- 클라우드 VM 자동 배포

제외 항목은 실제 사용 경험을 쌓은 뒤 별도 설계와 검증을 거쳐 추가한다.

## 15. 수용 기준

다음 조건을 모두 만족하면 v1 구현이 완료된 것으로 본다.

1. 새 환경에서 문서의 설치 절차가 성공한다.
2. `pi`가 현재 프로젝트에서 실행되고 내부 파일을 수정할 수 있다.
3. 안전 모드에서 프로젝트 밖 호스트 파일 수정 시도가 실패한다.
4. 비밀파일과 위험 명령이 workspace guard에 의해 차단된다.
5. `pi-yolo`가 경고 후 호스트 Pi를 실행한다.
6. safe와 yolo 인증 및 session storage가 분리된다.
7. `/login`과 `/model` 사용법이 문서화된다.
8. install 재실행이 기존 설정이나 사용자 데이터를 손상시키지 않는다.
9. uninstall 기본 동작이 인증과 세션을 보존한다.
10. Windows, macOS, Linux CI와 Docker smoke test가 통과한다.
11. 저장소에 비밀정보가 없음을 검사한다.
12. 초보자용 문서와 학습 로드맵이 완성된다.
