// 폭스 패밀리사이트 드롭다운 여닫기 동작
(function () {
	'use strict';

	var area = document.querySelector('.foxsite-nav-area');
	if (!area) return;

	var nav = area.querySelector('.foxsite-nav');
	var openBtn = area.querySelector('.btn-foxsite-nav-open');
	var closeBtn = area.querySelector('.btn-foxsite-nav-close');
	if (!nav || !openBtn) return;

	function open() {
		nav.classList.add('is-open');
		openBtn.setAttribute('aria-expanded', 'true');
	}

	function close() {
		nav.classList.remove('is-open');
		openBtn.setAttribute('aria-expanded', 'false');
	}

	openBtn.addEventListener('click', function (e) {
		e.stopPropagation();
		if (nav.classList.contains('is-open')) close();
		else open();
	});

	if (closeBtn) {
		closeBtn.addEventListener('click', function (e) {
			e.stopPropagation();
			close();
		});
	}

	// 바깥 클릭으로 닫기
	document.addEventListener('click', function (e) {
		if (!area.contains(e.target)) close();
	});

	// ESC로 닫기
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') close();
	});

	close();
})();
