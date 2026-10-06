// 메인 팝업: 공지·소식 글 중 「팝업으로 띄우기」가 켜져 있고 기간 안인 글을 한 칸에 모아 넘겨 보게 띄운다 (누르면 글 상세로)
(function () {
	'use strict';

	var F = window.FoxContent;
	var KEY = 'foxai-popup-hide-';

	function today() {
		var d = new Date();
		return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
	}

	function hiddenToday(id) {
		try { return localStorage.getItem(KEY + id) === today(); } catch (e) { return false; }
	}

	function hideToday(id) {
		try { localStorage.setItem(KEY + id, today()); } catch (e) { /* 저장 불가 환경: 이번 화면에서만 닫힘 */ }
	}

	// 팝업 이미지가 있으면 포스터 중심, 없으면 글의 첫 사진, 그것도 없으면 글 카드
	function slide(n, i) {
		var link = 'news.html?id=' + encodeURIComponent(n.id);
		var im = (n.popup && n.popup.image) || (n.images && n.images[0]);
		var more = '<a class="pp-more" href="' + link + '">자세히 보기 <span aria-hidden="true">→</span></a>';
		var inner;
		if (im && im.src) {
			var src = F.url(im.src);
			var img = '<img src="' + F.esc(src) + '" width="' + im.width + '" height="' + im.height + '" alt="' + F.esc(n.title) + '" />';
			// 사진 비율이 칸과 달라도 빈 곳이 어색하지 않게, 같은 사진을 흐리게 깔아 둔다 (CSS 변수 속 상대 주소는 CSS 파일 기준이라 절대 주소로)
			inner = '<div class="pp-img" style="--pp-bg:url(&quot;' + F.esc(new URL(src, location.href).href) + '&quot;)"><a href="' + link + '">' + img + '</a></div>' +
				'<div class="pp-cap"><strong>' + F.esc(n.title) + '</strong>' + more + '</div>';
		} else {
			inner = '<div class="pp-text"><span class="pp-label">' + F.esc(n.category || '알림') + '</span>' +
				'<h2 class="pp-tit">' + F.esc(n.title) + '</h2>' +
				'<p class="pp-date">' + F.esc(String(n.date || '').replace(/-/g, '.')) + '</p>' +
				'<a class="btn btn-fill pp-go" href="' + link + '">자세히 보기</a></div>';
		}
		return '<div class="pp-slide" data-id="' + F.esc(n.id) + '"' + (i ? ' hidden' : '') + '>' + inner + '</div>';
	}

	F.load('news').then(function (list) {
		var t = today();
		var show = list.filter(function (n) {
			var p = n.popup;
			return p && p.on && (!p.start || p.start <= t) && (!p.end || t <= p.end) && !hiddenToday(n.id);
		}).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id; });
		if (!show.length) return;

		var many = show.length > 1;
		var box = document.createElement('aside');
		box.className = 'pp-box';
		box.setAttribute('aria-label', '알림');
		box.innerHTML = '<div class="pp-view">' + show.map(slide).join('') + '</div>' +
			(many ? '<div class="pp-nav"><button type="button" data-act="prev" aria-label="이전 알림">‹</button>' +
				'<span class="pp-num" aria-live="polite"></span>' +
				'<button type="button" data-act="next" aria-label="다음 알림">›</button></div>' : '') +
			'<footer><button type="button" data-act="today">오늘 하루 보지 않기</button>' +
			'<button type="button" data-act="close">닫기</button></footer>';
		// 페이지를 막지 않는 알림이라 포커스는 옮기지 않고, 키보드로 일찍 닿도록 본문 바로가기 다음에 둔다
		var skip = document.querySelector('.skip-link');
		document.body.insertBefore(box, skip ? skip.nextSibling : document.body.firstChild);

		var slides = box.querySelectorAll('.pp-slide');
		var cur = 0;
		function go(n) {
			cur = (n + slides.length) % slides.length;
			Array.prototype.forEach.call(slides, function (s, i) { s.hidden = i !== cur; });
			if (many) box.querySelector('.pp-num').textContent = (cur + 1) + ' / ' + slides.length;
		}
		go(0);

		box.addEventListener('click', function (e) {
			var b = e.target.closest('button[data-act]');
			if (!b) return;
			var act = b.getAttribute('data-act');
			if (act === 'prev') return go(cur - 1);
			if (act === 'next') return go(cur + 1);
			if (act === 'today') show.forEach(function (n) { hideToday(n.id); });
			box.remove();
		});
	}).catch(function () { /* 글 데이터가 없으면 띄우지 않음 */ });
})();
