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

	// 히어로 떠다니는 질문 — 마우스 패럴랙스 (절제된 깊이감)
	var qf = document.getElementById('qfield');
	if (qf && !reduced) {
		var tx = 0, ty = 0, cx = 0, cy = 0;
		window.addEventListener('mousemove', function (e) {
			tx = (e.clientX / window.innerWidth - 0.5) * 22;
			ty = (e.clientY / window.innerHeight - 0.5) * 22;
		}, { passive: true });
		(function loop() {
			cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
			qf.style.transform = 'translate(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px)';
			requestAnimationFrame(loop);
		})();
	}

	// 포스터 라이트박스 (클릭 확대 / 닫기)
	var lb = document.getElementById('posterLightbox');
	if (lb) {
		var lbImg = lb.querySelector('.lb-img');
		var lbClose = lb.querySelector('.lb-close');
		function openLb(src, alt) {
			lbImg.src = src; lbImg.alt = alt || '';
			lb.classList.add('is-open');
			lb.setAttribute('aria-hidden', 'false');
			document.body.style.overflow = 'hidden';
		}
		function closeLb() {
			lb.classList.remove('is-open');
			lb.setAttribute('aria-hidden', 'true');
			document.body.style.overflow = '';
			setTimeout(function () { lbImg.src = ''; }, 320);
		}
		document.querySelectorAll('.poster-list figure img').forEach(function (im) {
			im.addEventListener('click', function () { openLb(im.src, im.alt); });
		});
		lbClose.addEventListener('click', closeLb);
		lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb.classList.contains('is-open')) closeLb(); });
	}
})();
