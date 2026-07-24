# 설치와 첫 실행

문서 기준일: 2026-07-24
공식 문서: https://pi.dev/docs/latest

## 먼저 알아둘 용어

- **Pi**: 터미널에서 동작하는 최소형 코딩 에이전트입니다.
- **harness**: 모델에게 파일 읽기, 수정, 셸 실행 같은 도구와 작업 규칙을 제공하는 실행 환경입니다.
- **provider**: OpenAI, Anthropic처럼 모델을 제공하고 인증을 처리하는 서비스입니다.
- **session**: 한 작업의 대화와 도구 실행 기록입니다.

## 공통 준비

다음 명령이 모두 동작해야 합니다.

```sh
git --version
node --version
npm --version
docker version
```

Node.js는 24 이상이어야 합니다. Docker 설치는 공식 안내를 사용하세요: https://docs.docker.com/get-docker/

## Windows

1. Git, Node.js 24+, Docker Desktop을 설치합니다.
2. Docker Desktop을 시작하고 `docker info`가 성공하는지 확인합니다.
3. PowerShell에서 저장소를 clone합니다.

```powershell
git clone https://github.com/calm-mg/mgyoo-pi-harness.git
Set-Location mgyoo-pi-harness
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

설치 프로그램은 사용자 `PATH`에 `%LOCALAPPDATA%\mgyoo-pi-harness\bin`을 추가합니다. 새 터미널을 열어야 반영됩니다.

## WSL

WSL은 선택사항입니다. Windows 네이티브 설치만으로도 사용할 수 있습니다. `mgyoo` 계정의 WSL에서 별도로 사용하려면 WSL 안에 Git, Node.js 24+, npm, Docker 접근이 있어야 합니다.

```sh
cd ~
git clone https://github.com/calm-mg/mgyoo-pi-harness.git
cd mgyoo-pi-harness
sh install.sh
```

비밀번호를 스크립트, 저장소, 환경파일에 기록하지 마세요. Docker Desktop의 WSL integration을 사용할 경우 Docker Desktop 설정에서 해당 배포판만 활성화합니다.

## macOS

Docker Desktop 또는 Docker Engine, Git, Node.js 24+를 준비합니다.

```sh
git clone https://github.com/calm-mg/mgyoo-pi-harness.git
cd mgyoo-pi-harness
sh install.sh
```

`~/.local/bin`이 `PATH`에 없다면 설치 프로그램이 출력한 `export PATH=...` 한 줄을 셸 설정에 직접 추가합니다.

## Linux

Docker Engine을 설치한 뒤 일반 사용자로 `docker info`가 동작하게 구성합니다. 시스템 권한 변경은 배포판의 공식 Docker 문서를 따르세요.

```sh
git clone https://github.com/calm-mg/mgyoo-pi-harness.git
cd mgyoo-pi-harness
sh install.sh
```

## 첫 로그인과 실행

```sh
pi-doctor
pi-login safe
```

Pi가 열리면 `/login`을 입력해 OpenAI 또는 Anthropic을 연결합니다. 그다음 실제 프로젝트에서 실행합니다.

```sh
cd path/to/project
pi
```

Pi 안에서:

```text
/model
```

목록에서 인증된 모델을 선택하고 간단한 요청으로 시작합니다.

```text
이 프로젝트 구조를 읽고, 변경하지 말고 핵심만 설명해줘.
```

## 완료 확인

- `pi-doctor`에 FAIL이 없다.
- `pi`가 Docker 안에서 열린다.
- `/model`에 인증한 공급자의 모델이 보인다.
- 테스트용 파일을 프로젝트 내부에는 만들 수 있다.
- 프로젝트 밖 파일은 안전 모드에서 보이지 않는다.
