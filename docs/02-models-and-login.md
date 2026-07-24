# 모델과 로그인

문서 기준일: 2026-07-24
공식 문서: https://pi.dev/docs/latest

## provider와 model

provider는 인증과 과금을 담당하는 서비스이고 model은 실제 추론을 수행하는 모델입니다. 예를 들어 OpenAI와 Anthropic은 provider입니다. 모델 이름과 제공 범위는 자주 바뀌므로 이 저장소는 특정 “최고 모델”을 고정하지 않습니다.

## 안전 모드 로그인

```sh
pi-login safe
```

Pi가 열리면:

```text
/login
```

OpenAI 또는 Anthropic을 선택하고 화면 안내를 따릅니다. 안전 모드 인증은 Docker named volume `mgyoo-pi-safe-agent`에 저장됩니다.

## YOLO 로그인

```sh
pi-login yolo
```

다시 `/login`을 입력합니다. YOLO 인증은 호스트의 `~/.pi/agent`에 저장됩니다. 안전 모드와 YOLO 모드는 인증과 session을 의도적으로 공유하지 않기 때문에 각각 로그인해야 합니다.

## 모델 선택

Pi 실행 중:

```text
/model
```

인증된 provider의 모델 목록에서 선택합니다. `Ctrl+P`는 `enabledModels` 범위 안에서 모델을 빠르게 순환합니다. 처음에는 모델 범위를 좁히지 말고 실제 사용 후 자주 쓰는 모델만 설정하는 편이 이해하기 쉽습니다.

thinking level은 모델이 내부 추론에 쓰는 정도입니다. 작업이 단순하면 낮게, 복잡한 설계나 디버깅이면 높게 사용할 수 있습니다. 비용과 지연시간도 함께 증가할 수 있습니다.

## subscription과 API key

- subscription 로그인은 서비스 계정의 구독 정책을 따릅니다.
- API key는 사용량 기반 과금일 수 있습니다.
- 어떤 방식을 쓰든 인증값은 공개 저장소에 넣지 않습니다.
- `.env`, `auth.json`, 터미널 로그를 공유하기 전에 내용을 확인합니다.

## 인증 노출 시

1. 해당 provider 콘솔에서 키나 세션을 즉시 revoke합니다.
2. 새 인증을 발급합니다.
3. Git 기록에 들어갔다면 단순 파일 삭제만으로 끝내지 말고 저장소 관리자에게 알립니다.
4. `pi-login safe` 또는 `pi-login yolo`로 다시 연결합니다.

OpenAI와 Anthropic을 모두 연결해 두면 `/model`에서 작업 특성에 맞게 오갈 수 있습니다.
