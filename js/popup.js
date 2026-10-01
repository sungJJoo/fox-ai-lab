// 메인 팝업: data/popups.json 중 사용 중이고 기간 안인 팝업을 띄운다 (오늘 하루 보지 않기 지원)
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
		return '<section class="pp-card" role="dialog" aria-label="' + F.esc(p.title) + '" data-id="' + F.esc(p.id) + '">' +
			img + ((head || txt || btn) ? '<div class="pp-cont">' + head + txt + btn + '</div>' : '') +
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
		box.innerHTML = '<div class="pp-stack">' + show.map(card).join('') + '</div>';
		document.body.appendChild(box);
		box.querySelector('button[data-act="close"]').focus({ preventScroll: true });

		box.addEventListener('click', function (e) {
			var b = e.target.closest('button[data-act]');
			if (!b) return;
			var c = b.closest('.pp-card');
			if (b.getAttribute('data-act') === 'today') hideToday(c.getAttribute('data-id'));
			c.remove();
			if (!box.querySelector('.pp-card')) box.remove();
		});
	}).catch(function () { /* 팝업 데이터가 없으면 띄우지 않음 */ });
})();
