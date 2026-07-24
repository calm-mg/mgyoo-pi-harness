# SAFE와 YOLO

문서 기준일: 2026-07-24
공식 보안 문서: https://pi.dev/docs/latest/security

## 차이

| 항목 | `pi` SAFE | `pi-yolo` |
| --- | --- | --- |
| Pi 실행 위치 | Docker | 호스트 |
| 현재 프로젝트 | 읽기·쓰기 | 읽기·쓰기 |
| 프로젝트 밖 호스트 파일 | mount되지 않음 | 사용자 권한으로 접근 |
| Pi 인증 | 전용 Docker volume | 호스트 `~/.pi/agent` |
| workspace guard | 사용 | 사용하지 않음 |
| outbound network | 허용 | 허용 |

## 왜 Docker인가

Pi에는 내장 filesystem sandbox가 없습니다. 확장 프로그램은 `tool_call`을 검사할 수 있지만 복잡한 셸 동작을 완전한 보안 경계로 만들 수 없습니다. SAFE 모드는 현재 프로젝트만 Docker에 bind mount하여 호스트의 다른 경로를 보이지 않게 합니다.

workspace guard는 추가 방어입니다. 경로 탈출, `.env`, 개인키, 재귀 강제 삭제, 권한 상승 명령을 조기에 차단하고 이유를 알려줍니다.

guard는 built-in 파일 도구에서 심볼릭 링크를 정규화한 뒤 비밀파일 이름을 다시 검사합니다. shell 명령에서도 `.env`, SSH 키, `*.pem`, `*.key` 같은 대표 패턴을 차단합니다. 다만 이름을 동적으로 조립하는 임의 프로그램까지 완전 분석하는 보안 경계는 아니므로, 실제 경계는 현재 프로젝트만 mount하는 Docker입니다.

Linux에서는 컨테이너 프로세스를 실행 사용자의 UID/GID로 낮춥니다. 따라서 SAFE 모드가 프로젝트에 만든 파일이 root 소유로 남지 않습니다. Windows와 macOS의 Docker Desktop에서는 해당 플랫폼의 bind-mount 권한 변환을 사용합니다.

## project trust는 sandbox가 아니다

Pi의 project trust는 `.pi/settings.json`, 프로젝트 extension 같은 로컬 입력을 로드할지 결정합니다. 이 하네스는 질문을 줄이기 위해 자동 신뢰를 사용합니다. 하지만 project trust는 실행 후 도구가 무엇을 할 수 있는지 제한하지 않습니다.

SAFE의 실제 경계는 Docker mount입니다.

## 남는 위험

- outbound network가 허용되므로 코드나 데이터가 네트워크로 전송될 가능성이 있습니다.
- 저장소 문서나 빌드 출력에 prompt injection이 있을 수 있습니다.
- 현재 프로젝트에 이미 있는 비밀파일은 guard 규칙이 모든 이름을 알지 못할 수 있습니다.
- Docker daemon 자체의 보안과 업데이트는 호스트 관리 책임입니다.

## 언제 YOLO를 쓰나

다음처럼 호스트 접근이 실제로 필요한 경우에만 사용합니다.

- 여러 프로젝트를 한 번에 수정해야 한다.
- 호스트 전역 도구 설정을 바꿔야 한다.
- Docker에서 접근할 수 없는 로컬 서비스가 필요하다.

실행 전 `git status`를 확인하고 작업 디렉터리를 다시 봅니다.

```sh
pwd
git status --short
pi-yolo
```

Pi는 YOLO 배너와 현재 디렉터리를 표시합니다. 예상과 다르면 즉시 `Ctrl+C`로 중단합니다.
