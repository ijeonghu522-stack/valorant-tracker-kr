# 승인 신청 패키지 (Riot · Overwolf · Tebex)

> 제출 전 체크: 아래 초안을 제품 실정에 맞게 고치고, 시연 영상/GIF를 첨부할 것.

## 1. Riot Developer Portal — 제품 등록 + VALORANT API 승인 신청

- **Product Game Focus**: VALORANT (⚠️ 현재 포털의 제품은 League of Legends로 등록됨 — VALORANT 제품 별도 등록 필요)
- **사용 API**: ACCOUNT-V1(계정 식별, asia), VAL-MATCH-V1(전적, kr), VAL-CONTENT-V1(요원/맵, kr), VAL-RANKED-V1(리더보드, kr), VAL-STATUS-V1(점검 안내)
- **사용하지 않는 것**: 실시간 스펙테이터 API(공개 API에 없음 — 사용하지 않음), 상대팀 사전 스카우팅(정책상 미구현)
- **데이터 흐름**: 앱 → 자사 백엔드(키 보관) → Riot API. 키는 클라이언트에 포함되지 않음
- **개인정보/Opt-in**: 타인 전적은 본인이 조회한 공개 매치 기록 범위만 표시, RSO 연동은 승인 후 적용
- **현재 키 상태 실측 기록**: 개발 키는 유효하나 VALORANT 스코프 403 — 본 신청으로 해소 요청
- 준비물: 동작 프로토타입(본 저장소), 제품 설명 URL, 소유권 검증용 도메인/스토어 페이지

## 2. Overwolf — 앱 아이디어 제출 + 스토어 배포

- **Game**: VALORANT (ID 21640), GEP 기능: me / game_info / match_info / kill / death
- **창 구성**: background(컨트롤러) / dashboard(데스크톱 전용) / overlay(인게임 전용, 입력 패스스루)
- **정책 준수 선언**:
  - 상대팀 상세 스탯 미표시 (요원+랭크만)
  - 게임 중 결제/구독 CTA 없음 (Pro 안내는 대시보드 탭에서만)
  - 무료 티어 제공, Pro는 부가 분석 기능만
  - 메모리 읽기/인젝션 없음 (공식 GEP + REST만 사용)
- **필요 에셋**: icon.png / icon_gray.png / launcher.ico (✅ 저장소에 생성됨),
  추가 필요: 스토어 타일·히어로 이미지·스크린샷 3~5장 (대시보드/오버레이/스코어, 시뮬레이션 모드로 촬영 가능)
- **제출물**: `.opk` 패키지 → DevRel QA → Production 채널 배포
- manifest 검증: 개발자 콘솔 스키마 검증기로 확인 (핫키·launch_events 형식 주의)

## 3. Tebex — $20/월 Pro 구독 상품

1. Tebex 프로젝트 생성 시 **반드시 `I have an Overwolf app` 선택** (나중 변경 불가)
2. 웹훅 Endpoint URL: `https://subscriptions-api.overwolf.com/tebex-webhooks/<PUBLIC_TOKEN>`, 타입 전체 선택
3. 카테고리(월간) + 패키지 `Pro Monthly – $20` 생성 (Recurring payment = monthly)
4. Integrations → API Keys에서 public_token / private_key / project_id, 웹훅 페이지에서 secret_key 복사
5. Overwolf DevRel에 위 4종 + app_id + deeplink 스킴(`vltrackerkr`) 전달 → Link Your Tebex Store 완료
6. 테스트 모드 해제: Settings → Checkout → Remove Test Payments
7. 앱 연동 지점: `overwolf-app/shared/subscriptions.js` (메서드명은 DevRel 승인 후 샘플앱 대조 확정)

## 4. 이용약관 문구 (앱 푸터 + 스토어 설명에 게시)

- 무단 복제·크랙·라이선스 공유 시 민·형사상 책임을 물을 수 있음
- 요금제·환불 정책, 기기 1대 바인딩, 부정 사용 시 사전 통보 후 이용 정지
- ⚠️ 실제 분쟁 대응은 변호사 자문 후 진행 (문구만으로 집행되지 않음)

## 5. 키 보안 수칙

- 스크린샷·채팅에 키 노출 금지 (노출 시 포털에서 즉시 Regenerate)
- 키는 서버 `.env`에만, 앱 번들·깃 커밋 절대 금지 (본 저장소는 `.gitignore` 적용됨)
