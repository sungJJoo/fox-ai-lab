<!-- 리뉴얼 작업의 배경·결정·주의사항 기록 -->
# 작업 노트

## 배경 (2026-10-01)
- 실서비스 `ai.foxconnect.kr` = Apache/Ubuntu (IP 20.196.211.90). GitHub Pages 아님.
- 본사가 외부 업체를 통해 도메인·호스팅을 붙였고, 우리는 **정적 파일만 제공**한다.
- 서버를 관리할 사람이 없다 → 백엔드(Node/DB) 도입 불가. 파일 수정 → 업로드 방식 유지.
- 기존 `admin.html` 은 GitHub API 커밋 방식이라, 서버가 GitHub 을 pull 하지 않으면 실사이트에 반영되지 않는다.
- 요구 기능: 프로그램 소개 추가·수정, 문의 접수, 팝업, 공지·소식. 시안 파일(v2~v9) 삭제 OK.

## 결정
| 주제 | 결정 | 이유 |
| --- | --- | --- |
| 관리자 실행 | 로컬 Chrome/Edge 에서 `admin/index.html` 열고 사이트 폴더 선택 (File System Access API) | 서버·토큰 불필요, 결과물이 곧 업로드할 파일 |
| 프로그램 | `data/programs.json` 이 원본, 저장 시 `programs.html` 마커 구간을 다시 생성(bake) | 실사이트는 완성 HTML 그대로 → SEO·애니메이션·common.js 바인딩 영향 없음 |
| 공지·소식 | `news.html` 이 `data/news.json` 을 읽어 렌더 | 상세 페이지를 글마다 파일로 만들 필요 없음 |
| 팝업 | `data/popups.json`, 메인(index)에서만 | 일반적 관행 |
| 문의 접수 | Google Apps Script 웹앱 → 구글 시트 + 메일 알림 | 정적 사이트는 접수 저장 불가, 무료·관리 부담 없음 |
| 슬라이드쇼 | 기존 기능을 새 관리자로 이전 | 기존 기능 회귀 방지 |
| WSU-SITE 참고 범위 | 관리자 화면 구성(사이드 메뉴·목록/작성 화면 패턴)만 차용 | WSU 는 Express+SQLite 서버 전제라 구조는 그대로 못 씀 |

## 주의
- `fetch('data/...json')` 는 file:// 에서 막힌다 → 사이트 미리보기는 로컬 서버 필요(`npx serve` 등). 관리자는 파일 핸들로 읽으므로 무관.
- `js/common.js` 의 설문(SV_PROGRAMS)은 14개 프로그램이 하드코딩. 관리자에서 프로그램을 추가해도 설문 추천엔 안 들어감 → 후속 과제.
- `og:url`, `sitemap.xml`, `robots.txt` 가 `sungjjoo.github.io` 를 가리킴 → 실도메인으로 바꿀지 사용자 확인 필요 (이번 범위 밖).
- 개인정보 수집 동의 문구(보유기간 등)는 본사 확인 필요.
- 이미 서버에 올라간 기존 `admin.html` 은 업체에 삭제 요청 필요.
