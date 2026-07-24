# mgyoo Pi Harness

Pi를 어디서든 같은 방식으로 설치하고 사용하는 개인용 코딩 하네스입니다. 기본 `pi`는 현재 프로젝트만 수정할 수 있는 Docker 안전 모드이고, `pi-yolo`는 사용자가 명시적으로 선택할 때만 호스트 권한으로 실행됩니다.

문서 기준일: 2026-07-24
공식 Pi 문서: https://pi.dev/docs/latest

## 두 실행 모드

| 명령 | 실행 위치 | 프로젝트 밖 호스트 파일 | 용도 |
| --- | --- | --- | --- |
| `pi` | Docker 컨테이너 | 보이지 않으며 수정 불가 | 기본 개발 작업 |
| `pi-yolo` | 호스트 | 현재 사용자 권한으로 접근 가능 | 시스템 도구나 다른 프로젝트가 꼭 필요한 작업 |

`pi-yolo`는 별도 제품이 아닙니다. 이 저장소가 제공하는 명시적 고권한 실행 명령입니다.

## 사전 요구사항

- Git
- Node.js 24 이상과 npm
- Docker Desktop 또는 Docker Engine

관리자 권한이 필요한 도구 설치는 이 저장소가 자동으로 수행하지 않습니다.

## 10분 빠른 시작

```sh
git clone https://github.com/calm-mg/mgyoo-pi-harness.git
cd mgyoo-pi-harness
```

Windows PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

macOS 또는 Linux:

```sh
sh install.sh
```

새 터미널을 연 뒤 상태를 확인합니다.

```sh
pi-doctor
```

안전 모드에 OpenAI와 Anthropic을 연결합니다.

```sh
pi-login safe
```

Pi가 열리면 `/login`을 입력하고 공급자를 선택합니다. YOLO 모드도 사용할 예정이면 별도로 로그인합니다.

```sh
pi-login yolo
```

작업할 프로젝트로 이동해서 기본 안전 모드를 실행합니다.

```sh
cd path/to/your-project
pi
```

Pi 안에서 `/model`로 모델을 선택합니다.

## 업데이트와 제거

```sh
pi-update
```

제거:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1
```

```sh
sh uninstall.sh
```

기본 제거는 인증, 세션, 백업, Docker volume을 보존합니다.

## 자세한 문서

- [설치와 첫 실행](docs/01-getting-started.md)
- [모델과 로그인](docs/02-models-and-login.md)
- [SAFE와 YOLO](docs/03-safe-vs-yolo.md)
- [Pi 커스터마이징](docs/04-customizing-pi.md)
- [문제 해결](docs/05-troubleshooting.md)
- [학습 로드맵](docs/learning-roadmap.md)

## 보안 한계

Docker는 안전 모드의 파일시스템 경계입니다. 하지만 outbound network는 허용되고, 프로젝트 내용에 포함된 prompt injection 가능성은 남습니다. Pi의 project trust는 프로젝트 설정을 로드할지 정하는 기능이지 sandbox가 아닙니다.

비밀정보를 발견하거나 노출했다면 [SECURITY.md](SECURITY.md)를 먼저 읽으세요.

## 라이선스

MIT
