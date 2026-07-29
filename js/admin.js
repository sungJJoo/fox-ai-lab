// 사진 관리 로직: GitHub API로 이미지 변환·업로드 및 단일 커밋 반영
(function () {
	'use strict';

	var REPO_OWNER = 'sungJJoo';
	var REPO_NAME = 'fox-ai-lab';
	var BRANCH = 'main';
	var DATA_PATH = 'data/slideshows.json';
	var MAX_WIDTH = 1440;          // 슬라이드쇼 표시 최대 폭
	var WEBP_QUALITY = 0.8;
	var TOKEN_KEY = 'foxai_admin_token';

	var API = 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME;

	var token = null;
	var albums = null;      // { fll: {title, photos:[{src, caption}]}, ... }
	var original = null;    // 원본 스냅샷 (되돌리기용)
	var newBlobs = {};      // { 'images/xxx.webp': base64 } 새로 올릴 파일
	var removedFiles = [];  // 삭제할 파일 경로
	var curKey = null;

	var $ = function (id) { return document.getElementById(id); };

	/* ── 유틸 ─────────────────────────────── */

	function toast(msg, isErr) {
		var t = $('toast');
		t.textContent = msg;
		t.classList.toggle('is-err', !!isErr);
		t.hidden = false;
		clearTimeout(t._timer);
		t._timer = setTimeout(function () { t.hidden = true; }, isErr ? 6000 : 3200);
	}

	function utf8ToBase64(str) {
		var bytes = new TextEncoder().encode(str);
		var bin = '';
		bytes.forEach(function (b) { bin += String.fromCharCode(b); });
		return btoa(bin);
	}

	function blobToBase64(blob) {
		return new Promise(function (res, rej) {
			var r = new FileReader();
			r.onload = function () { res(String(r.result).split(',')[1]); };
			r.onerror = rej;
			r.readAsDataURL(blob);
		});
	}

	function api(path, opts) {
		opts = opts || {};
		return fetch(API + path, {
			method: opts.method || 'GET',
			headers: {
				'Authorization': 'Bearer ' + token,
				'Accept': 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28'
			},
			body: opts.body ? JSON.stringify(opts.body) : undefined
		}).then(function (r) {
			if (!r.ok) {
				return r.json().catch(function () { return {}; }).then(function (j) {
					throw new Error('GitHub ' + r.status + ': ' + (j.message || r.statusText));
				});
			}
			return r.status === 204 ? null : r.json();
		});
	}

	/* ── 이미지 변환 ───────────────────────── */

	function convertToWebp(file) {
		return new Promise(function (res, rej) {
			var url = URL.createObjectURL(file);
			var img = new Image();
			img.onload = function () {
				URL.revokeObjectURL(url);
				var w = img.naturalWidth, h = img.naturalHeight;
				if (w > MAX_WIDTH) { h = Math.round(h * MAX_WIDTH / w); w = MAX_WIDTH; }
				var c = document.createElement('canvas');
				c.width = w; c.height = h;
				var ctx = c.getContext('2d');
				ctx.imageSmoothingQuality = 'high';
				ctx.drawImage(img, 0, 0, w, h);
				c.toBlob(function (blob) {
					if (!blob) return rej(new Error('이미지 변환에 실패했습니다.'));
					res({ blob: blob, width: w, height: h });
				}, 'image/webp', WEBP_QUALITY);
			};
			img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('이미지를 읽을 수 없습니다: ' + file.name)); };
			img.src = url;
		});
	}

	function nextFileName(key) {
		var dir = 'images/' + key + '-photos/';
		var used = {};
		albums[key].photos.forEach(function (p) { used[p.src] = 1; });
		Object.keys(newBlobs).forEach(function (p) { used[p] = 1; });
		var n = 1;
		while (used[dir + key + '-' + String(n).padStart(2, '0') + '.webp']) n++;
		return dir + key + '-' + String(n).padStart(2, '0') + '.webp';
	}

	/* ── 렌더 ─────────────────────────────── */

	function renderTabs() {
		var box = $('albumTabs');
		box.innerHTML = '';
		Object.keys(albums).forEach(function (key) {
			var b = document.createElement('button');
			b.type = 'button';
			b.className = 'ad-tab' + (key === curKey ? ' is-on' : '');
			b.textContent = albums[key].title + ' (' + albums[key].photos.length + ')';
			b.addEventListener('click', function () { curKey = key; render(); });
			box.appendChild(b);
		});
	}

	function render() {
		renderTabs();
		var al = albums[curKey];
		$('albumTitle').textContent = al.title;
		$('photoCount').textContent = '사진 ' + al.photos.length + '장';

		var list = $('photoList');
		list.innerHTML = '';

		al.photos.forEach(function (p, i) {
			var li = document.createElement('li');
			li.className = 'ad-item' + (newBlobs[p.src] ? ' is-new' : '');

			var no = document.createElement('span');
			no.className = 'ad-item-no';
			no.textContent = i + 1;

			var thumb = document.createElement('div');
			thumb.className = 'ad-item-thumb';
			var im = document.createElement('img');
			im.alt = '';
			im.loading = 'lazy';
			im.src = newBlobs[p.src] ? 'data:image/webp;base64,' + newBlobs[p.src] : p.src + '?v=' + Date.now();
			thumb.appendChild(im);

			var body = document.createElement('div');
			body.className = 'ad-item-body';
			var ta = document.createElement('textarea');
			ta.className = 'ad-item-cap';
			ta.rows = 2;
			ta.value = p.caption;
			ta.placeholder = '사진 설명을 적어주세요 (화면에 표시되고, 시각장애인 안내에도 쓰입니다)';
			ta.addEventListener('input', function () { p.caption = ta.value; markDirty(); });
			var f = document.createElement('small');
			f.className = 'ad-item-file';
			f.innerHTML = (newBlobs[p.src] ? '<span class="ad-item-tag">새 사진</span>' : '') + p.src;
			body.appendChild(ta);
			body.appendChild(f);

			var acts = document.createElement('div');
			acts.className = 'ad-item-acts';
			acts.appendChild(iconBtn('↑', '위로', i === 0, function () { move(i, -1); }));
			acts.appendChild(iconBtn('↓', '아래로', i === al.photos.length - 1, function () { move(i, 1); }));
			acts.appendChild(iconBtn('✕', '삭제', false, function () { removePhoto(i); }, true));

			li.appendChild(no);
			li.appendChild(thumb);
			li.appendChild(body);
			li.appendChild(acts);
			list.appendChild(li);
		});

		updateSaveBar();
	}

	function iconBtn(label, title, disabled, fn, isDel) {
		var b = document.createElement('button');
		b.type = 'button';
		b.className = 'ad-ico-btn' + (isDel ? ' is-del' : '');
		b.textContent = label;
		b.title = title;
		b.setAttribute('aria-label', title);
		b.disabled = disabled;
		b.addEventListener('click', fn);
		return b;
	}

	function move(i, dir) {
		var ph = albums[curKey].photos;
		var j = i + dir;
		if (j < 0 || j >= ph.length) return;
		var tmp = ph[i]; ph[i] = ph[j]; ph[j] = tmp;
		markDirty();
		render();
	}

	function removePhoto(i) {
		var ph = albums[curKey].photos;
		var p = ph[i];
		if (!confirm((i + 1) + '번째 사진을 삭제할까요?\n\n' + (p.caption || p.src))) return;
		ph.splice(i, 1);
		if (newBlobs[p.src]) {
			delete newBlobs[p.src];               // 아직 안 올린 새 사진 → 그냥 취소
		} else if (removedFiles.indexOf(p.src) === -1) {
			removedFiles.push(p.src);             // 이미 있던 파일 → 저장 시 삭제
		}
		markDirty();
		render();
	}

	/* ── 변경 상태 ─────────────────────────── */

	function isDirty() {
		return JSON.stringify(albums) !== JSON.stringify(original) ||
			Object.keys(newBlobs).length > 0 || removedFiles.length > 0;
	}

	function markDirty() { updateSaveBar(); }

	function updateSaveBar() {
		var bar = $('saveBar');
		if (!isDirty()) { bar.hidden = true; return; }
		var added = Object.keys(newBlobs).length;
		var parts = [];
		if (added) parts.push('사진 ' + added + '장 추가');
		if (removedFiles.length) parts.push(removedFiles.length + '장 삭제');
		parts.push('변경 사항 있음');
		$('saveInfo').textContent = parts.join(' · ');
		bar.hidden = false;
	}

	/* ── 파일 추가 ─────────────────────────── */

	function addFiles(files) {
		var imgs = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
		if (!imgs.length) { toast('이미지 파일만 추가할 수 있습니다.', true); return; }
		toast(imgs.length + '장 변환 중…');

		var chain = Promise.resolve();
		imgs.forEach(function (file) {
			chain = chain.then(function () {
				return convertToWebp(file).then(function (r) {
					return blobToBase64(r.blob).then(function (b64) {
						var path = nextFileName(curKey);
						newBlobs[path] = b64;
						albums[curKey].photos.push({ src: path, caption: '' });
					});
				});
			});
		});
		chain.then(function () {
			render();
			toast(imgs.length + '장 추가했습니다. 설명을 적고 저장하세요.');
		}).catch(function (e) {
			toast(e.message, true);
			render();
		});
	}

	/* ── 저장 (단일 커밋) ───────────────────── */

	function save() {
		var btn = $('btnSave');
		btn.disabled = true;
		var empty = [];
		Object.keys(albums).forEach(function (k) {
			albums[k].photos.forEach(function (p, i) {
				if (!p.caption.trim()) empty.push(albums[k].title + ' ' + (i + 1) + '번째');
			});
		});
		if (empty.length && !confirm('설명이 비어 있는 사진이 있습니다.\n\n' + empty.slice(0, 5).join('\n') +
			(empty.length > 5 ? '\n…외 ' + (empty.length - 5) + '장' : '') + '\n\n그래도 저장할까요?')) {
			btn.disabled = false;
			return;
		}

		toast('저장 중…');
		var headSha, treeSha;

		api('/git/ref/heads/' + BRANCH)
			.then(function (ref) {
				headSha = ref.object.sha;
				return api('/git/commits/' + headSha);
			})
			.then(function (c) {
				treeSha = c.tree.sha;
				// 새 이미지 blob 생성
				var paths = Object.keys(newBlobs);
				return Promise.all(paths.map(function (p) {
					return api('/git/blobs', { method: 'POST', body: { content: newBlobs[p], encoding: 'base64' } })
						.then(function (b) { return { path: p, sha: b.sha }; });
				}));
			})
			.then(function (blobs) {
				var tree = blobs.map(function (b) {
					return { path: b.path, mode: '100644', type: 'blob', sha: b.sha };
				});
				// JSON 갱신
				tree.push({
					path: DATA_PATH, mode: '100644', type: 'blob',
					content: JSON.stringify(albums, null, 2) + '\n'
				});
				// 삭제 파일
				removedFiles.forEach(function (p) {
					tree.push({ path: p, mode: '100644', type: 'blob', sha: null });
				});
				return api('/git/trees', { method: 'POST', body: { base_tree: treeSha, tree: tree } });
			})
			.then(function (t) {
				var added = Object.keys(newBlobs).length;
				var msg = '사진 관리: ';
				var bits = [];
				if (added) bits.push(added + '장 추가');
				if (removedFiles.length) bits.push(removedFiles.length + '장 삭제');
				bits.push('설명·순서 갱신');
				return api('/git/commits', {
					method: 'POST',
					body: { message: msg + bits.join(', '), tree: t.sha, parents: [headSha] }
				});
			})
			.then(function (c) {
				return api('/git/refs/heads/' + BRANCH, { method: 'PATCH', body: { sha: c.sha } });
			})
			.then(function () {
				newBlobs = {};
				removedFiles = [];
				original = JSON.parse(JSON.stringify(albums));
				render();
				toast('저장했습니다. 1~2분 뒤 사이트에 반영됩니다.');
			})
			.catch(function (e) {
				toast('저장 실패 — ' + e.message, true);
			})
			.then(function () { btn.disabled = false; });
	}

	/* ── 데이터 로드 ───────────────────────── */

	function loadData() {
		return api('/contents/' + DATA_PATH + '?ref=' + BRANCH).then(function (f) {
			var json = new TextDecoder().decode(
				Uint8Array.from(atob(f.content.replace(/\n/g, '')), function (c) { return c.charCodeAt(0); })
			);
			albums = JSON.parse(json);
			original = JSON.parse(JSON.stringify(albums));
			curKey = Object.keys(albums)[0];
		});
	}

	/* ── 로그인 ───────────────────────────── */

	function login(t) {
		token = t;
		$('loginMsg').textContent = '확인 중…';
		$('loginMsg').className = 'ad-msg';
		return api('').then(function (repo) {
			if (!repo.permissions || !repo.permissions.push) {
				throw new Error('이 저장소에 쓰기 권한이 없는 토큰입니다. Contents 권한을 Read and write로 발급해 주세요.');
			}
			return loadData();
		}).then(function () {
			localStorage.setItem(TOKEN_KEY, token);
			$('loginCard').hidden = true;
			$('workArea').hidden = false;
			$('btnLogout').hidden = false;
			$('adUser').hidden = false;
			$('adUser').textContent = REPO_OWNER + '/' + REPO_NAME;
			render();
		}).catch(function (e) {
			token = null;
			var m = $('loginMsg');
			m.className = 'ad-msg is-err';
			m.textContent = /401|403/.test(e.message)
				? '토큰이 올바르지 않거나 만료되었습니다. 다시 발급해 주세요.'
				: e.message;
			throw e;
		});
	}

	/* ── 초기화 ───────────────────────────── */

	$('btnLogin').addEventListener('click', function () {
		var v = $('tokenInput').value.trim();
		if (!v) { $('loginMsg').className = 'ad-msg is-err'; $('loginMsg').textContent = '토큰을 붙여넣어 주세요.'; return; }
		login(v).catch(function () {});
	});
	$('tokenInput').addEventListener('keydown', function (e) {
		if (e.key === 'Enter') $('btnLogin').click();
	});

	$('btnLogout').addEventListener('click', function () {
		if (isDirty() && !confirm('저장하지 않은 변경이 있습니다. 로그아웃할까요?')) return;
		localStorage.removeItem(TOKEN_KEY);
		location.reload();
	});

	$('fileInput').addEventListener('change', function (e) {
		addFiles(e.target.files);
		e.target.value = '';
	});

	var dz = $('dropZone');
	['dragenter', 'dragover'].forEach(function (ev) {
		dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('is-over'); });
	});
	['dragleave', 'drop'].forEach(function (ev) {
		dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('is-over'); });
	});
	dz.addEventListener('drop', function (e) {
		if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
	});

	$('btnSave').addEventListener('click', save);
	$('btnDiscard').addEventListener('click', function () {
		if (!confirm('저장하지 않은 변경을 모두 되돌릴까요?')) return;
		albums = JSON.parse(JSON.stringify(original));
		newBlobs = {};
		removedFiles = [];
		render();
		toast('되돌렸습니다.');
	});

	window.addEventListener('beforeunload', function (e) {
		if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
	});

	// 저장된 토큰으로 자동 로그인
	var saved = localStorage.getItem(TOKEN_KEY);
	if (saved) {
		login(saved).catch(function () { localStorage.removeItem(TOKEN_KEY); });
	}
})();
