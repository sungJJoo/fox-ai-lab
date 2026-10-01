// 공지·소식 페이지: data/news.json 을 읽어 목록(분류·페이지)과 상세(?id=)를 그린다
(function () {
	'use strict';

	var app = document.getElementById('newsApp');
	if (!app) return;

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

	function renderList(all) {
		var cat = CATS.indexOf(q.get('cat')) > 0 ? q.get('cat') : '전체';
		var list = sorted(all).filter(function (n) { return cat === '전체' || n.category === cat; });
		var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
		var page = Math.min(pages, Math.max(1, parseInt(q.get('page'), 10) || 1));
		var rows = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);

		var h = '<div class="nw-tabs" role="tablist">' + CATS.map(function (c) {
			return '<a role="tab" href="' + link({ cat: c === '전체' ? '' : c }) + '"' +
				(c === cat ? ' aria-selected="true" class="is-on"' : ' aria-selected="false"') + '>' + c + '</a>';
		}).join('') + '</div>';

		if (!rows.length) {
			h += '<p class="nw-empty">등록된 글이 없습니다.</p>';
		} else {
			h += '<ul class="nw-list">' + rows.map(function (n) {
				return '<li' + (n.pinned ? ' class="is-pin"' : '') + '><a href="' + link({ id: n.id }) + '">' +
					'<span class="nw-cat c-' + (n.category === '공지' ? 'notice' : 'news') + '">' + F.esc(n.category) + '</span>' +
					'<strong class="nw-tit">' + (n.pinned ? '<span class="nw-pin">고정</span>' : '') + F.esc(n.title) + '</strong>' +
					'<time datetime="' + F.esc(n.date) + '">' + fmtDate(n.date) + '</time></a></li>';
			}).join('') + '</ul>';
		}

		if (pages > 1) {
			h += '<nav class="nw-paging" aria-label="페이지">';
			for (var p = 1; p <= pages; p++) {
				h += '<a href="' + link({ cat: cat === '전체' ? '' : cat, page: p > 1 ? p : '' }) + '"' +
					(p === page ? ' aria-current="page"' : '') + '>' + p + '</a>';
			}
			h += '</nav>';
		}
		app.innerHTML = h;
	}

	function renderView(all, id) {
		var n = all.filter(function (x) { return String(x.id) === String(id); })[0];
		if (!n) {
			app.innerHTML = '<p class="nw-empty">글을 찾을 수 없습니다. 삭제되었거나 주소가 잘못되었습니다.</p>' +
				'<p class="nw-back"><a class="btn btn-dark" href="news.html">목록으로</a></p>';
			return;
		}
		document.title = n.title + ' | 공지·소식 | AI 연구소 — 폭스러닝센터';
		var imgs = (n.images || []).map(function (im) {
			return '<figure><img src="' + F.esc(F.url(im.src)) + '" width="' + im.width + '" height="' + im.height +
				'" alt="' + F.esc(im.alt || '') + '" loading="lazy" /></figure>';
		}).join('');
		app.innerHTML =
			'<article class="nw-view">' +
				'<header><span class="nw-cat c-' + (n.category === '공지' ? 'notice' : 'news') + '">' + F.esc(n.category) + '</span>' +
				'<h2>' + F.esc(n.title) + '</h2>' +
				'<time datetime="' + F.esc(n.date) + '">' + fmtDate(n.date) + '</time></header>' +
				(imgs ? '<div class="nw-imgs">' + imgs + '</div>' : '') +
				'<div class="nw-body">' + body(n.body) + '</div>' +
			'</article>' +
			'<p class="nw-back"><a class="btn btn-dark" href="news.html">목록으로</a></p>';
	}

	F.load('news').then(function (all) {
		if (q.get('id')) renderView(all, q.get('id'));
		else renderList(all);
	}).catch(function () {
		app.innerHTML = '<p class="nw-empty">글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>';
	});
})();
