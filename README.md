<!-- AI 연구소 사이트 운영·관리 안내 -->
# 폭스러닝센터 AI 연구소 사이트

실서비스 : https://ai.foxconnect.kr (본사 서버) · 관리자 : https://sungjjoo.github.io/fox-ai-lab/admin.html

## 구조 한눈에 보기

```
[관리자 페이지] ──저장──▶ GitHub (main) ──자동 배포──▶ GitHub Pages (data/*.json, images/u/*)
                                                         ▲
[ai.foxconnect.kr 본사 서버]  화면 틀(HTML·CSS·JS)만 보관 ──┘ 페이지를 열 때마다 최신 내용을 받아옴
```

- **내용**(프로그램 · 공지·소식 · 팝업 · 대회 사진 · 설정)은 관리자 페이지에서 고치면 바로 반영됩니다. 본사 요청 불필요.
- **디자인·코드**(HTML·CSS·JS)를 바꿀 때만 본사에 업로드를 요청합니다.
- GitHub 에서 데이터를 못 받아오면 HTML 에 들어 있는 내용이 그대로 보입니다. (사이트가 깨지지 않음)

## 관리자 사용법

1. https://sungjjoo.github.io/fox-ai-lab/admin.html 접속 → GitHub 토큰으로 로그인 (발급 방법은 로그인 화면에 있음)
2. 왼쪽 메뉴에서 고칠 곳을 고르고 수정
3. 아래에 뜨는 **저장하고 사이트에 반영** 클릭
4. GitHub Pages 는 1~2분, 본사 서버(ai.foxconnect.kr)는 캐시 때문에 **최대 10분** 뒤 반영

| 메뉴 | 반영되는 곳 | 데이터 파일 |
| --- | --- | --- |
| 프로그램 | 프로그램 페이지(활동 표·4가지 영역·포스터), 곳곳의 「N가지 활동」 문구, 상담 폼의 관심 프로그램 목록 | `data/programs.json` |
| 공지·소식 | 공지·소식 페이지, 메인 「새 소식」(최근 3개) | `data/news.json` |
| 팝업 | 메인 화면 팝업 | `data/popups.json` |
| 대회 사진 | 대회 활동 페이지의 「사진으로 보기」 | `data/slideshows.json` |
| 설정 | 상담 문의 페이지의 온라인 신청 폼 | `data/site.json` |

- 올린 사진은 자동으로 webp 로 변환·축소되어 `images/u/` 에 저장됩니다.
- 저장 직전에 다른 곳에서 같은 내용이 먼저 바뀌었으면 저장을 막습니다. (덮어쓰기 방지)

## 온라인 상담 신청 연결 (처음 한 번)

정적 사이트는 접수 내용을 저장할 곳이 없어서 **구글 시트 + Apps Script**(무료)를 씁니다.

1. 구글 드라이브에서 새 스프레드시트 생성 (예: AI 연구소 상담 문의)
2. 메뉴 **확장 프로그램 → Apps Script** 열기
3. [`tools/inquiry-apps-script.gs`](tools/inquiry-apps-script.gs) 내용을 전부 붙여넣고, 맨 위 `NOTIFY_EMAIL` 을 알림 받을 주소로 바꿔 저장
4. **배포 → 새 배포 → 유형: 웹 앱**, 실행 사용자 **나**, 액세스 권한 **모든 사용자** → 배포 (권한 승인 창이 뜨면 허용)
5. 나온 웹 앱 URL(`…/exec`)을 관리자 **설정 → 접수 주소**에, 시트 주소를 **문의 시트 주소**에 넣고 저장

접수 주소가 비어 있으면 신청 폼은 숨겨지고 전화·카카오톡 안내만 보입니다.
Apps Script 코드를 고친 뒤에는 **배포 관리 → 수정 → 새 버전**으로 다시 배포해야 반영됩니다.

> 개인정보 수집·이용 안내 문구(보유 기간 1년 등)는 `contact.html` 에 있습니다. 회사 방침에 맞는지 확인하세요.

## 본사에 업로드할 파일 만들기 (디자인·코드를 바꿨을 때만)

`main` 브랜치에 커밋한 뒤 저장소 폴더에서 실행하면 `upload.zip` 이 만들어집니다.

```bash
git archive -o upload.zip HEAD -- *.html css js fonts images robots.txt sitemap.xml
```

`data/` 는 본사 서버에서 쓰지 않으므로(항상 GitHub Pages 에서 받아옴) 보내지 않아도 됩니다.

## 로컬에서 미리보기

```bash
python -m http.server 8080
```

http://localhost:8080 — 로컬·GitHub Pages 에서는 같은 폴더의 `data/` 를, 그 밖의 도메인에서는 GitHub Pages 의 `data/` 를 읽습니다. (`js/content.js` 의 `BASE`)
