# Pi 커스터마이징

문서 기준일: 2026-07-24  
공식 커스터마이징 문서: https://pi.dev/docs/latest

한 번에 많은 패키지를 설치하기보다 실제 불편을 하나씩 해결하는 순서가 좋습니다.

## 1. settings

전역 설정은 `~/.pi/agent/settings.json`, 프로젝트 설정은 `.pi/settings.json`입니다. 이 하네스의 원본은 `config/settings.safe.json`과 `config/settings.yolo.json`입니다.

예를 들어 thinking 기본값을 바꾸려면 복사본에서 다음 값을 조정합니다.

```json
{
  "defaultThinkingLevel": "high"
}
```

수정 후:

```sh
npm run check
pi-doctor
```

## 2. AGENTS와 system instructions

`AGENTS.md`는 프로젝트별 작업 규칙에 적합합니다.

```markdown
# Project rules

- 변경 전 관련 테스트를 먼저 찾는다.
- 데이터베이스 migration은 별도 파일로 만든다.
```

이 저장소의 `config/AGENTS.md`는 설치 시 전역 `APPEND_SYSTEM.md`로 배치됩니다.

## 3. prompt

반복 요청은 짧은 템플릿으로 만들 수 있습니다. 먼저 수동으로 세 번 이상 써 보고 안정된 문구만 템플릿으로 옮깁니다.

예:

```text
현재 diff를 검토하고 회귀 위험, 누락 테스트, 비밀정보 노출만 보고해줘.
```

## 4. skill

skill은 여러 단계의 재사용 가능한 작업 절차입니다. 입력, 성공 조건, 금지 동작을 명확히 적습니다. 처음에는 “릴리스 전 검사”처럼 범위가 좁은 skill 하나로 시작합니다.

검증 기준:

- 같은 요청에서 매번 같은 핵심 단계를 수행한다.
- 실패 시 멈추는 조건이 있다.
- 비밀정보나 로컬 절대경로를 포함하지 않는다.

## 5. extension

extension은 TypeScript로 도구와 이벤트를 확장합니다. 이 저장소의 `extensions/workspace-guard/`가 실제 예제입니다.

핵심 패턴:

```ts
pi.on("tool_call", async (event, ctx) => {
  if (event.toolName === "bash") {
    // 실행 전에 정책을 검사하고 필요하면 block한다.
  }
});
```

extension은 Pi 프로세스와 같은 권한으로 실행됩니다. 출처를 모르는 extension을 설치하지 말고, 소스를 읽고 테스트한 뒤 사용하세요.

## 권장 순서

settings → AGENTS → prompt → skill → extension 순서로 진행합니다. subagent와 자동화는 단일 Pi 작업 흐름이 충분히 익숙해진 뒤 추가합니다.
