# 백엔드 배포 가이드

목표: `localhost:8787` → 실제 서버 URL (앱의 백엔드 주소 설정에 입력).

## 방법 A — Docker (VPS 어디서든, 권장)

```bash
cd valorant-tracker/backend
docker build -t vlt-backend .
docker run -d --name vlt -p 8787:8787 \
  -e RIOT_API_KEY=... -e ADMIN_TOKEN=... \
  -v vlt-data:/app/data \
  vlt-backend
```

- `data/db.json`은 볼륨에 보관 (컨테이너 재생성해도 주문/키 유지)
- 앞단에 Nginx/Caddy 리버스 프록시 + HTTPS 적용 (Overwolf 앱은 HTTPS 권장)
- 방화벽: 8787은 프록시経由만, `/admin`은 IP 제한 권장

## 방법 B — Render / Fly.io (관리형, 초보 용이)

- 본 저장소를 GitHub private 리포에 푸시 (`.env` 제외 확인!)
- Render Web Service: `backend/` 기준, Build `npm install`, Start `npm start`
- Environment에 `RIOT_API_KEY`, `ADMIN_TOKEN` 등록, 디스크 마운트(`/app/data`) 추가
- 배포 후 URL을 앱 백엔드 주소 + Tebex 웹훅(필요 시)에 반영
- HTTPS 배포 시 `overwolf-app/manifest.json`의 `externally_connectable.matches`에 배포 도메인 추가 후 `.opk` 재판징

## 배포 후 체크리스트

- [ ] `GET /api/health` → `{"ok":true,"mock":false}`
- [ ] `GET /api/career?name=...&tag=...` 실제 데이터 반환 (Riot 승인 후)
- [ ] `/admin` 접속 + 토큰 로그인 + 주문→발급→회수 1회 통과
- [ ] 앱 대시보드 푸터에 배포 URL 저장 → MOCK 안내 문구 사라지는지 확인
- [ ] 호출량 모니터링 (개발 키: 초당 20 / 2분당 100 — 오버레이 팀원 조회는 600ms 간격으로 이미 조절됨)

## 주의

- `db.json`은 단일 서버용 간이 저장소. 사용자가 늘면 SQLite/Postgres로 교체할 것
- ADMIN_TOKEN 유출 시 즉시 교체 + 기존 토큰 무효 (재시작으로 반영)
