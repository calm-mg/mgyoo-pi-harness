# 문제 해결

문서 기준일: 2026-07-24  
공식 문서: https://pi.dev/docs/latest

먼저 실행합니다.

```sh
pi-doctor
```

## doctor 항목

| ID | 의미 | 해결 |
| --- | --- | --- |
| `git` | Git 실행 가능 | Git을 설치하고 새 터미널을 연다 |
| `node` | Node.js 실행 가능 | Node.js 24+ 설치 |
| `docker-cli` | Docker 명령 존재 | Docker 공식 설치 수행 |
| `docker-daemon` | Docker 엔진 실행 중 | Docker Desktop/Engine 시작 |
| `pi-host` | 고정 Pi CLI 존재 | 저장소에서 installer 재실행 |
| `pi-image` | SAFE 이미지 존재 | installer로 이미지 재빌드 |
| `safe-volume` | SAFE 인증/session volume 존재 | `pi-login safe` 최초 실행 |
| `settings` | 두 JSON 설정이 유효 | Git 원본에서 복구 |
| `safe-boundary` | Docker 격리 probe 성공 | Docker mount와 이미지 재검증 |

WARN은 설명을 읽고 판단할 수 있지만 FAIL은 먼저 해결해야 합니다.

## `docker-daemon` 실패

Windows/macOS에서는 Docker Desktop을 시작합니다. Linux에서는 Docker service 상태를 확인합니다. 관리자 권한 명령은 이 문서가 자동 실행하지 않습니다.

```sh
docker info
```

## 명령을 찾지 못함

Windows는 설치 후 새 터미널을 엽니다. 사용자 PATH에 다음 디렉터리가 있어야 합니다.

```text
%LOCALAPPDATA%\mgyoo-pi-harness\bin
```

macOS/Linux 기본값:

```text
~/.local/bin
```

## PowerShell 실행 정책 오류

현재 프로세스에만 허용 범위를 적용합니다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

machine execution policy를 자동으로 변경하지 않습니다.

## 모델이 보이지 않음

1. 올바른 모드에 로그인했는지 확인합니다.
2. `pi-login safe` 또는 `pi-login yolo`를 다시 실행합니다.
3. Pi에서 `/login`을 확인합니다.
4. `/model`을 다시 엽니다.

SAFE와 YOLO 인증은 분리돼 있습니다.

## 업데이트가 거부됨

`pi-update`는 dirty worktree, detached HEAD, origin 없음 상태에서 중단합니다.

```sh
git status --short
git branch --show-current
git remote -v
```

사용자 변경을 임의 stash, reset, clean하지 않습니다.

## backup 복구

설치 전 파일은 다음 기본 위치 아래 timestamp별 backup에 있습니다.

Windows:

```text
%LOCALAPPDATA%\mgyoo-pi-harness\state\backups
```

macOS/Linux:

```text
~/.local/state/mgyoo-pi-harness/backups
```

복구 전 현재 파일을 별도로 복사하고, 원하는 backup의 `settings.json` 또는 `APPEND_SYSTEM.md`를 `~/.pi/agent`로 복사합니다.

## 완전 제거

기본 제거는 사용자 데이터를 보존합니다. purge는 삭제할 위치를 확인한 후에만 사용합니다.

```sh
sh uninstall.sh --purge
```

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1 -Purge
```
