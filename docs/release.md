# GitHub Releases로 exe 배포하기 (5분)

사이트 다운로드 버튼은 아래 주소 형식으로 연결됩니다.

```
https://github.com/<깃허브ID>/<저장소명>/releases/download/v0.1.0/Valorant-Tracker-KR-Setup-0.1.0.exe
```

## 순서

1. GitHub에서 새 **private 저장소** 생성 (이름 예: `valorant-tracker-kr`)
2. 이 `valorant-tracker` 폴더 통째로 푸시
   - `.env`는 `.gitignore`에 있어서 절대 안 올라감 (확인됨)
   - `dist/`, `node_modules/`, `.tools/`도 제외됨
3. 태그 찍고 푸시:
   ```
   git tag v0.1.0
   git push origin v0.1.0
   ```
4. Actions 탭에서 `Build Windows exe` 완료 대기 (수 분) → Releases에 exe 자동 첨부
5. 위 형식의 실제 URL을 나에게 전달 → 사이트 `config.js`에 반영 + 재배포하면 버튼이 실다운로드로 동작

## 버전 올릴 때

- `electron-app/package.json`의 `version` 올리기 (예: 0.2.0)
- `git tag v0.2.0 && git push origin v0.2.0` → 새 exe 자동 빌드
- 사이트 config의 URL 버전 숫자만 교체
