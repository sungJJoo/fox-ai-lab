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

## 10. Blender 3D 영상 60초 (2026-10-02)
- [x] Blender 5.2.2 LTS 포터블(공식, sha256 확인)을 임시 폴더에서 사용 — 사용자 승인
- [x] videos/blender-promo/build.py: 구역 9개를 3D 공간에 배치, 카메라가 120BPM 장면 경계에 맞춰 이동
- [x] 함정: 서브셋 GmarketSans 이름 테이블(1·4번) 누락 → Blender 글꼴 로드 크래시 → fontTools 로 채움 / SVG 클래스 색 미지원 → 경로 순서로 직접 칠함 / 위치·회전 보간 불일치 → 같은 각도로 함께 키 / 사진 간격 < 카메라 거리 → 지나간 사진이 화면을 가림
- [x] 1800 프레임 렌더(7분 43초, Eevee · RTX 4060) → 음악 합성 → videos/blender-promo/out/fox-ai-3d-60s.mp4 (60s, 31MB) / 약속 장면 카메라 기울기로 왼쪽 잘림 → 180프레임 재렌더

## 11. 관리자 → FOX CMS 개편 (2026-10-02)
- [x] 프로그램 이름의 테스트 문구 「222」 삭제
- [x] 이름·로고: FOX CMS, 사이드바 그룹(콘텐츠/시스템)·아이콘, 로그인 계정 표시
- [x] 대시보드: 콘텐츠 현황 카드, 상담 신청 연결 상태, 최근 변경 5건
- [x] 변경 이력: data/ 커밋 목록, 특정 시점 내용 불러오기(저장 전 확인, 지워진 업로드 사진 복구)
- [x] 반영 확인: 저장 후 GitHub Pages 의 데이터가 저장본과 같아질 때까지 확인해 「반영 완료」 표시
- [x] 검증: 가짜 GitHub API 로 대시보드·이력·되돌리기·저장·반영 확인 흐름

## 12. 비밀번호 로그인 (2026-10-02)
- [x] 프로그램 순서 원래대로 (관리자 테스트 때 바뀐 「레고로 키우는 문제 해결의 힘」 → 4번째)
- [x] 팝업 목록 「예정」 옆에 시작일 표시 (10/10 하루짜리 팝업이 안 보인다는 문의)
- [x] tools/cms-apps-script.gs: 비밀번호 확인 → 세션 → GitHub API 대리 호출 (토큰은 스크립트 속성에 숨김)
- [x] 허용 목록: 관리 화면이 쓰는 API 만, 저장 경로는 data/*.json · images/u/ · images/*-photos/ 만 (사이트 코드 수정 불가)
- [x] 비밀번호 연속 실패 잠금, 비밀번호를 바꾸면 모든 로그인 해제
- [x] admin: 이름+비밀번호 로그인 기본, GitHub 토큰은 「개발자 로그인」으로 유지
- [x] 변경 이력에 로그인한 이름 표시 (커밋 작성자)
- [x] 설정: CMS 저장 주소 입력칸 + 만드는 방법
- [x] 검증: Apps Script 코드를 Node 에서 가짜 구글 서비스·가짜 GitHub 로 실행 → 틀린 비번·잠금·허용 밖 요청·코드 파일 저장 차단·로그인·자동 재로그인·저장(사진 추가/삭제 포함)·이력 이름·비번 변경 시 로그아웃·토큰 만료 안내·로그아웃 시 세션 삭제·주소 미설정 시 개발자 로그인 안내
- [ ] 사용자: Apps Script 저장 대행 배포 → 설정에 주소 입력 (실제 구글 계정 필요)
- [ ] push · upload.zip (사용자가 마지막에 결정)
- [x] README 운영 안내 갱신

## 13. 팝업 → 공지·소식 옵션 (2026-10-06)
- [x] 팝업을 따로 만들지 않고 공지·소식 글에서 「메인 팝업으로 띄우기」로 지정 (기간·팝업 이미지 선택)
- [x] 팝업을 누르면 그 글 상세로 이동, 이미지가 없으면 글의 첫 사진 → 그것도 없으면 글자 팝업
- [x] CMS 「팝업」 메뉴는 팝업 지정 글 모아 보기 + 「팝업 공지 쓰기」
- [x] 기존 팝업 1개를 공지 글로 옮기고 data/popups.json 삭제
- [x] 검증: 사이트 팝업(사진형·글자형·2개 넘기기)·글 상세 이동, CMS 목록·글 편집 옵션·저장
