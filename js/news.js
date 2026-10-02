// 공지·소식: data/news.json 을 읽어 공지·소식 페이지(목록·상세)와 메인 「최근 소식」을 그린다
(function () {
	'use strict';

	var app = document.getElementById('newsApp');
	var latest = document.getElementById('newsLatest');
	if (!app && !latest) return;

	var F = window.FoxContent;
	var PER_PAGE = 10;
	var CATS = ['전체', '공지', '소식'];
	var q = new URLSearchParams(location.search);

	function link(params) {
		var s = new URLSearchParams();
		Object.keys(params).forEach(function (k) { if (params[k]) s.set(k, params[k]); });
		var str = s.toString();
		return 'news.html' + (str ? '?' + str : '');
	}

	function fmtDate(d) { return String(d || '').replace(/-/g, '.'); }

	// 본문: 이스케이프 → 주소 자동 링크 → 빈 줄은 문단, 한 줄 바꿈은 <br />
	function body(s) {
		return String(s || '').split(/\r?\n\s*\r?\n/).map(function (para) {
			var h = F.esc(para.trim()).replace(/https?:\/\/[^\s<]+/g, function (u) {
				return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>';
			}).replace(/\r?\n/g, '<br />');
			return h ? '<p>' + h + '</p>' : '';
		}).join('');
	}

	function sorted(list) {
		return list.slice().sort(function (a, b) {
			if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
			return a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id;
		});
	}

	var IMG_ICON = '<svg class="bd-ico" viewBox="0 0 16 16" aria-label="사진 있음" role="img"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="5.5" cy="6.5" r="1.3" fill="currentColor"/><path d="M14 11.5l-4-3.5-6 5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';

	// 최근 7일 안에 올린 글
	function isNew(d) {
		var t = new Date(d + 'T00:00:00');
		return !isNaN(t) && (Date.now() - t.getTime()) < 7 * 864e5;
	}

	function catTag(n) {
		return '<span class="nw-cat c-' + (n.category === '공지' ? 'notice' : 'news') + '">' + F.esc(n.category) + '</span>';
	}

	// 게시판 목록: 분류 탭 → 전체 건수·검색 → 표 → 페이지 번호
	function renderList(all) {
		var cat = CATS.indexOf(q.get('cat')) > 0 ? q.get('cat') : '전체';
		var word = (q.get('q') || '').trim();
		var list = sorted(all).filter(function (n) {
			if (cat !== '전체' && n.category !== cat) return false;
			return !word || (n.title + ' ' + (n.body || '')).toLowerCase().indexOf(word.toLowerCase()) >= 0;
		});
		var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
		var page = Math.min(pages, Math.max(1, parseInt(q.get('page'), 10) || 1));
		var start = (page - 1) * PER_PAGE;
		var rows = list.slice(start, start + PER_PAGE);
		var plain = list.filter(function (n) { return !n.pinned; }).length;   // 고정 글을 뺀 글 번호 기준
		var base = { cat: cat === '전체' ? '' : cat, q: word };

		var h = '<nav class="bd-tabs" aria-label="분류">' + CATS.map(function (c) {
			return '<a href="' + link({ cat: c === '전체' ? '' : c, q: word }) + '"' + (c === cat ? ' aria-current="page"' : '') + '>' + c + '</a>';
		}).join('') + '</nav>';

		h += '<div class="bd-top"><p class="bd-total">전체 <b>' + list.length + '</b>건' +
			' <span>(' + page + ' / ' + pages + ' 페이지)</span></p>' +
			'<form class="bd-search" role="search" action="news.html">' +
				(base.cat ? '<input type="hidden" name="cat" value="' + F.esc(base.cat) + '" />' : '') +
				'<input type="search" name="q" value="' + F.esc(word) + '" placeholder="검색어를 입력하세요" aria-label="검색어" />' +
				'<button type="submit">검색</button></form></div>';

		h += '<table class="bd-list"><caption class="bd-sr">공지·소식 목록 (번호, 분류, 제목, 작성일)</caption>' +
			'<thead><tr><th scope="col" class="c-no">번호</th><th scope="col" class="c-cat">분류</th>' +
			'<th scope="col" class="c-tit">제목</th><th scope="col" class="c-date">작성일</th></tr></thead><tbody>';
		if (!rows.length) {
			h += '<tr><td colspan="4" class="bd-empty">' + (word ? '「' + F.esc(word) + '」에 대한 검색 결과가 없습니다.' : '등록된 게시물이 없습니다.') + '</td></tr>';
		}
		var no = plain - list.slice(0, start).filter(function (n) { return !n.pinned; }).length;
		rows.forEach(function (n) {
			h += '<tr' + (n.pinned ? ' class="is-pin"' : '') + '>' +
				'<td class="c-no">' + (n.pinned ? '<span class="bd-notice">공지</span>' : no--) + '</td>' +
				'<td class="c-cat">' + catTag(n) + '</td>' +
				'<td class="c-tit"><a href="' + link({ id: n.id }) + '"><span class="bd-m-cat">' + catTag(n) + '</span>' + F.esc(n.title) + '</a>' +
					(n.images && n.images.length ? IMG_ICON : '') +
					(isNew(n.date) ? '<span class="bd-new" aria-label="새 글">N</span>' : '') + '</td>' +
				'<td class="c-date"><time datetime="' + F.esc(n.date) + '">' + fmtDate(n.date) + '</time></td></tr>';
		});
		h += '</tbody></table>';

		h += '<nav class="bd-paging" aria-label="페이지">' +
			pageBtn(base, 1, '«', '처음 페이지', page === 1) +
			pageBtn(base, page - 1, '‹', '이전 페이지', page === 1);
		for (var p = Math.max(1, page - 4); p <= Math.min(pages, Math.max(1, page - 4) + 9); p++) {
			h += '<a href="' + link({ cat: base.cat, q: base.q, page: p > 1 ? p : '' }) + '"' + (p === page ? ' aria-current="page"' : '') + '>' + p + '</a>';
		}
		h += pageBtn(base, page + 1, '›', '다음 페이지', page === pages) +
			pageBtn(base, pages, '»', '마지막 페이지', page === pages) + '</nav>';
		app.innerHTML = h;
	}

	function pageBtn(base, p, label, name, off) {
		if (off) return '<span class="bd-pg-btn is-off" aria-hidden="true">' + label + '</span>';
		return '<a class="bd-pg-btn" href="' + link({ cat: base.cat, q: base.q, page: p > 1 ? p : '' }) + '" aria-label="' + name + '">' + label + '</a>';
	}

	// 게시판 상세: 제목·정보 → 본문 → 이전글·다음글 → 목록
	function renderView(all, id) {
		var n = all.filter(function (x) { return String(x.id) === String(id); })[0];
		if (!n) {
			app.innerHTML = '<p class="nw-empty">글을 찾을 수 없습니다. 삭제되었거나 주소가 잘못되었습니다.</p>' +
				'<div class="bd-btns"><a class="bd-btn" href="news.html">목록</a></div>';
			return;
		}
		document.title = n.title + ' | 공지·소식 | AI 연구소 — 폭스러닝센터';
		var can = document.querySelector('link[rel="canonical"]');
		if (can) can.href = can.href.split('?')[0] + '?id=' + n.id;
		var imgs = (n.images || []).map(function (im) {
			return '<figure><img src="' + F.esc(F.url(im.src)) + '" width="' + im.width + '" height="' + im.height +
				'" alt="' + F.esc(im.alt || '') + '" loading="lazy" /></figure>';
		}).join('');

		// 이전글(더 오래된 글)·다음글(더 최근 글)은 날짜순
		var byDate = all.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id; });
		var i = byDate.indexOf(n);
		function near(label, x) {
			return '<li><span>' + label + '</span>' + (x ? '<a href="' + link({ id: x.id }) + '">' + F.esc(x.title) + '</a><time>' + fmtDate(x.date) + '</time>'
				: '<em>' + label + '이 없습니다.</em>') + '</li>';
		}

		app.innerHTML =
			'<article class="bd-view">' +
				'<header><h2>' + F.esc(n.title) + '</h2>' +
				'<dl><div><dt>분류</dt><dd>' + F.esc(n.category) + '</dd></div>' +
				'<div><dt>작성일</dt><dd><time datetime="' + F.esc(n.date) + '">' + fmtDate(n.date) + '</time></dd></div>' +
				'<div><dt>작성자</dt><dd>AI 연구소</dd></div></dl></header>' +
				(imgs ? '<div class="nw-imgs">' + imgs + '</div>' : '') +
				'<div class="nw-body">' + body(n.body) + '</div>' +
			'</article>' +
			'<ul class="bd-near">' + near('이전글', byDate[i + 1]) + near('다음글', byDate[i - 1]) + '</ul>' +
			'<div class="bd-btns"><a class="bd-btn" href="news.html">목록</a></div>';
	}

	// 메인 최근 소식 3개 (글이 없거나 못 불러오면 영역째 숨김 유지)
	function renderLatest(all) {
		var rows = sorted(all).slice(0, 3);
		if (!rows.length) return;
		latest.querySelector('[data-news-latest]').innerHTML = rows.map(function (n) {
			var im = n.images && n.images[0];
			var cat = n.category === '공지' ? 'notice' : 'news';
			return '<li><a href="' + link({ id: n.id }) + '">' +
				'<figure class="nw-card-img' + (im ? '' : ' is-empty') + '">' +
					(im ? '<img src="' + F.esc(F.url(im.src)) + '" width="' + im.width + '" height="' + im.height + '" alt="" loading="lazy" />'
						: '<span aria-hidden="true">' + (cat === 'notice' ? 'NOTICE' : 'NEWS') + '</span>') +
				'</figure>' +
				'<div class="nw-card-cont"><span class="nw-cat c-' + cat + '">' + F.esc(n.category) + '</span>' +
				'<strong>' + F.esc(n.title) + '</strong>' +
				'<time datetime="' + F.esc(n.date) + '">' + fmtDate(n.date) + '</time></div></a></li>';
		}).join('');
		latest.hidden = false;
	}

	F.load('news').then(function (all) {
		if (latest) renderLatest(all);
		if (!app) return;
		if (q.get('id')) renderView(all, q.get('id'));
		else renderList(all);
	}).catch(function () {
		if (app) app.innerHTML = '<p class="nw-empty">글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>';
	});
})();
