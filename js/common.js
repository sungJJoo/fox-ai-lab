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

	// 떠다니는 질문 — 큰 이동 없이, 가끔 다른 문구로 은은하게 교체 (다양성은 시간차 크로스페이드로)
	if (qf && !reduced) {
		var qPool = [
			'이건 왜 이렇게 생겼을까?',
			'다르게 만들면 어떻게 될까?',
			'내가 이 문제를 풀 수 있을까?',
			'더 좋은 방법은 없을까?',
			'이걸 로봇이 대신 할 수 있을까?',
			'궁금한 게 너무 많아!'
		];
		var qLeftover = qPool.slice();
		function qNext() {
			if (!qLeftover.length) qLeftover = qPool.slice();
			return qLeftover.splice(Math.floor(Math.random() * qLeftover.length), 1)[0];
		}
		Array.prototype.forEach.call(qf.querySelectorAll('.q:not(.qbig)'), function (el, i) {
			(function schedule() {
				var wait = 11000 + Math.random() * 8000 + i * 900;
				setTimeout(function () {
					el.style.opacity = '0';
					setTimeout(function () {
						el.textContent = qNext();
						el.style.opacity = '';
						schedule();
					}, 800);
				}, wait);
			})();
		});
	}

	// 미래 비전 흐름 — 세로로 흐르며 중앙 문구를 강조
	var visionFlow = document.getElementById('visionFlow');
	var visionTrack = document.getElementById('visionTrack');
	if (visionFlow && visionTrack) {
		var vRow = 78;
		var vItems = Array.prototype.slice.call(visionTrack.children);
		var vTotal = vRow * vItems.length;
		vItems.forEach(function (li) { visionTrack.appendChild(li.cloneNode(true)); });
		var vAll = Array.prototype.slice.call(visionTrack.children);
		function vCenter() { return visionFlow.clientHeight / 2; }
		function vPaint(off) {
			var c = vCenter();
			vAll.forEach(function (li, i) {
				var y = i * vRow - off + vRow / 2;
				var d = Math.abs(y - c);
				var k = Math.max(0, 1 - d / (vRow * 2.3));
				li.style.opacity = (0.16 + 0.84 * Math.pow(k, 1.4)).toFixed(2);
				li.style.fontWeight = k > 0.55 ? '700' : '500';
			});
		}
		if (reduced) {
			visionTrack.style.transform = 'translateY(' + (vCenter() - vRow / 2) + 'px)';
			vPaint(0);
		} else {
			var vSpeed = 0.02, vt0 = null;
			function vLoop(t) {
				if (!vt0) vt0 = t;
				var off = ((t - vt0) * vSpeed) % vTotal;
				visionTrack.style.transform = 'translateY(' + ((vCenter() - vRow / 2) - off) + 'px)';
				vPaint(off - (vCenter() - vRow / 2));
				requestAnimationFrame(vLoop);
			}
			var vio = new IntersectionObserver(function (es) {
				es.forEach(function (e) { if (e.isIntersecting) { requestAnimationFrame(vLoop); vio.disconnect(); } });
			}, { threshold: .3 });
			vio.observe(visionFlow);
		}
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

	// 대회 준비 과정 슬라이드쇼 (실제 활동 사진 + 설명)
	var ssData = {
		fll: {
			images: ['images/fll-photos/fll-01.jpg', 'images/fll-photos/fll-02.jpg', 'images/fll-photos/fll-03.jpg', 'images/fll-photos/fll-04.jpg', 'images/fll-photos/fll-05.jpg', 'images/fll-photos/fll-06.jpg', 'images/fll-photos/fll-07.jpg', 'images/fll-photos/fll-08.jpg'],
			captions: [
				'레고 부품을 하나하나 분류하며 미션 준비를 시작합니다.',
				'팀원들과 머리를 맞대고 미션 노트에 아이디어를 정리합니다.',
				'구상한 아이디어를 레고 모델로 직접 조립해봅니다.',
				'완성해가는 모델 앞에서 팀워크가 자랍니다.',
				'그날의 활동을 기록하며 다음 단계를 준비합니다.',
				'손끝으로 하나하나, 디테일을 채워갑니다.',
				'여러 시간의 몰입 끝에 완성한 미션 모델.',
				'완성된 미션 필드 위, 팀의 결과물이 한눈에 펼쳐집니다.'
			]
		}
	};
	var ssEl = document.getElementById('slideshowFll');
	if (ssEl) {
		var ssImg = ssEl.querySelector('.ss-img');
		var ssCap = ssEl.querySelector('.ss-caption');
		var ssDots = ssEl.querySelector('.ss-dots');
		var ssCur = null, ssIdx = 0, ssTimer = null;

		function ssRender() {
			var d = ssData[ssCur];
			ssImg.src = d.images[ssIdx];
			ssImg.alt = d.captions[ssIdx];
			ssCap.textContent = d.captions[ssIdx];
			Array.prototype.forEach.call(ssDots.children, function (dot, i) {
				dot.classList.toggle('is-active', i === ssIdx);
			});
		}
		function ssResetTimer() {
			if (ssTimer) clearInterval(ssTimer);
			if (!reduced) ssTimer = setInterval(function () { ssGoto(ssIdx + 1); }, 4500);
		}
		function ssGoto(i) {
			var d = ssData[ssCur];
			ssIdx = (i + d.images.length) % d.images.length;
			ssRender();
			ssResetTimer();
		}
		function ssOpen(key) {
			ssCur = key;
			ssIdx = 0;
			var d = ssData[key];
			ssDots.innerHTML = '';
			d.images.forEach(function (_, i) {
				var b = document.createElement('button');
				b.type = 'button';
				b.setAttribute('aria-label', (i + 1) + '번째 사진');
				b.addEventListener('click', function () { ssGoto(i); });
				ssDots.appendChild(b);
			});
			ssRender();
			ssEl.classList.add('is-open');
			ssEl.setAttribute('aria-hidden', 'false');
			document.body.style.overflow = 'hidden';
			ssResetTimer();
		}
		function ssCloseFn() {
			ssEl.classList.remove('is-open');
			ssEl.setAttribute('aria-hidden', 'true');
			document.body.style.overflow = '';
			if (ssTimer) clearInterval(ssTimer);
		}
		document.querySelectorAll('[data-slideshow]').forEach(function (btn) {
			btn.addEventListener('click', function () { ssOpen(btn.getAttribute('data-slideshow')); });
		});
		ssEl.querySelector('.ss-prev').addEventListener('click', function () { ssGoto(ssIdx - 1); });
		ssEl.querySelector('.ss-next').addEventListener('click', function () { ssGoto(ssIdx + 1); });
		ssEl.querySelector('.ss-close').addEventListener('click', ssCloseFn);
		ssEl.addEventListener('click', function (e) { if (e.target === ssEl) ssCloseFn(); });
		document.addEventListener('keydown', function (e) {
			if (!ssEl.classList.contains('is-open')) return;
			if (e.key === 'Escape') ssCloseFn();
			if (e.key === 'ArrowLeft') ssGoto(ssIdx - 1);
			if (e.key === 'ArrowRight') ssGoto(ssIdx + 1);
		});
	}
})();
