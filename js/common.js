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

	// 이해/소통/활용/창작 — 모바일 스와이프 캐러셀 점 표시
	var dirList = document.querySelector('.direction-list');
	var dirDots = document.getElementById('dirDots');
	if (dirList && dirDots) {
		var dirDotBtns = Array.prototype.slice.call(dirDots.children);
		var dirItems = Array.prototype.slice.call(dirList.children);
		function dirUpdateDots() {
			var listRect = dirList.getBoundingClientRect();
			var centerX = listRect.left + listRect.width / 2;
			var closest = 0, minDist = Infinity;
			dirItems.forEach(function (li, i) {
				var r = li.getBoundingClientRect();
				var dist = Math.abs((r.left + r.width / 2) - centerX);
				if (dist < minDist) { minDist = dist; closest = i; }
			});
			dirDotBtns.forEach(function (b, i) { b.classList.toggle('is-active', i === closest); });
		}
		var dirScrollTimer;
		dirList.addEventListener('scroll', function () {
			clearTimeout(dirScrollTimer);
			dirScrollTimer = setTimeout(dirUpdateDots, 60);
		}, { passive: true });
		dirDotBtns.forEach(function (btn, i) {
			btn.addEventListener('click', function () {
				var r = dirItems[i].getBoundingClientRect();
				var listR = dirList.getBoundingClientRect();
				dirList.scrollTo({ left: dirList.scrollLeft + (r.left - listR.left), behavior: 'smooth' });
			});
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
			images: ['images/fll-photos/fll-01.jpg', 'images/fll-photos/fll-02.jpg', 'images/fll-photos/fll-03.jpg', 'images/fll-photos/fll-04.jpg', 'images/fll-photos/fll-05.jpg', 'images/fll-photos/fll-06.jpg', 'images/fll-photos/fll-07.jpg', 'images/fll-photos/fll-08.jpg', 'images/fll-photos/fll-09.jpg', 'images/fll-photos/fll-10.jpg', 'images/fll-photos/fll-11.jpg', 'images/fll-photos/fll-12.jpg'],
			captions: [
				'레고 부품을 하나하나 분류하며 미션 준비를 시작합니다.',
				'팀원들과 머리를 맞대고 미션 노트에 아이디어를 정리합니다.',
				'구상한 아이디어를 레고 모델로 직접 조립해봅니다.',
				'완성해가는 모델 앞에서 팀워크가 자랍니다.',
				'그날의 활동을 기록하며 다음 단계를 준비합니다.',
				'손끝으로 하나하나, 디테일을 채워갑니다.',
				'여러 시간의 몰입 끝에 완성한 미션 모델.',
				'완성된 미션 필드 위, 팀의 결과물이 한눈에 펼쳐집니다.',
				'드디어 대회장에 도착해, 팀을 소개할 차례를 기다립니다.',
				'그동안 준비한 내용을 자신 있게 발표합니다.',
				'함께 만든 트로피를 손에 들고, 서로를 바라봅니다.',
				'긴 여정 끝에, 두 팀 모두가 함께 웃습니다.'
			]
		},
		muhan: {
			images: ['images/muhan-photos/muhan-01.jpg', 'images/muhan-photos/muhan-02.jpg', 'images/muhan-photos/muhan-03.jpg'],
			captions: [
				'대회장에 도착해 짧은 인터뷰 촬영을 진행합니다.',
				'무한상상 과학탐구 서바이벌대전 현장, 발표를 기다립니다.',
				'목차를 띄워두고 그동안 준비한 아이디어를 발표합니다.'
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

	// 우리 아이에게 맞는 프로그램 찾기 설문 팝업 (1분 진단, 실제 14개 프로그램 기반 추천)
	var svModal = document.getElementById('surveyModal');
	var svOpenBtn = document.getElementById('btnOpenSurvey');
	if (svModal && svOpenBtn) {
		var svProgBar = document.getElementById('surveyProgBar');
		var svAnswers = {};
		var svLastStep = 4;
		var svPct = { 0: 0, 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };

		// 실제 프로그램 페이지의 14개 활동 프로그램표 기준 (연령/관심/성향/결과물 태그)
		var SV_PROGRAMS = [
			{ name: '어린이 스크래치 친해지기', ages: ['preschool'], interest: ['creative'], style: 'computer', output: 'story', msg: '이야기와 놀이를 좋아하며 코딩을 처음 만나는 아이에게 잘 맞아요.' },
			{ name: '즐거운 레고 실험실', ages: ['preschool', 'low'], interest: ['build'], style: 'hands_on', output: 'robot', msg: '손으로 직접 만지고 실험하며 배우는 걸 좋아하는 아이에게 잘 맞아요.' },
			{ name: '레고 튜토리얼', ages: ['preschool', 'low', 'high'], interest: ['build'], style: 'hands_on', output: 'robot', msg: '레고 부품과 구조를 하나씩 직접 탐색해보고 싶은 아이에게 잘 맞아요.' },
			{ name: '레고로 키우는 문제 해결의 힘', ages: ['low', 'high'], interest: ['build', 'logic'], style: 'hands_on', output: 'robot', msg: '만든 것을 여러 방법으로 바꿔보며 문제를 해결하는 아이에게 잘 맞아요.' },
			{ name: '레고 STEM 실험실', ages: ['low', 'high'], interest: ['build', 'logic'], style: 'hands_on', output: 'robot', msg: '로봇과 과학 원리를 더 깊이 탐구하고 싶은 아이에게 잘 맞아요.' },
			{ name: '스크래치로 코딩과 친해지기', ages: ['low', 'high'], interest: ['creative'], style: 'computer', output: 'program', msg: '창작을 즐기며 코딩의 기본 구조를 익히고 싶은 아이에게 잘 맞아요.' },
			{ name: '스크래치로 게임 만들기', ages: ['low', 'high'], interest: ['game'], style: 'computer', output: 'game', msg: '게임을 즐기고 직접 만들어보고 싶은 아이에게 잘 맞아요.' },
			{ name: '마인크래프트 Coding : 우리의 세상 만들기', ages: ['low'], interest: ['game'], style: 'teamwork', output: 'world', msg: '친구들과 함께 상상한 세계를 만들고 싶은 아이에게 잘 맞아요.' },
			{ name: '마인크래프트 Coding : 마을을 지켜라', ages: ['low', 'high'], interest: ['game', 'logic'], style: 'teamwork', output: 'world', msg: '역할을 나누어 친구들과 함께 문제를 해결하는 아이에게 잘 맞아요.' },
			{ name: '마인크래프트 Coding : 에이전트와 함께해요', ages: ['low', 'high'], interest: ['game', 'logic'], style: 'computer', output: 'program', msg: '코드를 수정하며 스스로 해결 방법을 찾는 아이에게 잘 맞아요.' },
			{ name: '파이썬 기초', ages: ['high', 'middle'], interest: ['logic'], style: 'computer', output: 'program', msg: '코드의 구조와 논리를 더 깊이 탐구하고 싶은 아이에게 잘 맞아요.' },
			{ name: '생성형 AI 활용', ages: ['preschool', 'low', 'high'], interest: ['ai', 'creative'], style: 'imagination', output: 'story', msg: 'AI와 함께 글과 그림으로 생각을 표현하고 싶은 아이에게 잘 맞아요.' },
			{ name: '알수잇다!', ages: ['low', 'high', 'middle'], interest: ['logic'], style: 'computer', output: 'program', msg: '수학 문제를 단계별로 풀어가는 걸 좋아하는 아이에게 잘 맞아요.' },
			{ name: 'AI·디지털 문화유산과 떠나는 역사 여행!', ages: ['low', 'high', 'middle'], interest: ['ai', 'explore'], style: 'imagination', output: 'culture', msg: '역사와 새로운 기술을 함께 탐험하고 싶은 아이에게 잘 맞아요.' }
		];

		function svGoStep(n) {
			svModal.querySelectorAll('.survey-step').forEach(function (s) { s.classList.remove('is-active', 'is-shown'); });
			var target = svModal.querySelector('.survey-step[data-step="' + n + '"]');
			target.classList.add('is-active');
			void target.offsetWidth;
			requestAnimationFrame(function () { target.classList.add('is-shown'); });
			svProgBar.style.width = svPct[n] + '%';
			svModal.querySelector('.survey-panel').scrollTop = 0;
		}
		function svRecommend() {
			var eligible = SV_PROGRAMS.filter(function (p) { return p.ages.indexOf(svAnswers.age) > -1; });
			var scored = eligible.map(function (p) {
				var score = 0;
				(svAnswers.interest || []).forEach(function (i) { if (p.interest.indexOf(i) > -1) score += 3; });
				if (p.style === svAnswers.style) score += 2;
				if (p.output === svAnswers.output) score += 4;
				return { p: p, score: score };
			});
			scored.sort(function (a, b) { return b.score - a.score; });
			return scored;
		}
		function svShowResult() {
			var ranked = svRecommend();
			var top = ranked[0].p;
			document.getElementById('surveyRTitle').innerHTML = '우리 아이에겐 <em>‘' + top.name + '’</em>가<br />가장 잘 어울려요';
			document.getElementById('surveyRDesc').textContent = top.msg;
			var rest = ranked.slice(1, 3).map(function (r) { return r.p.name; });
			var foxHtml = 'FOX AI 연구소는 프로젝트 학습(PBL)으로 이 프로그램을 직접 경험하도록 도와드립니다.';
			if (rest.length) foxHtml += ' 이런 프로그램도 잘 맞아요 — <b>' + rest.join(', ') + '</b>';
			document.getElementById('surveyRFox').innerHTML = foxHtml;
		}
		function svUpdateInterestUI() {
			var count = (svAnswers.interest || []).length;
			svModal.querySelectorAll('[data-survey-toggle]').forEach(function (btn) {
				var val = btn.getAttribute('data-survey-toggle').split(':')[1];
				var selected = (svAnswers.interest || []).indexOf(val) > -1;
				btn.classList.toggle('is-selected', selected);
				btn.disabled = !selected && count >= 2;
			});
			var nextBtn = svModal.querySelector('.survey-next');
			if (nextBtn) nextBtn.disabled = count < 1;
		}
		function svOpen() {
			svAnswers = { interest: [] };
			svUpdateInterestUI();
			svModal.classList.add('is-open');
			svModal.setAttribute('aria-hidden', 'false');
			document.body.style.overflow = 'hidden';
			svGoStep(0);
		}
		function svClose() {
			svModal.classList.remove('is-open');
			svModal.setAttribute('aria-hidden', 'true');
			document.body.style.overflow = '';
		}
		svOpenBtn.addEventListener('click', svOpen);
		svModal.querySelector('.survey-close').addEventListener('click', svClose);
		svModal.addEventListener('click', function (e) { if (e.target === svModal) svClose(); });
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && svModal.classList.contains('is-open')) svClose(); });
		svModal.querySelectorAll('[data-survey-go]').forEach(function (btn) {
			btn.addEventListener('click', function () { if (!btn.disabled) svGoStep(btn.getAttribute('data-survey-go')); });
		});
		svModal.querySelectorAll('[data-survey-pick]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				var parts = btn.getAttribute('data-survey-pick').split(':');
				svAnswers[parts[0]] = parts[1];
				var cur = parseInt(svModal.querySelector('.survey-step.is-active').dataset.step, 10);
				if (cur < svLastStep) { svGoStep(cur + 1); } else { svShowResult(); svGoStep(5); }
			});
		});
		svModal.querySelectorAll('[data-survey-toggle]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				var val = btn.getAttribute('data-survey-toggle').split(':')[1];
				var idx = svAnswers.interest.indexOf(val);
				if (idx > -1) { svAnswers.interest.splice(idx, 1); }
				else if (svAnswers.interest.length < 2) { svAnswers.interest.push(val); }
				svUpdateInterestUI();
			});
		});
		var svRestartBtn = document.getElementById('surveyRestart');
		if (svRestartBtn) svRestartBtn.addEventListener('click', function () { svAnswers = { interest: [] }; svUpdateInterestUI(); svGoStep(0); });
	}

	// 관련 영상 팝업 (유튜브 임베드)
	var vidData = {
		muhan: { id: 'LBfBQKDI2dU', start: 158 },
		fll1: { id: '3R2RygfS3t4' },
		fll2: { id: 'hSecAYPlDkg' }
	};
	var vidModal = document.getElementById('videoModal');
	if (vidModal) {
		var vidFrame = document.getElementById('videoFrame');
		function vidOpen(key) {
			var d = vidData[key];
			if (!d) return;
			var src = 'https://www.youtube-nocookie.com/embed/' + d.id + '?autoplay=1&rel=0';
			if (d.start) src += '&start=' + d.start;
			vidFrame.src = src;
			vidModal.classList.add('is-open');
			vidModal.setAttribute('aria-hidden', 'false');
			document.body.style.overflow = 'hidden';
		}
		function vidClose() {
			vidModal.classList.remove('is-open');
			vidModal.setAttribute('aria-hidden', 'true');
			document.body.style.overflow = '';
			vidFrame.src = '';
		}
		var btnMuhanVideo = document.getElementById('btnMuhanVideo');
		if (btnMuhanVideo) btnMuhanVideo.addEventListener('click', function () { vidOpen('muhan'); });
		var btnFllVideo1 = document.getElementById('btnFllVideo1');
		if (btnFllVideo1) btnFllVideo1.addEventListener('click', function () { vidOpen('fll1'); });
		var btnFllVideo2 = document.getElementById('btnFllVideo2');
		if (btnFllVideo2) btnFllVideo2.addEventListener('click', function () { vidOpen('fll2'); });
		vidModal.querySelector('.video-close').addEventListener('click', vidClose);
		vidModal.addEventListener('click', function (e) { if (e.target === vidModal) vidClose(); });
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && vidModal.classList.contains('is-open')) vidClose(); });
	}
})();
