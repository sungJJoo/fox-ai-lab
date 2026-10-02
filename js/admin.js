// 관리자 로직: 콘텐츠 JSON 편집 → 이미지 webp 변환 → GitHub 단일 커밋으로 사이트에 반영
(function () {
	'use strict';

	var REPO_OWNER = 'sungJJoo';
	var REPO_NAME = 'fox-ai-lab';
	var BRANCH = 'main';
	var TOKEN_KEY = 'foxai_admin_token';
	var API = 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME;
	var UPLOAD_DIR = 'images/u/';     // 관리자가 올린 이미지 (교체·삭제 시 함께 지움)
	var WEBP_QUALITY = 0.8;

	var FILES = {
		programs: { path: 'data/programs.json', label: '프로그램', empty: { areas: [], activities: [], posters: [] } },
		news: { path: 'data/news.json', label: '공지·소식', empty: [] },
		popups: { path: 'data/popups.json', label: '팝업', empty: [] },
		photos: { path: 'data/slideshows.json', label: '대회 사진', empty: {} },
		site: { path: 'data/site.json', label: '설정', empty: { inquiryEndpoint: '', inquirySheetUrl: '' } }
	};

	var PAGES = 'https://sungjjoo.github.io/fox-ai-lab/';   // 사이트 데이터가 실제로 배포되는 곳 (본사 서버도 여기서 읽음)

	var VIEWS = {
		dashboard: ['대시보드', '사이트 콘텐츠 현황과 최근 변경 내역입니다.', '홈'],
		history: ['변경 이력', '콘텐츠가 언제 어떻게 바뀌었는지 보고, 원하는 시점의 내용으로 되돌릴 수 있습니다.', '시스템'],
		programs: ['프로그램', '프로그램 페이지의 활동 표 · 4가지 영역 · 포스터를 관리합니다.'],
		news: ['공지·소식', '공지·소식 페이지에 올라갈 글을 관리합니다.'],
		popups: ['팝업', '메인 화면에 뜨는 팝업입니다. 「사용」이 켜져 있고 기간 안에 있는 팝업만 보입니다.'],
		photos: ['대회 사진', '대회 활동 페이지 「사진으로 보기」 슬라이드쇼의 사진과 설명입니다.'],
		settings: ['설정', '온라인 상담 신청 연결 등 사이트 설정입니다.']
	};

	var token = null;
	var D = {};          // 편집 중인 데이터
	var orig = {};       // 불러온 시점의 JSON 문자열 (변경 감지·되돌리기)
	var sha = {};        // 불러온 시점의 파일 sha (동시 수정 감지)
	var newBlobs = {};   // { 경로: base64 } 저장 시 올릴 새 이미지
	var removed = [];    // 저장 시 지울 이미지 경로
	var view = 'dashboard';
	var commitLog = null;  // 변경 이력 캐시 (data/ 를 건드린 커밋)
	var ui = { prog: { tab: 'activities', open: -1 }, news: { edit: null }, popups: { edit: null }, photos: { key: null } };

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

	function pad(n) { return String(n).padStart(2, '0'); }
	function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
	function clone(o) { return JSON.parse(JSON.stringify(o)); }
	function oneLine(s) { return String(s || '').replace(/\s*\n\s*/g, ' '); }

	function utf8ToBase64(str) {
		var bin = '';
		new TextEncoder().encode(str).forEach(function (b) { bin += String.fromCharCode(b); });
		return btoa(bin);
	}

	function base64ToUtf8(b64) {
		return new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), function (c) { return c.charCodeAt(0); }));
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
			cache: 'no-store',
			headers: {
				'Authorization': 'Bearer ' + token,
				'Accept': 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28'
			},
			body: opts.body ? JSON.stringify(opts.body) : undefined
		}).then(function (r) {
			if (!r.ok) {
				return r.json().catch(function () { return {}; }).then(function (j) {
					var e = new Error('GitHub ' + r.status + ': ' + (j.message || r.statusText));
					e.status = r.status;
					throw e;
				});
			}
			return r.status === 204 ? null : r.json();
		});
	}

	// 요소 생성: h('div', {class, text, onclick, value, checked...}, 자식...)
	function h(tag, props) {
		var el = document.createElement(tag);
		Object.keys(props || {}).forEach(function (k) {
			var v = props[k];
			if (v == null || v === false) return;
			if (k === 'class') el.className = v;
			else if (k === 'text') el.textContent = v;
			else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
			else if (k === 'value' || k === 'checked' || k === 'hidden' || k === 'disabled' || k === 'multiple') el[k] = v;
			else el.setAttribute(k, v === true ? '' : v);
		});
		for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
		return el;
	}
	function append(el, c) {
		if (c == null || c === false) return;
		if (Array.isArray(c)) c.forEach(function (x) { append(el, x); });
		else el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
	}

	function btn(label, fn, cls, title) {
		return h('button', { type: 'button', class: 'cms-btn ' + (cls || 'cms-btn-ghost'), text: label, title: title, onclick: fn });
	}

	function iconBtn(label, title, disabled, fn, isDel) {
		return h('button', {
			type: 'button', class: 'cms-ico-btn' + (isDel ? ' is-del' : ''), text: label,
			title: title, 'aria-label': title, disabled: disabled, onclick: fn
		});
	}

	function moveBtns(arr, i) {
		return [
			iconBtn('↑', '위로', i === 0, function () { swap(arr, i, i - 1); }),
			iconBtn('↓', '아래로', i === arr.length - 1, function () { swap(arr, i, i + 1); })
		];
	}
	function swap(arr, i, j) {
		var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
		changed(); rerender();
	}

	// 입력칸: obj[key] 와 바로 연결
	function input(obj, key, o) {
		o = o || {};
		var el = h(o.rows ? 'textarea' : 'input', {
			type: o.rows ? null : (o.type || 'text'), rows: o.rows, maxlength: o.max, placeholder: o.ph,
			value: obj[key] == null ? '' : obj[key],
			oninput: function () { obj[key] = el.value; if (o.after) o.after(el.value); changed(); }
		});
		return el;
	}
	function field(label, control, hint) {
		return h('label', { class: 'cms-field' }, h('span', { class: 'cms-field-l', text: label }), control,
			hint ? h('small', { class: 'cms-hint', text: hint }) : null);
	}
	function checkbox(obj, key, label) {
		var el = h('input', { type: 'checkbox', checked: !!obj[key], onchange: function () { obj[key] = el.checked; changed(); } });
		return h('label', { class: 'cms-check' }, el, label);
	}
	function select(obj, key, options) {
		var el = h('select', { onchange: function () { obj[key] = el.value; changed(); } },
			options.map(function (v) { return h('option', { text: v, value: v }); }));
		el.value = obj[key];
		return el;
	}

	/* ── 이미지 ───────────────────────────── */

	function imgUrl(p) {
		if (!p) return '';
		return newBlobs[p] ? 'data:image/webp;base64,' + newBlobs[p] : window.FoxContent.url(p);
	}

	function convertToWebp(file, maxW) {
		return new Promise(function (res, rej) {
			var url = URL.createObjectURL(file);
			var img = new Image();
			img.onload = function () {
				URL.revokeObjectURL(url);
				var w = img.naturalWidth, hgt = img.naturalHeight;
				if (w > maxW) { hgt = Math.round(hgt * maxW / w); w = maxW; }
				var c = document.createElement('canvas');
				c.width = w; c.height = hgt;
				var ctx = c.getContext('2d');
				ctx.imageSmoothingQuality = 'high';
				ctx.drawImage(img, 0, 0, w, hgt);
				c.toBlob(function (blob) {
					if (!blob) return rej(new Error('이미지 변환에 실패했습니다.'));
					res({ blob: blob, width: w, height: hgt });
				}, 'image/webp', WEBP_QUALITY);
			};
			img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('이미지를 읽을 수 없습니다: ' + file.name)); };
			img.src = url;
		});
	}

	function stamp() {
		var d = new Date();
		return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) +
			pad(d.getSeconds()) + '-' + Math.random().toString(36).slice(2, 6);
	}

	// 파일 → webp 변환 후 새 이미지로 등록 (path 를 주면 그 이름으로)
	function addImage(file, maxW, dirOrPath) {
		return convertToWebp(file, maxW).then(function (r) {
			return blobToBase64(r.blob).then(function (b64) {
				var p = /\.webp$/.test(dirOrPath) ? dirOrPath : UPLOAD_DIR + dirOrPath + '/' + stamp() + '.webp';
				newBlobs[p] = b64;
				return { src: p, width: r.width, height: r.height };
			});
		});
	}

	// 더 이상 쓰지 않는 이미지: 새로 올린 것은 취소, 관리자가 올렸던 파일은 저장 시 삭제 (기존 원본 사진은 보존)
	function dropImage(p, any) {
		if (!p) return;
		if (newBlobs[p]) delete newBlobs[p];
		else if ((any || p.indexOf(UPLOAD_DIR) === 0) && removed.indexOf(p) < 0) removed.push(p);
	}

	function pickFiles(multiple, fn) {
		var el = h('input', { type: 'file', accept: 'image/*', multiple: multiple, hidden: true });
		el.addEventListener('change', function () {
			var files = Array.prototype.filter.call(el.files, function (f) { return /^image\//.test(f.type); });
			el.remove();
			if (!files.length) { toast('이미지 파일만 올릴 수 있습니다.', true); return; }
			fn(files);
		});
		document.body.appendChild(el);
		el.click();
	}

	function runImages(files, each) {
		toast(files.length + '장 변환 중…');
		var chain = Promise.resolve();
		files.forEach(function (f) { chain = chain.then(function () { return each(f); }); });
		return chain.then(function () { changed(); rerender(); toast('추가했습니다. 저장해야 사이트에 반영됩니다.'); })
			.catch(function (e) { toast(e.message, true); rerender(); });
	}

	// 사진 1장 칸 (선택/교체/빼기)
	function imageBox(cur, o) {
		var has = cur && cur.src;
		return h('div', { class: 'cms-imgbox' },
			h('div', { class: 'cms-thumb' }, has ? h('img', { src: imgUrl(cur.src), alt: '' }) : h('span', { text: '사진 없음' })),
			h('div', { class: 'cms-imgbox-btns' },
				btn(has ? '사진 교체' : '사진 선택', function () {
					pickFiles(false, function (files) {
						runImages(files, function (f) {
							return addImage(f, o.maxW, o.dir).then(function (n) {
								if (has) dropImage(cur.src);
								o.set(n);
							});
						});
					});
				}, 'cms-btn-ghost cms-btn-sm'),
				o.removable && has ? btn('사진 빼기', function () { dropImage(cur.src); o.set(null); changed(); rerender(); }, 'cms-btn-ghost cms-btn-sm') : null,
				o.hint ? h('small', { class: 'cms-hint', text: o.hint }) : null));
	}

	// 프로그램 페이지용 이미지 객체 (picture 태그 형식)
	function progImage(n, alt) {
		return { src: n.src, srcset: '', sizes: '', width: n.width, height: n.height, alt: alt || '' };
	}

	/* ── 화면: 프로그램 ─────────────────────── */

	function viewPrograms() {
		var P = D.programs, s = ui.prog;
		var tabs = h('div', { class: 'cms-tabs' }, [['activities', '활동 프로그램 표'], ['areas', '4가지 영역'], ['posters', '포스터']].map(function (t) {
			return h('button', { type: 'button', class: 'cms-tab' + (s.tab === t[0] ? ' is-on' : ''), text: t[1],
				onclick: function () { s.tab = t[0]; s.open = -1; rerender(); } });
		}));
		var body;
		if (s.tab === 'areas') body = progAreas(P.areas);
		else if (s.tab === 'posters') body = progPosters(P.posters);
		else body = progActivities(P.activities);
		return [tabs, body];
	}

	function progActivities(list) {
		var s = ui.prog;
		return h('section', { class: 'cms-card' },
			h('div', { class: 'cms-card-head' },
				h('h2', { text: '활동 프로그램 ' + list.length + '개' }),
				btn('+ 활동 추가', function () {
					list.push({ target: '', name: '새 활동', desc: '', image: null });
					s.open = list.length - 1; changed(); rerender();
				}, 'cms-btn-fill cms-btn-sm')),
			h('p', { class: 'cms-desc', text: '번호는 순서대로 자동으로 매겨지고, 활동 수는 사이트의 「' + list.length + '가지 활동」 문구에 자동 반영됩니다.' }),
			h('ul', { class: 'cms-list' }, list.map(function (a, i) {
				var open = s.open === i;
				return h('li', { class: 'cms-item' + (open ? ' is-open' : '') },
					h('div', { class: 'cms-item-row' },
						h('span', { class: 'cms-item-no', text: i + 1 }),
						h('div', { class: 'cms-item-thumb' }, a.image ? h('img', { src: imgUrl(a.image.src), alt: '', loading: 'lazy' }) : null),
						h('div', { class: 'cms-item-body' },
							h('strong', { text: oneLine(a.name) || '(이름 없음)' }),
							h('small', { text: oneLine(a.target) })),
						h('div', { class: 'cms-item-acts' },
							moveBtns(list, i),
							iconBtn(open ? '닫기' : '수정', open ? '닫기' : '수정', false, function () { s.open = open ? -1 : i; rerender(); }),
							iconBtn('✕', '삭제', false, function () {
								if (!confirm('「' + oneLine(a.name) + '」 활동을 삭제할까요?')) return;
								if (a.image) dropImage(a.image.src);
								list.splice(i, 1); s.open = -1; changed(); rerender();
							}, true))),
					open ? h('div', { class: 'cms-editor' },
						field('활동명', input(a, 'name', { rows: 2 }), '줄을 바꾸면 사이트에서도 줄이 바뀝니다.'),
						field('추천 대상', input(a, 'target', { rows: 3, ph: '예) 초등 저·고학년\n(1~6학년)' })),
						field('활동 내용', input(a, 'desc', { rows: 4 })),
						field('활동 사진', imageBox(a.image, {
							maxW: 640, dir: 'programs', removable: true,
							set: function (n) { a.image = n ? progImage(n, oneLine(a.name) + ' 활동') : null; }
						})),
						a.image ? field('사진 설명', input(a.image, 'alt'), '화면에는 안 보이고, 시각장애인 안내와 검색에 쓰입니다.') : null
					) : null);
			})));
	}

	function progAreas(list) {
		return list.map(function (a) {
			var items = h('textarea', {
				rows: 6, value: a.items.join('\n'),
				oninput: function () { a.items = items.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); changed(); }
			});
			return h('section', { class: 'cms-card' },
				h('h2', { text: a.title + ' (' + a.en + ')' }),
				h('div', { class: 'cms-grid2' },
					field('영역 이름', input(a, 'title')),
					field('영문 표기', input(a, 'en'))),
				field('한 줄 설명', input(a, 'desc')),
				field('포함 프로그램', items, '한 줄에 하나씩 적습니다.'),
				field('대표 사진', imageBox(a.image, {
					maxW: 1400, dir: 'programs',
					set: function (n) { a.image = progImage(n, a.image && a.image.alt); }
				})),
				field('사진 설명', input(a.image, 'alt')));
		});
	}

	function progPosters(list) {
		return h('section', { class: 'cms-card' },
			h('div', { class: 'cms-card-head' },
				h('h2', { text: '포스터 ' + list.length + '장' }),
				btn('+ 포스터 추가', function () {
					pickFiles(true, function (files) {
						runImages(files, function (f) {
							return addImage(f, 900, 'posters').then(function (n) {
								list.push({ caption: '', image: progImage(n, '') });
							});
						});
					});
				}, 'cms-btn-fill cms-btn-sm')),
			h('p', { class: 'cms-desc', text: '포스터를 누르면 사이트에서 크게 볼 수 있습니다. 세로 포스터를 권장합니다.' }),
			h('ul', { class: 'cms-list' }, list.map(function (p, i) {
				return h('li', { class: 'cms-item' },
					h('div', { class: 'cms-item-row' },
						h('span', { class: 'cms-item-no', text: i + 1 }),
						h('div', { class: 'cms-item-thumb is-tall' }, h('img', { src: imgUrl(p.image.src), alt: '', loading: 'lazy' })),
						h('div', { class: 'cms-item-body' },
							field('제목', input(p, 'caption', { ph: '포스터 아래에 표시되는 제목' })),
							field('이미지 설명', input(p.image, 'alt', { ph: '예) 마을을 지켜라 포스터' }))),
						h('div', { class: 'cms-item-acts' },
							moveBtns(list, i),
							iconBtn('✕', '삭제', false, function () {
								if (!confirm((i + 1) + '번째 포스터를 삭제할까요?')) return;
								dropImage(p.image.src);
								list.splice(i, 1); changed(); rerender();
							}, true))));
			})));
	}

	/* ── 화면: 공지·소식 ─────────────────────── */

	function sortedNews() {
		return D.news.slice().sort(function (a, b) {
			if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
			return a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id;
		});
	}

	function viewNews() {
		var s = ui.news;
		var cur = s.edit != null && D.news.filter(function (n) { return n.id === s.edit; })[0];
		if (cur) return newsEditor(cur);
		s.edit = null;

		return h('section', { class: 'cms-card' },
			h('div', { class: 'cms-card-head' },
				h('h2', { text: '글 ' + D.news.length + '개' }),
				btn('+ 새 글', function () {
					var id = D.news.reduce(function (m, n) { return Math.max(m, n.id); }, 0) + 1;
					D.news.push({ id: id, category: '소식', title: '', date: today(), pinned: false, body: '', images: [] });
					s.edit = id; changed(); rerender();
				}, 'cms-btn-fill cms-btn-sm')),
			D.news.length ? h('ul', { class: 'cms-rows' }, sortedNews().map(function (n) {
				return h('li', null,
					h('span', { class: 'cms-badge' + (n.category === '공지' ? ' is-dark' : ''), text: n.category }),
					n.pinned ? h('span', { class: 'cms-badge is-red', text: '고정' }) : null,
					h('button', { type: 'button', class: 'cms-rows-tit', text: n.title || '(제목 없음)', onclick: function () { s.edit = n.id; rerender(); } }),
					h('time', { text: n.date }),
					btn('수정', function () { s.edit = n.id; rerender(); }, 'cms-btn-ghost cms-btn-sm'));
			})) : h('p', { class: 'cms-empty', text: '아직 글이 없습니다. 「+ 새 글」로 첫 글을 올려 보세요.' }));
	}

	function newsEditor(n) {
		var s = ui.news;
		var saved = JSON.parse(orig.news).some(function (x) { return x.id === n.id; });
		return h('section', { class: 'cms-card' },
			h('div', { class: 'cms-card-head' },
				btn('← 목록으로', function () { s.edit = null; rerender(); }, 'cms-btn-ghost cms-btn-sm'),
				saved ? h('a', { class: 'cms-link', href: 'news.html?id=' + n.id, target: '_blank', rel: 'noopener', text: '사이트에서 보기 ↗' }) : null),
			h('div', { class: 'cms-grid3' },
				field('분류', select(n, 'category', ['공지', '소식'])),
				field('날짜', input(n, 'date', { type: 'date' })),
				h('div', { class: 'cms-field' }, h('span', { class: 'cms-field-l', text: '목록 위에 고정' }), checkbox(n, 'pinned', '고정하기'))),
			field('제목', input(n, 'title', { max: 120 })),
			field('본문', input(n, 'body', { rows: 14 }), '빈 줄을 넣으면 문단이 나뉩니다. https:// 로 시작하는 주소는 자동으로 링크가 됩니다.'),
			h('div', { class: 'cms-field' },
				h('span', { class: 'cms-field-l', text: '사진 (본문 위에 순서대로 표시)' }),
				h('ul', { class: 'cms-list' }, n.images.map(function (im, i) {
					return h('li', { class: 'cms-item' }, h('div', { class: 'cms-item-row' },
						h('div', { class: 'cms-item-thumb' }, h('img', { src: imgUrl(im.src), alt: '' })),
						h('div', { class: 'cms-item-body' }, input(im, 'alt', { ph: '사진 설명 (시각장애인 안내용)' })),
						h('div', { class: 'cms-item-acts' }, moveBtns(n.images, i),
							iconBtn('✕', '사진 삭제', false, function () { dropImage(im.src); n.images.splice(i, 1); changed(); rerender(); }, true))));
				})),
				btn('+ 사진 추가', function () {
					pickFiles(true, function (files) {
						runImages(files, function (f) {
							return addImage(f, 1440, 'news').then(function (r) {
								n.images.push({ src: r.src, width: r.width, height: r.height, alt: '' });
							});
						});
					});
				}, 'cms-btn-ghost cms-btn-sm')),
			h('div', { class: 'cms-danger' },
				btn('이 글 삭제', function () {
					if (!confirm('「' + (n.title || '제목 없음') + '」 글을 삭제할까요?')) return;
					n.images.forEach(function (im) { dropImage(im.src); });
					D.news.splice(D.news.indexOf(n), 1);
					s.edit = null; changed(); rerender();
				}, 'cms-btn-danger cms-btn-sm')));
	}

	/* ── 화면: 팝업 ───────────────────────── */

	function popupStatus(p) {
		var t = today();
		if (!p.enabled) return ['꺼짐', ''];
		if (p.start && t < p.start) return ['예정', ''];
		if (p.end && t > p.end) return ['종료', ''];
		return ['노출 중', ' is-on'];
	}

	function viewPopups() {
		var s = ui.popups;
		var cur = s.edit != null && D.popups.filter(function (p) { return p.id === s.edit; })[0];
		if (cur) return popupEditor(cur);
		s.edit = null;

		return h('section', { class: 'cms-card' },
			h('div', { class: 'cms-card-head' },
				h('h2', { text: '팝업 ' + D.popups.length + '개' }),
				btn('+ 새 팝업', function () {
					var id = D.popups.reduce(function (m, p) { return Math.max(m, p.id); }, 0) + 1;
					D.popups.unshift({ id: id, enabled: true, title: '', start: today(), end: '', body: '', image: null, link: '', linkText: '' });
					s.edit = id; changed(); rerender();
				}, 'cms-btn-fill cms-btn-sm')),
			D.popups.length ? h('ul', { class: 'cms-rows' }, D.popups.map(function (p, i) {
				var st = popupStatus(p);
				return h('li', null,
					h('span', { class: 'cms-badge' + st[1], text: st[0] }),
					h('button', { type: 'button', class: 'cms-rows-tit', text: p.title || '(제목 없음)', onclick: function () { s.edit = p.id; rerender(); } }),
					h('time', { text: (p.start || '시작 제한 없음') + ' ~ ' + (p.end || '종료 제한 없음') }),
					moveBtns(D.popups, i),
					btn('수정', function () { s.edit = p.id; rerender(); }, 'cms-btn-ghost cms-btn-sm'));
			})) : h('p', { class: 'cms-empty', text: '등록된 팝업이 없습니다.' }),
			h('p', { class: 'cms-hint', text: '여러 개가 동시에 노출되면 위 순서대로 나란히 뜹니다. (모바일은 한 장씩)' }));
	}

	function popupEditor(p) {
		var s = ui.popups;
		return h('section', { class: 'cms-card' },
			h('div', { class: 'cms-card-head' },
				btn('← 목록으로', function () { s.edit = null; rerender(); }, 'cms-btn-ghost cms-btn-sm'),
				h('span', { class: 'cms-badge' + popupStatus(p)[1], text: popupStatus(p)[0] })),
			checkbox(p, 'enabled', '사용 (끄면 기간과 상관없이 안 보입니다)'),
			field('제목', input(p, 'title', { max: 60 }), '이미지만 있는 팝업이면 화면에는 안 보이고 이미지 설명으로 쓰입니다.'),
			h('div', { class: 'cms-grid2' },
				field('시작일', input(p, 'start', { type: 'date' }), '비우면 바로 시작'),
				field('종료일', input(p, 'end', { type: 'date' }), '비우면 끌 때까지 계속')),
			field('이미지', imageBox(p.image, {
				maxW: 800, dir: 'popups', removable: true, hint: '가로 400px 크기로 보입니다. 포스터·안내 이미지를 권장합니다.',
				set: function (n) { p.image = n; }
			})),
			field('내용', input(p, 'body', { rows: 4 }), '이미지 아래에 표시됩니다. 이미지가 있으면 비워도 됩니다.'),
			h('div', { class: 'cms-grid2' },
				field('링크 주소', input(p, 'link', { ph: '예) news.html?id=3  또는  https://...' }), '누르면 이동할 곳 (비우면 링크 없음)'),
				field('버튼 문구', input(p, 'linkText', { ph: '자세히 보기' }), '이미지가 없을 때만 버튼으로 보입니다.')),
			h('div', { class: 'cms-danger' },
				btn('이 팝업 삭제', function () {
					if (!confirm('「' + (p.title || '제목 없음') + '」 팝업을 삭제할까요?')) return;
					if (p.image) dropImage(p.image.src);
					D.popups.splice(D.popups.indexOf(p), 1);
					s.edit = null; changed(); rerender();
				}, 'cms-btn-danger cms-btn-sm')));
	}

	/* ── 화면: 대회 사진 (슬라이드쇼) ───────────── */

	function nextPhotoName(key) {
		var dir = 'images/' + key + '-photos/';
		var used = {};
		D.photos[key].photos.forEach(function (p) { used[p.src] = 1; });
		Object.keys(newBlobs).forEach(function (p) { used[p] = 1; });
		removed.forEach(function (p) { used[p] = 1; });
		var n = 1;
		while (used[dir + key + '-' + pad(n) + '.webp']) n++;
		return dir + key + '-' + pad(n) + '.webp';
	}

	function viewPhotos() {
		var keys = Object.keys(D.photos);
		if (!keys.length) return h('p', { class: 'cms-empty', text: '앨범이 없습니다.' });
		var s = ui.photos;
		if (keys.indexOf(s.key) < 0) s.key = keys[0];
		var al = D.photos[s.key];

		var drop = h('label', { class: 'cms-drop' },
			h('span', { class: 'cms-drop-ico', text: '＋' }),
			h('span', { class: 'cms-drop-tit', text: '사진 추가' }),
			h('span', { class: 'cms-drop-sub', text: '클릭하거나 파일을 끌어다 놓으세요 · 여러 장 가능' }));
		function addPhotos(files) {
			runImages(files, function (f) {
				return addImage(f, 1440, nextPhotoName(s.key)).then(function (r) { al.photos.push({ src: r.src, caption: '' }); });
			});
		}
		drop.addEventListener('click', function (e) { e.preventDefault(); pickFiles(true, addPhotos); });
		['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
		['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
		drop.addEventListener('drop', function (e) {
			var files = Array.prototype.filter.call(e.dataTransfer.files, function (f) { return /^image\//.test(f.type); });
			if (files.length) addPhotos(files);
		});

		return [
			h('div', { class: 'cms-tabs' }, keys.map(function (k) {
				return h('button', { type: 'button', class: 'cms-tab' + (k === s.key ? ' is-on' : ''),
					text: D.photos[k].title + ' (' + D.photos[k].photos.length + ')', onclick: function () { s.key = k; rerender(); } });
			})),
			h('section', { class: 'cms-card' },
				h('div', { class: 'cms-card-head' }, h('h2', { text: al.title }), h('span', { class: 'cms-count', text: '사진 ' + al.photos.length + '장' })),
				drop,
				h('ul', { class: 'cms-list' }, al.photos.map(function (p, i) {
					return h('li', { class: 'cms-item' + (newBlobs[p.src] ? ' is-new' : '') }, h('div', { class: 'cms-item-row' },
						h('span', { class: 'cms-item-no', text: i + 1 }),
						h('div', { class: 'cms-item-thumb' }, h('img', { src: imgUrl(p.src), alt: '', loading: 'lazy' })),
						h('div', { class: 'cms-item-body' },
							input(p, 'caption', { rows: 2, ph: '사진 설명을 적어주세요 (화면에 표시되고, 시각장애인 안내에도 쓰입니다)' })),
						h('div', { class: 'cms-item-acts' }, moveBtns(al.photos, i),
							iconBtn('✕', '삭제', false, function () {
								if (!confirm((i + 1) + '번째 사진을 삭제할까요?\n\n' + (p.caption || p.src))) return;
								dropImage(p.src, true);
								al.photos.splice(i, 1); changed(); rerender();
							}, true))));
				})))
		];
	}

	/* ── 화면: 설정 ───────────────────────── */

	function viewSettings() {
		var S = D.site;
		return [
			h('section', { class: 'cms-card' },
				h('h2', { text: '온라인 상담 신청' }),
				h('p', { class: 'cms-desc', text: '상담 문의 페이지의 신청 폼은 아래 「접수 주소」가 있을 때만 보입니다. 접수된 문의는 구글 시트에 쌓이고, 알림 메일이 갑니다.' }),
				field('접수 주소 (Google Apps Script 웹 앱 URL)', input(S, 'inquiryEndpoint', { type: 'url', ph: 'https://script.google.com/macros/s/.../exec' }),
					'비우면 신청 폼이 숨겨지고 전화·카카오톡 안내만 보입니다.'),
				field('문의 시트 주소', input(S, 'inquirySheetUrl', { type: 'url', ph: 'https://docs.google.com/spreadsheets/d/...' }), '관리자 편의용 바로가기입니다. 사이트에는 노출되지 않습니다.'),
				S.inquirySheetUrl ? h('p', null, h('a', { class: 'cms-btn cms-btn-ghost cms-btn-sm', href: S.inquirySheetUrl, target: '_blank', rel: 'noopener', text: '접수된 문의 보기 ↗' })) : null,
				h('details', { class: 'cms-help' },
					h('summary', { text: '접수 주소 만드는 방법 (처음 한 번만)' }),
					h('ol', null,
						h('li', { text: '구글 드라이브에서 새 스프레드시트를 만듭니다. (예: AI 연구소 상담 문의)' }),
						h('li', { text: '메뉴 「확장 프로그램 → Apps Script」를 엽니다.' }),
						h('li', { text: '저장소의 tools/inquiry-apps-script.gs 내용을 전부 붙여넣고, 맨 위 NOTIFY_EMAIL 을 알림 받을 메일로 바꿔 저장합니다.' }),
						h('li', { text: '「배포 → 새 배포 → 유형: 웹 앱」, 실행 사용자 「나」, 액세스 권한 「모든 사용자」로 배포합니다. (권한 승인 창이 뜨면 허용)' }),
						h('li', { text: '나온 웹 앱 URL(…/exec)을 위 「접수 주소」에, 스프레드시트 주소를 「문의 시트 주소」에 붙여넣고 저장합니다.' }))))
		];
	}

	/* ── 화면: 대시보드 ───────────────────────── */

	function fmtTime(iso) {
		var d = new Date(iso);
		return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
	}

	function loadHistory(force) {
		if (commitLog && !force) return Promise.resolve(commitLog);
		return api('/commits?sha=' + BRANCH + '&path=data&per_page=30').then(function (list) {
			commitLog = list.map(function (c) {
				return { sha: c.sha, msg: c.commit.message.split('\n')[0], date: c.commit.author.date, who: (c.author && c.author.login) || c.commit.author.name };
			});
			return commitLog;
		});
	}

	function stat(label, value, sub, target) {
		return h('button', { type: 'button', class: 'cms-stat', onclick: function () { location.hash = target; } },
			h('span', { class: 'cms-stat-l', text: label }),
			h('strong', { text: String(value) }),
			h('small', { text: sub }));
	}

	function historyRows(list, limit) {
		return h('ul', { class: 'cms-rows' }, list.slice(0, limit).map(function (c) {
			return h('li', null,
				h('time', { text: fmtTime(c.date) }),
				h('span', { class: 'cms-rows-tit', text: c.msg }),
				h('span', { class: 'cms-badge', text: c.who }));
		}));
	}

	function viewDashboard() {
		var P = D.programs;
		var live = D.popups.filter(function (p) { return popupStatus(p)[0] === '노출 중'; }).length;
		var photoCount = Object.keys(D.photos).reduce(function (n, k) { return n + D.photos[k].photos.length; }, 0);
		var connected = !!D.site.inquiryEndpoint.trim();
		var recent = h('div', null, h('p', { class: 'cms-empty', text: '불러오는 중…' }));
		loadHistory().then(function (list) {
			recent.innerHTML = '';
			append(recent, list.length ? historyRows(list, 5) : h('p', { class: 'cms-empty', text: '아직 변경 기록이 없습니다.' }));
		}).catch(function () { recent.innerHTML = ''; append(recent, h('p', { class: 'cms-empty', text: '변경 이력을 불러오지 못했습니다.' })); });

		return [
			h('div', { class: 'cms-stats' },
				stat('활동 프로그램', P.activities.length, '영역 ' + P.areas.length + ' · 포스터 ' + P.posters.length, 'programs'),
				stat('공지·소식', D.news.length, '고정 ' + D.news.filter(function (n) { return n.pinned; }).length + '개', 'news'),
				stat('노출 중 팝업', live, '전체 ' + D.popups.length + '개', 'popups'),
				stat('대회 사진', photoCount, '앨범 ' + Object.keys(D.photos).length + '개', 'photos')),
			h('div', { class: 'cms-grid2' },
				h('section', { class: 'cms-card' },
					h('h2', { text: '온라인 상담 신청' }),
					h('p', null, h('span', { class: 'cms-badge' + (connected ? ' is-on' : ''), text: connected ? '연결됨' : '연결 안 됨' })),
					h('p', { class: 'cms-desc', text: connected ? '상담 문의 페이지에 신청 폼이 보이고, 접수 내용은 구글 시트에 쌓입니다.' : '설정에서 접수 주소를 넣으면 상담 문의 페이지에 신청 폼이 나타납니다.' }),
					connected && D.site.inquirySheetUrl
						? h('p', null, h('a', { class: 'cms-btn cms-btn-ghost cms-btn-sm', href: D.site.inquirySheetUrl, target: '_blank', rel: 'noopener', text: '접수된 문의 보기 ↗' }))
						: btn('설정으로 가기', function () { location.hash = 'settings'; }, 'cms-btn-ghost cms-btn-sm')),
				h('section', { class: 'cms-card' },
					h('h2', { text: '사이트 반영' }),
					h('p', { class: 'cms-desc', text: '저장하면 GitHub Pages 에 1~2분 안에 반영되고, 본사 사이트(ai.foxconnect.kr)는 캐시 때문에 최대 10분 걸립니다. 반영 여부는 왼쪽 아래에서 자동으로 확인됩니다.' }),
					h('p', null,
						h('a', { class: 'cms-btn cms-btn-ghost cms-btn-sm', href: PAGES, target: '_blank', rel: 'noopener', text: 'GitHub Pages ↗' }), ' ',
						h('a', { class: 'cms-btn cms-btn-ghost cms-btn-sm', href: 'https://ai.foxconnect.kr/', target: '_blank', rel: 'noopener', text: 'ai.foxconnect.kr ↗' })))),
			h('section', { class: 'cms-card' },
				h('div', { class: 'cms-card-head' }, h('h2', { text: '최근 변경' }), btn('전체 이력 →', function () { location.hash = 'history'; }, 'cms-btn-ghost cms-btn-sm')),
				recent)
		];
	}

	/* ── 화면: 변경 이력 · 되돌리기 ─────────────── */

	function viewHistory() {
		var box = h('div', null, h('p', { class: 'cms-empty', text: '불러오는 중…' }));
		loadHistory(true).then(function (list) {
			box.innerHTML = '';
			if (!list.length) { append(box, h('p', { class: 'cms-empty', text: '아직 변경 기록이 없습니다.' })); return; }
			append(box, h('ul', { class: 'cms-rows' }, list.map(function (c, i) {
				return h('li', null,
					h('time', { text: fmtTime(c.date) }),
					h('span', { class: 'cms-rows-tit', text: c.msg }),
					h('span', { class: 'cms-badge', text: c.who }),
					i === 0 ? h('span', { class: 'cms-badge is-on', text: '현재' })
						: btn('이 시점으로 되돌리기', function () { restoreAt(c); }, 'cms-btn-ghost cms-btn-sm'));
			})));
		}).catch(function (e) { box.innerHTML = ''; append(box, h('p', { class: 'cms-empty', text: '불러오지 못했습니다 — ' + e.message })); });
		return [
			h('section', { class: 'cms-card' },
				h('p', { class: 'cms-desc', text: '「이 시점으로 되돌리기」는 그 저장 직후의 내용을 편집 화면으로 불러옵니다. 바로 저장되지 않으니, 확인한 뒤 아래 「저장하고 사이트에 반영」을 누르세요. 그 뒤에 지워진 사진도 함께 되살립니다.' }),
				box)
		];
	}

	function getFileAt(path, ref) {
		return api('/contents/' + path + '?ref=' + ref).catch(function (e) {
			if (e.status === 404) return null;
			throw e;
		});
	}

	function restoreAt(c) {
		if (isDirty() && !confirm('저장하지 않은 변경이 있습니다. 버리고 ' + fmtTime(c.date) + ' 시점 내용을 불러올까요?')) return;
		toast(fmtTime(c.date) + ' 시점 내용을 불러오는 중…');
		var next = {};
		Promise.all(Object.keys(FILES).map(function (k) {
			return getFileAt(FILES[k].path, c.sha).then(function (f) { next[k] = f ? JSON.parse(base64ToUtf8(f.content)) : JSON.parse(orig[k]); });
		})).then(function () {
			// 그 시점에 쓰던 업로드 사진 중 지금 저장소에 없는 것은 그 시점 파일을 가져와 새 사진으로 다시 올린다
			var refs = (JSON.stringify(next).match(/"images\/u\/[^"]+"/g) || []).map(function (s) { return s.slice(1, -1); });
			refs = refs.filter(function (p, i) { return refs.indexOf(p) === i; });
			return Promise.all(refs.map(function (p) {
				return getFile(p).then(function (now) {
					if (now) return null;
					return getFileAt(p, c.sha).then(function (old) { if (old) newBlobs[p] = old.content.replace(/\n/g, ''); });
				});
			}));
		}).then(function () {
			Object.keys(FILES).forEach(function (k) { D[k] = next[k]; });
			removed = [];
			ui.prog.open = -1; ui.news.edit = null; ui.popups.edit = null;
			rerender();
			toast('불러왔습니다. 확인한 뒤 「저장하고 사이트에 반영」을 누르세요.');
		}).catch(function (e) { toast('불러오기 실패 — ' + e.message, true); });
	}

	/* ── 사이트 반영 확인 ─────────────────────── */

	var deployTimer = null;

	function deployState(state, text) {
		var el = $('deployState');
		el.setAttribute('data-state', state);
		el.querySelector('span').textContent = text;
	}

	// 저장한 내용이 GitHub Pages 의 data/*.json 과 같아질 때까지 10초마다 확인 (최대 6분)
	function watchDeploy(keys) {
		var expect = {};
		keys.forEach(function (k) { expect[k] = JSON.stringify(D[k]); });
		var started = Date.now();
		clearTimeout(deployTimer);
		deployState('pending', '사이트에 반영하는 중…');
		(function check() {
			Promise.all(keys.map(function (k) {
				return fetch(PAGES + FILES[k].path + '?t=' + Date.now(), { cache: 'no-store' })
					.then(function (r) { return r.ok ? r.json() : null; })
					.then(function (j) { return j !== null && JSON.stringify(j) === expect[k]; })
					.catch(function () { return false; });
			})).then(function (ok) {
				if (ok.every(Boolean)) {
					var d = new Date();
					deployState('done', '반영 완료 · ' + pad(d.getHours()) + ':' + pad(d.getMinutes()));
					toast('사이트에 반영되었습니다. (본사 사이트는 최대 10분)');
					commitLog = null;
					if (view === 'dashboard' || view === 'history') rerender();
				} else if (Date.now() - started > 6 * 60 * 1000) {
					deployState('late', '반영 확인 지연 — 잠시 후 사이트를 확인하세요');
				} else {
					deployTimer = setTimeout(check, 10000);
				}
			});
		})();
	}

	/* ── 렌더 ─────────────────────────────── */

	var RENDER = { dashboard: viewDashboard, history: viewHistory, programs: viewPrograms, news: viewNews, popups: viewPopups, photos: viewPhotos, settings: viewSettings };

	function rerender() {
		var y = window.scrollY;
		var box = $('view');
		box.innerHTML = '';
		append(box, RENDER[view]());
		$('viewTitle').textContent = VIEWS[view][0];
		$('viewDesc').textContent = VIEWS[view][1];
		$('viewCrumb').textContent = 'FOX CMS / ' + (VIEWS[view][2] || '콘텐츠');
		Array.prototype.forEach.call($('nav').querySelectorAll('a'), function (a) {
			a.classList.toggle('is-on', a.getAttribute('data-view') === view);
		});
		window.scrollTo(0, y);
		updateSaveBar();
	}

	function go(v) {
		if (!RENDER[v]) v = 'dashboard';
		if (v !== view) window.scrollTo(0, 0);
		view = v;
		rerender();
	}

	/* ── 변경 상태 ─────────────────────────── */

	function dirtyKeys() {
		return Object.keys(FILES).filter(function (k) { return JSON.stringify(D[k]) !== orig[k]; });
	}
	function isDirty() { return dirtyKeys().length > 0 || Object.keys(newBlobs).length > 0 || removed.length > 0; }

	function changed() { updateSaveBar(); }

	function updateSaveBar() {
		var bar = $('saveBar');
		if (!isDirty()) { bar.hidden = true; return; }
		var parts = dirtyKeys().map(function (k) { return FILES[k].label; });
		var added = Object.keys(newBlobs).length;
		if (added) parts.push('사진 ' + added + '장 추가');
		if (removed.length) parts.push('사진 ' + removed.length + '장 삭제');
		$('saveInfo').textContent = '저장 안 된 변경 — ' + parts.join(' · ');
		bar.hidden = false;
	}

	/* ── 저장 (단일 커밋) ───────────────────── */

	function problems() {
		var out = [];
		D.programs.activities.forEach(function (a, i) { if (!a.name.trim()) out.push('프로그램 ' + (i + 1) + '번 활동명이 비어 있습니다.'); });
		D.news.forEach(function (n) {
			if (!n.title.trim()) out.push('공지·소식: 제목이 비어 있는 글이 있습니다.');
			if (!n.date) out.push('공지·소식 「' + n.title + '」 날짜가 비어 있습니다.');
		});
		D.popups.forEach(function (p) {
			if (!p.title.trim()) out.push('팝업: 제목이 비어 있는 팝업이 있습니다.');
			if (p.start && p.end && p.start > p.end) out.push('팝업 「' + p.title + '」 종료일이 시작일보다 빠릅니다.');
			if (!p.image && !p.body.trim()) out.push('팝업 「' + p.title + '」 이미지나 내용 중 하나는 있어야 합니다.');
		});
		var ep = D.site.inquiryEndpoint.trim();
		if (ep && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(ep)) out.push('설정: 접수 주소는 https://script.google.com/macros/s/…/exec 형식이어야 합니다.');
		return out;
	}

	function getFile(path) {
		return api('/contents/' + path + '?ref=' + BRANCH).catch(function (e) {
			if (e.status === 404) return null;
			throw e;
		});
	}

	function save() {
		var bad = problems();
		if (bad.length) { alert('저장하기 전에 확인해 주세요.\n\n· ' + bad.join('\n· ')); return; }
		var empty = [];
		Object.keys(D.photos).forEach(function (k) {
			D.photos[k].photos.forEach(function (p, i) { if (!p.caption.trim()) empty.push(D.photos[k].title + ' ' + (i + 1) + '번째'); });
		});
		if (empty.length && !confirm('설명이 비어 있는 대회 사진이 있습니다.\n\n' + empty.slice(0, 5).join('\n') +
			(empty.length > 5 ? '\n…외 ' + (empty.length - 5) + '장' : '') + '\n\n그래도 저장할까요?')) return;

		var b = $('btnSave');
		b.disabled = true;
		toast('저장 중…');

		var keys = dirtyKeys();
		var all = JSON.stringify(D);
		// 다른 곳에서 아직 쓰는 이미지는 지우지 않고, 쓰지 않게 된 새 이미지는 올리지 않는다
		var del = removed.filter(function (p) { return all.indexOf('"' + p + '"') < 0; });
		var blobs = Object.keys(newBlobs).filter(function (p) { return all.indexOf('"' + p + '"') >= 0; });
		var headSha;

		Promise.all(keys.map(function (k) {
			return getFile(FILES[k].path).then(function (f) {
				if ((f ? f.sha : null) !== sha[k]) {
					throw new Error('「' + FILES[k].label + '」이(가) 다른 곳에서 먼저 수정되었습니다. 지금 변경 내용을 따로 적어 두고 새로고침한 뒤 다시 해 주세요.');
				}
			});
		}))
			.then(function () { return api('/git/ref/heads/' + BRANCH); })
			.then(function (ref) { headSha = ref.object.sha; return api('/git/commits/' + headSha); })
			.then(function (c) {
				return Promise.all(blobs.map(function (p) {
					return api('/git/blobs', { method: 'POST', body: { content: newBlobs[p], encoding: 'base64' } })
						.then(function (r) { return { path: p, mode: '100644', type: 'blob', sha: r.sha }; });
				})).then(function (tree) {
					keys.forEach(function (k) {
						tree.push({ path: FILES[k].path, mode: '100644', type: 'blob', content: JSON.stringify(D[k], null, '\t') + '\n' });
					});
					del.forEach(function (p) { tree.push({ path: p, mode: '100644', type: 'blob', sha: null }); });
					return api('/git/trees', { method: 'POST', body: { base_tree: c.tree.sha, tree: tree } });
				});
			})
			.then(function (t) {
				var bits = keys.map(function (k) { return FILES[k].label; });
				if (blobs.length) bits.push('사진 ' + blobs.length + '장 추가');
				if (del.length) bits.push('사진 ' + del.length + '장 삭제');
				return api('/git/commits', { method: 'POST', body: { message: '관리자: ' + bits.join(', ') + ' 수정', tree: t.sha, parents: [headSha] } });
			})
			.then(function (c) { return api('/git/refs/heads/' + BRANCH, { method: 'PATCH', body: { sha: c.sha } }); })
			.then(function () { return Promise.all(keys.map(function (k) { return getFile(FILES[k].path).then(function (f) { sha[k] = f ? f.sha : null; }); })); })
			.then(function () {
				keys.forEach(function (k) { orig[k] = JSON.stringify(D[k]); });
				newBlobs = {};
				removed = [];
				rerender();
				commitLog = null;
				toast('저장했습니다. 사이트 반영을 확인하는 중입니다…');
				watchDeploy(keys);
			})
			.catch(function (e) { toast('저장 실패 — ' + e.message, true); })
			.then(function () { b.disabled = false; });
	}

	/* ── 불러오기 · 로그인 ───────────────────── */

	function loadAll() {
		return Promise.all(Object.keys(FILES).map(function (k) {
			return getFile(FILES[k].path).then(function (f) {
				D[k] = f ? JSON.parse(base64ToUtf8(f.content)) : clone(FILES[k].empty);
				sha[k] = f ? f.sha : null;
				orig[k] = JSON.stringify(D[k]);
			});
		}));
	}

	function login(t) {
		token = t;
		var m = $('loginMsg');
		m.className = 'cms-msg';
		m.textContent = '확인 중…';
		return api('').then(function (repo) {
			if (!repo.permissions || !repo.permissions.push) {
				throw new Error('이 저장소에 쓰기 권한이 없는 토큰입니다. Contents 권한을 Read and write로 발급해 주세요.');
			}
			return loadAll();
		}).then(function () {
			try { localStorage.setItem(TOKEN_KEY, token); } catch (e) { /* 저장 불가: 이번만 로그인 */ }
			$('loginView').hidden = true;
			$('appView').hidden = false;
			go(location.hash.slice(1));
			// 로그인한 GitHub 계정 표시 (실패해도 관리 기능과 무관)
			fetch('https://api.github.com/user', { headers: { 'Authorization': 'Bearer ' + token } })
				.then(function (r) { return r.ok ? r.json() : null; })
				.then(function (u) {
					if (!u) return;
					$('userName').textContent = u.login;
					if (u.avatar_url) { $('userAvatar').src = u.avatar_url + '&s=64'; $('userAvatar').hidden = false; }
				}).catch(function () {});
		}).catch(function (e) {
			token = null;
			m.className = 'cms-msg is-err';
			m.textContent = e.status === 401 || e.status === 403
				? '토큰이 올바르지 않거나 만료되었습니다. 다시 발급해 주세요.'
				: e.message;
			throw e;
		});
	}

	/* ── 초기화 ───────────────────────────── */

	$('btnLogin').addEventListener('click', function () {
		var v = $('tokenInput').value.trim();
		if (!v) { $('loginMsg').className = 'cms-msg is-err'; $('loginMsg').textContent = '토큰을 붙여넣어 주세요.'; return; }
		login(v).catch(function () {});
	});
	$('tokenInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('btnLogin').click(); });

	$('btnLogout').addEventListener('click', function () {
		if (isDirty() && !confirm('저장하지 않은 변경이 있습니다. 로그아웃할까요?')) return;
		try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* 무시 */ }
		location.hash = '';
		location.reload();
	});

	window.addEventListener('hashchange', function () { if (token) go(location.hash.slice(1)); });

	$('btnSave').addEventListener('click', save);
	$('btnDiscard').addEventListener('click', function () {
		if (!confirm('저장하지 않은 변경을 모두 되돌릴까요?')) return;
		Object.keys(FILES).forEach(function (k) { D[k] = JSON.parse(orig[k]); });
		newBlobs = {};
		removed = [];
		ui.prog.open = -1; ui.news.edit = null; ui.popups.edit = null;
		rerender();
		toast('되돌렸습니다.');
	});

	window.addEventListener('beforeunload', function (e) {
		if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
	});

	// 저장된 토큰으로 자동 로그인
	var saved = null;
	try { saved = localStorage.getItem(TOKEN_KEY); } catch (e) { /* 무시 */ }
	if (saved) login(saved).catch(function () { try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* 무시 */ } });
})();
