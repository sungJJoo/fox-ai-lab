// 관리자가 수정하는 콘텐츠(JSON)를 GitHub Pages 에서 받아와 화면에 반영하는 공통 모듈
(function () {
	'use strict';

	// 본사 서버(ai.foxconnect.kr)에서는 GitHub Pages 의 최신 데이터를, 그 외(GitHub Pages·로컬)에서는 같은 폴더의 데이터를 쓴다
	var REMOTE = 'https://sungjjoo.github.io/fox-ai-lab/';
	var host = location.hostname;
	var BASE = /github\.io$|^localhost$|^127\.|^\[?::1\]?$|^$/.test(host) ? '' : REMOTE;

	var T = '\t';
	var cache = {};

	function load(name) {
		if (!cache[name]) {
			cache[name] = fetch(BASE + 'data/' + name + '.json', { cache: 'no-cache' }).then(function (r) {
				if (!r.ok) throw new Error(name + ' ' + r.status);
				return r.json();
			});
		}
		return cache[name];
	}

	function url(path) {
		if (!path || /^(https?:)?\/\/|^data:/.test(path)) return path || '';
		return BASE + path;
	}

	function esc(s) {
		return String(s == null ? '' : s)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}

	// 줄바꿈은 <br /> 로
	function text(s) { return esc(s).replace(/\r?\n/g, '<br />'); }

	function indent(n) { return new Array(n + 1).join(T); }

	// srcset 안의 경로들에도 BASE 적용
	function srcset(s, base) {
		return s.split(',').map(function (part) {
			var p = part.trim().split(/\s+/);
			p[0] = base + p[0];
			return p.join(' ');
		}).join(', ');
	}

	function picture(im, base) {
		var src = im.srcset
			? '<source type="image/webp" srcset="' + esc(srcset(im.srcset, base)) + '" sizes="' + esc(im.sizes) + '" />'
			: '';
		return '<picture>' + src +
			'<img src="' + esc(base + im.src) + '" width="' + im.width + '" height="' + im.height +
			'" alt="' + esc(im.alt) + '" loading="lazy" /></picture>';
	}

	/* ── 프로그램 페이지 조각 ───────────────────── */

	// 메인 「Direction」 카드 아이콘: 영역 순서대로 돌려 쓴다
	var DIR_ICONS = [
		'<svg viewBox="0 0 24 24"><path fill="currentColor" opacity=".28" d="M12 2a7 7 0 0 0-4.2 12.6c.5.4.8.9.9 1.4h6.6c.1-.5.4-1 .9-1.4A7 7 0 0 0 12 2z"/><path fill="currentColor" d="M9 18.3h6l-.5 1.4a1.6 1.6 0 0 1-1.5 1h-1a1.6 1.6 0 0 1-1.5-1z"/></svg>',
		'<svg viewBox="0 0 24 24"><path fill="currentColor" opacity=".28" d="M5 4h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4.4 3.3A.6.6 0 0 1 6 18V15a2 2 0 0 1-2-2V6a2 2 0 0 1 1-2z"/><circle fill="currentColor" cx="9" cy="9.5" r="1.4"/><circle fill="currentColor" cx="13" cy="9.5" r="1.4"/><circle fill="currentColor" cx="17" cy="9.5" r="1.4"/></svg>',
		'<svg viewBox="0 0 24 24"><path fill="currentColor" d="M13 1.8L3.9 13.4a.6.6 0 0 0 .5 1H10l-1.1 7.5a.45.45 0 0 0 .8.35L20.1 10.6a.6.6 0 0 0-.5-1H14l1.1-7.5a.45.45 0 0 0-.8-.35z"/></svg>',
		'<svg viewBox="0 0 24 24"><path fill="currentColor" d="M11 2.2l2.1 5.6 5.7 2.1-5.7 2.1L11 17.7l-2.1-5.7L3.2 9.9l5.7-2.1z"/><path fill="currentColor" opacity=".4" d="M18.4 13.2l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"/></svg>'
	];

	var render = {
		// 메인 Direction 카드 (영역 데이터의 짧은 이름 · 메인 한 줄 설명)
		direction: function (list) {
			return list.map(function (a, i) {
				return '<li class="c-' + esc(a.color) + '">' +
					'<span class="dir-no">' + String(i + 1).padStart(2, '0') + '</span>' +
					'<i class="dir-ico" aria-hidden="true">' + DIR_ICONS[i % DIR_ICONS.length] + '</i>' +
					'<h3>' + text(a.short || a.title) + '</h3>' +
					'<p>' + text(a.summary || a.desc) + '</p></li>';
			}).join('');
		},
		// Direction 모바일 캐러셀 점
		directionDots: function (list) {
			return list.map(function (a, i) {
				return '<button type="button"' + (i ? '' : ' class="is-active"') + ' aria-label="' + esc(a.short || a.title) + ' 보기"></button>';
			}).join('');
		},
		areas: function (list, base) {
			var i5 = indent(5), i6 = indent(6), i7 = indent(7), i8 = indent(8);
			return list.map(function (a) {
				return [
					i5 + '<article class="area-card c-' + esc(a.color) + '">',
					a.image && a.image.src ? i6 + '<figure>' + picture(a.image, base) + '</figure>' : '',
					i6 + '<div class="area-cont">',
					i7 + '<h3>' + text(a.title) + '<span class="en">' + text(a.en) + '</span></h3>',
					i7 + '<p>' + text(a.desc) + '</p>',
					i7 + '<ul>',
					a.items.map(function (it) { return i8 + '<li>' + text(it) + '</li>'; }).join('\n'),
					i7 + '</ul>',
					i6 + '</div>',
					i5 + '</article>'
				].join('\n');
			}).join('\n');
		},
		activities: function (list, base) {
			var i7 = indent(7), i8 = indent(8);
			return list.map(function (a, n) {
				return [
					i7 + '<tr>',
					i8 + '<td class="no">' + (n + 1) + '</td>',
					i8 + '<td class="target">' + text(a.target) + '</td>',
					i8 + '<td class="name">' + text(a.name) + '</td>',
					i8 + '<td class="desc">' + text(a.desc) + '</td>',
					i8 + '<td class="photo">' + (a.image ? picture(a.image, base) : '') + '</td>',
					i7 + '</tr>'
				].join('\n');
			}).join('\n');
		},
		posters: function (list, base) {
			var i5 = indent(5), i6 = indent(6);
			return list.map(function (p) {
				return [
					i5 + '<li>',
					i6 + '<figure>' + picture(p.image, base) + '</figure>',
					i6 + '<p>' + text(p.caption) + '</p>',
					i5 + '</li>'
				].join('\n');
			}).join('\n');
		}
	};

	// 브라우저 직렬화 기준으로 공백·주석을 걷어낸 비교용 문자열
	function squash(html) {
		var t = document.createElement('template');
		t.innerHTML = html;
		return t.innerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').trim();
	}

	// 영역 카드 한 줄 칸 수: 5개까지는 한 줄, 그보다 많으면 3·4칸으로 나눠 줄 맞춤 (태블릿 이하는 style.css 기준)
	function cols(n) { return n <= 5 ? Math.max(n, 1) : (n % 3 === 0 ? 3 : 4); }

	// 새 조각을 넣고, 기존 리빌 모션 규칙(data-stagger)을 다시 적용
	var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
		es.forEach(function (e) {
			if (e.isIntersecting) { e.target.classList.add('is-on'); io.unobserve(e.target); }
		});
	}, { threshold: 0.12 }) : null;

	function swap(box, html) {
		var wasOn = !!box.querySelector('.is-on');
		box.innerHTML = html;
		if (!box.hasAttribute('data-stagger')) return;
		Array.prototype.forEach.call(box.children, function (child, i) {
			child.classList.add('reveal');
			child.style.setProperty('--d', (i * 0.09) + 's');
			if (wasOn || !io) child.classList.add('is-on');
			else io.observe(child);
		});
	}

	// 프로그램 페이지: 스크립트 실행 시점(common.js 보다 먼저)의 원본을 저장해 두고, 데이터가 다를 때만 교체
	var boxes = document.querySelectorAll('[data-programs]');
	var snap = [];
	Array.prototype.forEach.call(boxes, function (box) { snap.push(squash(box.innerHTML)); });

	var counts = document.querySelectorAll('[data-activity-count]');
	var areaCounts = document.querySelectorAll('[data-area-count]');

	if (boxes.length || counts.length || areaCounts.length) {
		load('programs').then(function (d) {
			Array.prototype.forEach.call(boxes, function (box, i) {
				var key = box.getAttribute('data-programs');
				var list = d[/^direction/.test(key) ? 'areas' : key];   // 메인 Direction 은 영역 데이터로 그린다
				if (!render[key] || !list) return;
				if (key === 'areas' || key === 'direction') box.style.setProperty('--cols', cols(list.length));
				if (squash(render[key](list, '')) === snap[i]) return; // HTML 에 든 내용과 같으면 그대로 둔다
				swap(box, render[key](list, BASE));
			});
			Array.prototype.forEach.call(counts, function (el) { el.textContent = d.activities.length; });
			Array.prototype.forEach.call(areaCounts, function (el) { el.textContent = d.areas.length; });
		}).catch(function () { /* 데이터를 못 받으면 HTML 에 들어 있는 내용 그대로 */ });
	}

	// 사이트 문구 (data/site.json): data-site="키" 요소를 설정값으로 교체 (비어 있으면 HTML 그대로)
	var siteTexts = document.querySelectorAll('[data-site]');
	if (siteTexts.length) {
		load('site').then(function (st) {
			Array.prototype.forEach.call(siteTexts, function (el) {
				var v = st[el.getAttribute('data-site')];
				if (v && squash(text(v)).replace(/\s+/g, '') !== squash(el.innerHTML).replace(/\s+/g, '')) el.innerHTML = text(v);   // 공백만 다르면 그대로
			});
		}).catch(function () { /* HTML 에 든 문구 그대로 */ });
	}

	window.FoxContent = { load: load, url: url, esc: esc, text: text, BASE: BASE, render: render, squash: squash };
})();
