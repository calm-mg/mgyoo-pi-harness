# Security Policy

문서 기준일: 2026-07-24
Pi 공식 보안 문서: https://pi.dev/docs/latest/security

## 신고

토큰, 인증정보, 개인 로그가 포함된 내용을 공개 이슈에 올리지 마세요. 저장소 소유자에게 비공개 채널로 최소 재현 정보만 전달하세요.

## 인증정보를 노출한 경우

1. provider에서 해당 credential을 즉시 revoke합니다.
2. 새 credential을 발급합니다.
3. Git에 들어갔다면 저장소 기록 정리와 공개 범위를 함께 검토합니다.
4. 공개 로그와 artifact도 확인합니다.

## 보안 경계

SAFE 모드의 실제 파일시스템 경계는 Docker mount입니다. `workspace-guard` extension은 defense in depth이며 독립 sandbox가 아닙니다. `pi-yolo`는 현재 호스트 사용자 권한으로 실행됩니다.

SAFE 모드도 outbound network를 허용하고 prompt injection 가능성을 제거하지 않습니다. 신뢰하지 않는 저장소와 비밀 데이터에는 별도 VM이나 더 강한 정책 기반 sandbox를 사용하세요.
