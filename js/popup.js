// 메인 팝업: data/popups.json 중 사용 중이고 기간 안인 팝업을 한 칸에 모아 넘겨 보게 띄운다 (페이지를 가리지 않음, 오늘 하루 보지 않기)
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

	// 이미지가 있으면 포스터 중심(설명은 한 줄), 없으면 글 카드
	function slide(p, i) {
		var link = p.link ? F.esc(p.link) : '';
		var inner;
		if (p.image && p.image.src) {
			var img = '<img src="' + F.esc(F.url(p.image.src)) + '" width="' + p.image.width + '" height="' + p.image.height +
				'" alt="' + F.esc(p.title) + '" />';
			// 사진 비율이 칸과 달라도 빈 곳이 어색하지 않게, 같은 사진을 흐리게 깔아 둔다 (CSS 변수 속 상대 주소는 CSS 파일 기준이라 절대 주소로)
			inner = '<div class="pp-img" style="--pp-bg:url(&quot;' + F.esc(new URL(F.url(p.image.src), location.href).href) + '&quot;)">' + (link ? '<a href="' + link + '">' + img + '</a>' : img) + '</div>' +
				(p.body ? '<p class="pp-cap">' + F.text(p.body) + '</p>' : '');
		} else {
			inner = '<div class="pp-text"><span class="pp-label">알림</span>' +
				'<h2 class="pp-tit">' + F.esc(p.title) + '</h2>' +
				(p.body ? '<p class="pp-body">' + F.text(p.body) + '</p>' : '') +
				(link ? '<a class="btn btn-fill pp-go" href="' + link + '">' + F.esc(p.linkText || '자세히 보기') + '</a>' : '') +
				'</div>';
		}
		return '<div class="pp-slide" data-id="' + F.esc(p.id) + '"' + (i ? ' hidden' : '') + '>' + inner + '</div>';
	}

	F.load('popups').then(function (list) {
		var t = today();
		var show = list.filter(function (p) {
			return p.enabled && (!p.start || p.start <= t) && (!p.end || t <= p.end) && !hiddenToday(p.id);
		});
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
			if (act === 'today') show.forEach(function (p) { hideToday(p.id); });
			box.remove();
		});
	}).catch(function () { /* 팝업 데이터가 없으면 띄우지 않음 */ });
})();
