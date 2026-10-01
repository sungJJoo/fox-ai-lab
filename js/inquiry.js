// 상담 문의 폼: data/site.json 의 접수 주소(Google Apps Script)로 전송, 주소가 없으면 폼을 숨긴다
(function () {
	'use strict';

	var sec = document.getElementById('inquiry');
	var form = document.getElementById('inquiryForm');
	if (!sec || !form) return;

	var F = window.FoxContent;
	var msg = document.getElementById('inquiryMsg');
	var endpoint = '';

	function say(text, isErr) {
		msg.textContent = text;
		msg.className = 'iq-msg' + (isErr ? ' is-err' : '');
	}

	F.load('site').then(function (site) {
		endpoint = (site.inquiryEndpoint || '').trim();
		if (!endpoint) return;
		sec.hidden = false;
		return F.load('programs').then(function (d) {
			var sel = form.elements.program;
			d.activities.forEach(function (a) {
				var o = document.createElement('option');
				o.textContent = a.name.replace(/\s*\n\s*/g, ' ');
				sel.appendChild(o);
			});
		});
	}).catch(function () { /* 설정을 못 읽으면 폼 없이 전화·카카오톡 안내만 */ });

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		if (!form.reportValidity()) return;
		var el = form.elements;
		var data = {
			name: el.name.value.trim(),
			phone: el.phone.value.trim(),
			target: el.target.value,
			program: el.program.value,
			message: el.message.value.trim(),
			website: el.website.value,   // 자동 입력 봇 거르기 (사람은 비워 둠)
			page: location.href
		};
		var btn = form.querySelector('button[type="submit"]');
		btn.disabled = true;
		say('보내는 중…');

		// text/plain 으로 보내야 사전 요청(preflight) 없이 Apps Script 로 전달된다
		fetch(endpoint, { method: 'POST', body: JSON.stringify(data) })
			.then(function (r) { return r.json(); })
			.then(function (res) {
				if (!res.ok) throw new Error(res.error || 'fail');
				form.reset();
				form.hidden = true;
				say('문의가 접수되었습니다. 확인 후 남겨 주신 연락처로 연락드리겠습니다.');
			})
			.catch(function () {
				say('전송에 실패했습니다. 잠시 후 다시 시도하시거나 전화(1433-2700)로 문의해 주세요.', true);
			})
			.then(function () { btn.disabled = false; });
	});
})();
