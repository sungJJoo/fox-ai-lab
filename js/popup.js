// 메인 팝업: data/popups.json 중 사용 중이고 기간 안인 팝업을 페이지를 가리지 않게 띄운다 (오늘 하루 보지 않기 지원)
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

	function card(p) {
		var img = '';
		if (p.image && p.image.src) {
			img = '<img src="' + F.esc(F.url(p.image.src)) + '" width="' + p.image.width + '" height="' + p.image.height +
				'" alt="' + F.esc(p.title) + '" />';
			if (p.link) img = '<a href="' + F.esc(p.link) + '">' + img + '</a>';
			img = '<div class="pp-img">' + img + '</div>';
		}
		var txt = p.body ? '<p class="pp-body">' + F.text(p.body) + '</p>' : '';
		var btn = p.link && !img ? '<a class="btn btn-fill pp-go" href="' + F.esc(p.link) + '">' + F.esc(p.linkText || '자세히 보기') + '</a>' : '';
		var head = (!img || txt) ? '<h2 class="pp-tit">' + F.esc(p.title) + '</h2>' : '';
		return '<section class="pp-card" role="region" aria-label="알림: ' + F.esc(p.title) + '" data-id="' + F.esc(p.id) + '">' +
			'<span class="pp-count" aria-hidden="true"></span><div class="pp-scroll">' +
			img + ((head || txt || btn) ? '<div class="pp-cont">' + head + txt + btn + '</div>' : '') + '</div>' +
			'<footer><button type="button" data-act="today">오늘 하루 보지 않기</button>' +
			'<button type="button" data-act="close">닫기</button></footer></section>';
	}

	F.load('popups').then(function (list) {
		var t = today();
		var show = list.filter(function (p) {
			return p.enabled && (!p.start || p.start <= t) && (!p.end || t <= p.end) && !hiddenToday(p.id);
		});
		if (!show.length) return;

		var box = document.createElement('div');
		box.className = 'pp-layer';
		box.innerHTML = show.map(card).join('');
		// 페이지를 막지 않는 알림이라 포커스는 옮기지 않고, 키보드로 일찍 닿도록 본문 바로가기 다음에 둔다
		var skip = document.querySelector('.skip-link');
		document.body.insertBefore(box, skip ? skip.nextSibling : document.body.firstChild);
		count();

		// 모바일은 한 장씩 보여서 남은 개수를 표시
		function count() {
			var cards = box.querySelectorAll('.pp-card');
			Array.prototype.forEach.call(cards, function (c, i) {
				c.querySelector('.pp-count').textContent = cards.length > 1 ? (i + 1) + ' / ' + cards.length : '';
			});
		}

		box.addEventListener('click', function (e) {
			var b = e.target.closest('button[data-act]');
			if (!b) return;
			var c = b.closest('.pp-card');
			if (b.getAttribute('data-act') === 'today') hideToday(c.getAttribute('data-id'));
			c.remove();
			if (!box.querySelector('.pp-card')) box.remove();
			else count();
		});
	}).catch(function () { /* 팝업 데이터가 없으면 띄우지 않음 */ });
})();
