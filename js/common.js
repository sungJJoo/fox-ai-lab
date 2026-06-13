// 공통 스크립트: 헤더 스크롤 상태, 모바일 메뉴, 리빌 모션, 숫자 카운터, 스크롤 진행바
(function () {
	var header = document.querySelector('.site-header');
	var progress = document.querySelector('.scroll-progress');

	// 헤더 스크롤 상태 + 진행바
	function onScroll() {
		var y = window.pageYOffset;
		header.classList.toggle('is-scrolled', y > 10);
		if (progress) {
			var max = document.documentElement.scrollHeight - window.innerHeight;
			progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
		}
	}
	window.addEventListener('scroll', onScroll, { passive: true });
	onScroll();

	// 모바일 메뉴
	var btn = document.querySelector('.btn-gnb-open');
	var gnb = document.querySelector('.site-gnb');
	if (btn && gnb) {
		btn.addEventListener('click', function () {
			document.body.classList.toggle('gnb-opened');
		});
		gnb.addEventListener('click', function (e) {
			if (e.target.tagName === 'A') document.body.classList.remove('gnb-opened');
		});
	}

	// 리빌 모션 (스태거: data-stagger 컨테이너의 자식에 지연 부여)
	document.querySelectorAll('[data-stagger]').forEach(function (box) {
		Array.prototype.forEach.call(box.children, function (child, i) {
			child.classList.add('reveal');
			child.style.setProperty('--d', (i * 0.09) + 's');
		});
	});
	var io = new IntersectionObserver(function (entries) {
		entries.forEach(function (en) {
			if (en.isIntersecting) {
				en.target.classList.add('is-on');
				io.unobserve(en.target);
			}
		});
	}, { threshold: 0.12 });
	document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

	// 숫자 카운터 (.count[data-count])
	var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var cio = new IntersectionObserver(function (entries) {
		entries.forEach(function (en) {
			if (!en.isIntersecting) return;
			cio.unobserve(en.target);
			var el = en.target;
			var to = parseInt(el.getAttribute('data-count'), 10);
			if (reduced) { el.textContent = to; return; }
			var t0 = null, dur = 1300;
			function tick(t) {
				if (!t0) t0 = t;
				var p = Math.min((t - t0) / dur, 1);
				el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
				if (p < 1) requestAnimationFrame(tick);
			}
			requestAnimationFrame(tick);
		});
	}, { threshold: 0.5 });
	document.querySelectorAll('.count[data-count]').forEach(function (el) { cio.observe(el); });
})();
