# Contributing

문서 기준일: 2026-07-24
Pi 공식 문서: https://pi.dev/docs/latest

1. 변경 범위를 작게 유지합니다.
2. 동작 변경은 실패 테스트를 먼저 작성합니다.
3. `npm run check`와 `npm run build`를 실행합니다.
4. installer 변경 시 해당 플랫폼 dry-run을 실행합니다.
5. Docker 경계 변경 시 smoke test를 실행합니다.
6. 토큰, 인증파일, session, `.env`, 개인키, 로컬 backup을 커밋하지 않습니다.
7. 한 커밋에는 한 가지 검토 가능한 목적만 담습니다.

Pull request에는 변경 이유, 검증 명령, SAFE/YOLO 보안 경계 영향 여부를 적습니다.
