<!-- 리뉴얼(관리자·콘텐츠 분리) 작업 체크리스트 -->
# 작업 체크리스트 — 관리자 리뉴얼 (③안: 본사 1회 업로드 + GitHub Pages 데이터)

## 0. 준비
- [x] 저장소 클론, `renewal-admin` 브랜치 생성
- [x] 계획 · checklist.md · context-notes.md 작성
- [x] 시안 파일 `v2~v9-*.html` 삭제
- [x] 방향 변경: 로컬 관리자 → ③안 (사용자 결정 2026-10-01)

## 1. 콘텐츠 분리
- [x] `js/content.js` — 본사 도메인이면 GitHub Pages 데이터, 아니면 같은 폴더 데이터
- [x] `data/programs.json` 추출, 프로그램 페이지 3구역 + 활동 수 문구 연결
- [x] **검증**: 데이터로 그린 결과 = 원본 HTML (3구역 모두 동일), 변경 시 교체·번호·이스케이프·개수 갱신
- [x] 슬라이드쇼 데이터도 GitHub Pages 에서, 포스터 확대 위임 방식으로

## 2. 공지·소식
- [x] `news.html`, `js/news.js`, `data/news.json`, 전 페이지 메뉴, sitemap
- [x] **검증**: 목록·고정·분류·페이지·상세·없는 글·이스케이프·자동 링크·모바일·1024px 메뉴

## 3. 팝업
- [x] `js/popup.js`, `data/popups.json`, 메인 전용
- [x] **검증**: 기간 외·꺼짐 제외, 오늘 하루 보지 않기, 모바일 한 장씩

## 4. 문의 접수
- [x] 상담 신청 폼 + `js/inquiry.js` + `data/site.json`, 주소 없으면 숨김
- [x] `tools/inquiry-apps-script.gs` (시트 저장 · 메일 알림 · 수식 주입 방지 · 봇 거르기)
- [x] **검증**: 필수값 차단, 실패/성공 메시지, 전송 데이터
- [ ] 실제 Apps Script 배포 후 실전송 확인 (사용자 구글 계정 필요)

## 5. 관리자
- [x] 프로그램 · 공지·소식 · 팝업 · 대회 사진 · 설정, 단일 커밋 저장
- [x] 동시 수정 감지, 저장 전 검사, 업로드 이미지 정리
- [x] **검증**: 가짜 GitHub API 로 로그인→편집→저장→커밋 트리, 삭제, 충돌, 되돌리기, 모바일

## 6. 마무리
- [x] README (운영·문의 연동·본사 업로드 방법)
- [x] 본사 서버 모드 확인 (원격 데이터 없을 때 HTML 그대로)
- [x] `main` 병합 · push (2026-10-01, GitHub Pages 반영 확인)
- [ ] 본사에 업로드 요청 (upload.zip)

## 7. 업로드 전 마무리 (2026-10-01 추가 요청)
- [x] 메인 「최근 소식」 3개 (data/news.json)
- [x] 설문: 확인 결과 7/28 사용자가 라이브에서 제거한 기능 → 작업 제외, 잘못된 안내 문구 정리
- [x] SEO: og:url · sitemap · robots · canonical → https://ai.foxconnect.kr
- [x] UI 점검 (web-design-guidelines) 후 수정 — 본문 바로가기, 모달 포커스, 메뉴 aria-expanded, 헤더 가림 방지, 제목 줄바꿈, 캐시 버전
- [x] hyperframes 로 홍보 영상 제작 — renders/video.mp4 (45s), renders/video-60s.mp4 (60s, PBL 5단계·다섯 가지 약속 추가) — 1920x1080, 무음, git 제외
- [x] Python + FFmpeg 대회 사진 하이라이트 — videos/highlight/make_highlight.py → renders/fox-competition-highlight.mp4 (43.2s, 자막은 data/slideshows.json)

## 8. Remotion 마케팅 영상 (2026-10-01 추가 요청)
- [x] 기획: 타깃·인사이트·약속·증거·CTA, 9:16 30초, 120BPM 비트에 컷 맞춤
- [x] 프로젝트: videos/remotion-promo (create-video --blank), 폰트·사진 public/
- [x] 음악: Python 합성 BGM (저작권 없음) → public/music.wav
- [x] 장면 7개 (훅 AI 채팅 → 질문 → 전환 → 비트 몽타주 → 숫자 → 무대 → CTA)
- [x] Studio 미리보기 확인 → 렌더 → 프레임 추출 확인
- [x] 라이선스: 직원 4명 이상 회사는 Remotion 회사 라이선스 필요 — 사용자에게 고지함
- [x] Remotion 4.0.531 배포본 결함(@remotion/cli queue.js 0바이트 → Studio 오류) 발견, 4.0.530 으로 고정
- [x] 대상 연령 문구 정정: 「6세부터 중등까지」 → 「6세부터 고등까지 · 성인·기관 연수도 가능」(사이트 상담 페이지 기준), Remotion·hyperframes 60초 재렌더 / 45초본은 미수정

## 9. Python 마케팅 영상 60초 (2026-10-02)
- [x] videos/marketing-py/make_promo.py → out/fox-ai-marketing-60s.mp4 (1080x1920, 60s, 합성 BGM -11.8 LUFS)
- [x] 장면 9개: 훅 AI 채팅 → 문제 제기(외우는 힘?·검색하는 힘?·질문하는 힘.) → 약속 → PBL 5단계 → 사진 12장 비트 몽타주 → 숫자 → 무대 → 다섯 가지 약속 → CTA
- [x] Pillow 함정 기록: Space Grotesk 가변 글꼴 기본 굵기 Light → Bold 지정, GmarketSans 서브셋 공백 폭 → 단어 단위 배치
