# Riot 승인 신청서 (붙여넣기용 + 포털 수정 체크리스트)

## 0. 포털에서 먼저 고칠 것 (신청 전 필수)

- [ ] **Product Game Focus → VALORANT로 변경** (지금 League of Legends로 되어 있으면 VALORANT 스코프가 안 나옴. 안 되면 VALORANT용 제품 신규 등록)
- [ ] **Product URL을 실제 소유 사이트로 교체** (`https://myappsite.com` 예시 주소는 소유권 검증에서 탈락)
- [ ] **API Key Regenerate 후 새 키 복사** (채팅·스크린샷에 노출된 키는 폐기. 새 키를 나에게 전달하면 실측 재테스트)
- [ ] Dashboard · Screenshots에 시연 화면 등록 (시뮬레이션 모드로 촬영 가능)

## 1. Product Description (영문, 그대로 붙여넣기)

```
Valorant Tracker KR is a Valorant performance tracker for Korean players.
It shows lifetime and recent competitive stats (K/D, damage per round, win
rate, headshot rate), a 0-1000 Tracker Score with D-S grades, per-agent and
attack/defense breakdowns, and an in-game agent-select overlay that shows
the user's own team composition with career stats.

Data usage (official APIs only):
- ACCOUNT-V1 for Riot ID to PUUID resolution
- VAL-MATCH-V1 for post-match history aggregation (recent 20 matches)
- VAL-CONTENT-V1 for agent and map names and localized content
- VAL-RANKED-V1 leaderboards and VAL-STATUS-V1 for service notices
Live lobby data comes from the Overwolf Game Events Provider (the official
game-event feed). No memory reading, injection, or third-party scraping is
used. The Riot API key is stored server-side only and is never shipped in
the client.

Compliance:
- No pre-match enemy scouting: the overlay shows only enemy agents and
  ranks visible in-client, never detailed enemy statistics.
- No real-time gameplay advantage features (no spike timers, no live
  coaching calls).
- A free tier is available. Pro ($20/month) adds only deeper analysis
  (extended history, score breakdowns, weekly reports) through the
  official Overwolf/Tebex subscription system.
- User opt-in and Riot Sign-On (RSO) will be integrated before public
  launch.

Current state: a working prototype is complete (dashboard, overlay, score
engine, license and admin backend). I am applying for production access so
the review team can evaluate it with live data. A review walkthrough and
screenshots are available on request.
```

## 2. 심사에서 보는 것 (초안 작성 근거)

- 제품이 **실제로 동작하는지** (프로토타입 링크/영상 — MOCK이라도 흐름이 보여야 함)
- **어떤 API를 왜 쓰는지**가 구체적인지 (위 초안은 엔드포인트별로 명시)
- **정책 위반 기능이 없는지** (스카우팅·실시간 이점·스크래핑 부재를 먼저 선언)
- **수익화·개인정보** 계획이 있는지 (무료 티어 + 공식 구독 + opt-in/RSO)
- 애원·추측 문구("just once", "please")는 감점 요소라 전부 삭제함

## 3. 제출 후

- 검토는 보통 수일~수주. 추가 질문이 오면 본 저장소 코드 + 시연 영상으로 답변
- 승인되면 새 Production 키를 `.env`의 `RIOT_API_KEY`에 교체 → 백엔드 재시작 → `/api/health`가 `mock:false` + 실제 전적 반환 확인
