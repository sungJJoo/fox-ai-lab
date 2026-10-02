// FOX CMS 저장 대행 Google Apps Script: 관리자 비밀번호 확인 후, 숨겨 둔 GitHub 토큰으로 콘텐츠 저장을 대신한다 (설정 방법은 README 참고)

// 「프로젝트 설정 → 스크립트 속성」에 넣을 값 (코드에 직접 쓰지 마세요)
//   GITHUB_TOKEN   : fox-ai-lab 저장소 Contents 읽기·쓰기 권한 토큰
//   ADMIN_PASSWORD : 관리자 비밀번호 (바꾸면 모든 기기의 로그인이 풀립니다)
var REPO = 'sungJJoo/fox-ai-lab';
var BRANCH = 'main';
var SESSION_DAYS = 30;
var MAX_FAILS = 5;            // 비밀번호를 이만큼 연속으로 틀리면
var LOCK_MINUTES = 10;        // 이 시간 동안 로그인을 막는다
var AUTHOR_EMAIL = 'cms@ai.foxconnect.kr';   // 변경 이력에서 CMS 저장을 알아보는 표시

// 관리 화면이 쓰는 GitHub API 만 허용 (경로는 저장소 주소 뒤 부분)
var ALLOW = [
	['GET', /^\/commits\?sha=main&path=data&per_page=\d{1,3}$/],
	['GET', /^\/contents\/[\w\-./]+\?ref=\w+$/],
	['GET', /^\/git\/ref\/heads\/main$/],
	['GET', /^\/git\/commits\/[0-9a-f]{40}$/],
	['POST', /^\/git\/blobs$/],
	['POST', /^\/git\/trees$/],
	['POST', /^\/git\/commits$/],
	['PATCH', /^\/git\/refs\/heads\/main$/]
];

// 저장할 수 있는 파일: 콘텐츠 데이터와 사진뿐 (사이트 코드는 비밀번호가 새도 바꿀 수 없다)
var WRITABLE = [
	/^data\/[\w-]+\.json$/,
	/^images\/u\/[\w-]+(\/[\w-]+)*\.webp$/,
	/^images\/[\w-]+-photos\/[\w-]+\.(webp|jpg|jpeg|png)$/
];

function doGet() {
	return ContentService.createTextOutput('FOX CMS 저장 대행이 동작 중입니다.');
}

function doPost(e) {
	try {
		var d = JSON.parse(e.postData.contents);
		if (d.action === 'login') return json(login(d));

		var s = findSession(d.session);
		if (!s) return json({ status: 401, error: 'session' });
		if (d.action === 'logout') {
			props().deleteProperty(s.key);
			return json({ status: 200 });
		}
		if (d.action === 'api') return json(proxy(d, s));
		return json({ status: 400, error: '알 수 없는 요청입니다.' });
	} catch (err) {
		return json({ status: 500, error: String(err) });
	}
}

/* ── 로그인 · 세션 ─────────────────────── */

function login(d) {
	var pw = props().getProperty('ADMIN_PASSWORD');
	if (!pw || !props().getProperty('GITHUB_TOKEN')) {
		return { status: 500, error: '저장 대행 설정이 끝나지 않았습니다. (스크립트 속성 GITHUB_TOKEN · ADMIN_PASSWORD)' };
	}
	var name = clip(d.name, 20);
	if (!name) return { status: 400, error: '이름을 적어 주세요.' };

	var cache = CacheService.getScriptCache();
	var fails = Number(cache.get('fails') || 0);
	if (fails >= MAX_FAILS) {
		return { status: 429, error: '비밀번호를 여러 번 틀려 ' + LOCK_MINUTES + '분 동안 로그인이 잠겼습니다.' };
	}
	if (hash(String(d.password || '')) !== hash(pw)) {
		cache.put('fails', String(fails + 1), LOCK_MINUTES * 60);
		var left = MAX_FAILS - fails - 1;
		return { status: 403, error: left > 0 ? '비밀번호가 맞지 않습니다. (' + left + '번 더 틀리면 잠깁니다)' : '비밀번호를 여러 번 틀려 ' + LOCK_MINUTES + '분 동안 로그인이 잠겼습니다.' };
	}
	cache.remove('fails');

	dropExpired();
	var id = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
	props().setProperty('session_' + hash(id), JSON.stringify({
		name: name,
		exp: Date.now() + SESSION_DAYS * 864e5,
		pw: hash(pw).slice(0, 16)
	}));
	return { status: 200, session: id, name: name };
}

// 비밀번호가 바뀌었거나 기간이 지난 세션은 무효
function findSession(id) {
	if (!id) return null;
	var key = 'session_' + hash(String(id));
	var raw = props().getProperty(key);
	if (!raw) return null;
	var s = JSON.parse(raw);
	var pw = props().getProperty('ADMIN_PASSWORD') || '';
	if (s.exp < Date.now() || s.pw !== hash(pw).slice(0, 16)) {
		props().deleteProperty(key);
		return null;
	}
	s.key = key;
	return s;
}

function dropExpired() {
	var all = props().getProperties();
	Object.keys(all).forEach(function (k) {
		if (k.indexOf('session_') !== 0) return;
		try { if (JSON.parse(all[k]).exp < Date.now()) props().deleteProperty(k); } catch (e) { props().deleteProperty(k); }
	});
}

/* ── GitHub API 대리 호출 ──────────────── */

function proxy(d, s) {
	var method = String(d.method || 'GET').toUpperCase();
	var path = String(d.path || '');
	var ok = path.indexOf('..') < 0 && ALLOW.some(function (a) { return a[0] === method && a[1].test(path); });
	if (!ok) return { status: 403, error: '허용되지 않은 요청입니다.' };

	var body = d.body || null;
	if (path === '/git/trees') {
		var tree = (body && body.tree) || [];
		var bad = tree.filter(function (t) { return !WRITABLE.some(function (re) { return re.test(String(t.path)); }); });
		if (bad.length) return { status: 403, error: '이 파일은 CMS 에서 바꿀 수 없습니다: ' + bad[0].path };
		body = { base_tree: String(body.base_tree), tree: tree };
	} else if (path === '/git/commits') {
		body = {
			message: clip(body.message, 200),
			tree: String(body.tree),
			parents: [String(body.parents[0])],
			author: { name: s.name, email: AUTHOR_EMAIL, date: new Date().toISOString() }
		};
	} else if (method === 'PATCH') {
		body = { sha: String(body.sha), force: false };   // 덮어쓰기 금지: 최신 상태 위에만 저장
	}

	var opts = {
		method: method.toLowerCase(),
		muteHttpExceptions: true,
		headers: {
			'Authorization': 'Bearer ' + props().getProperty('GITHUB_TOKEN'),
			'Accept': 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28'
		}
	};
	if (body) {
		opts.contentType = 'application/json';
		opts.payload = JSON.stringify(body);
	}
	var r = UrlFetchApp.fetch('https://api.github.com/repos/' + REPO + path, opts);
	var code = r.getResponseCode();
	var text = r.getContentText();
	if (code === 401) return { status: 502, error: 'github-auth' };
	return { status: code, body: text ? JSON.parse(text) : null };
}

/* ── 도우미 ───────────────────────────── */

function props() { return PropertiesService.getScriptProperties(); }

function clip(v, n) { return String(v == null ? '' : v).trim().slice(0, n); }

function hash(str) {
	return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8)
		.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function json(o) {
	return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
