// 상담 문의 접수용 Google Apps Script: 사이트 폼 → 구글 시트 기록 + 메일 알림 (설정 방법은 README 참고)

// ▼ 새 문의 알림을 받을 메일 주소 (여러 개는 쉼표로 구분)
var NOTIFY_EMAIL = 'sales@foxconnect.kr';
var SHEET_NAME = '문의';
var HEADERS = ['접수일시', '성함', '연락처', '대상', '관심 프로그램', '문의 내용', '처리 상태', '메모'];

function doPost(e) {
	try {
		var d = JSON.parse(e.postData.contents);
		if (d.website) return json({ ok: true });            // 자동 입력 봇: 저장하지 않고 성공처럼 응답

		var row = {
			name: clip(d.name, 30),
			phone: clip(d.phone, 20),
			target: clip(d.target, 30),
			program: clip(d.program, 60),
			message: clip(d.message, 1000)
		};
		if (!row.name || !row.phone) return json({ ok: false, error: '필수 항목이 비어 있습니다.' });

		var lock = LockService.getScriptLock();
		lock.waitLock(10000);
		try {
			sheet().appendRow([new Date(), safe(row.name), safe(row.phone), safe(row.target),
				safe(row.program), safe(row.message), '미처리', '']);
		} finally {
			lock.releaseLock();
		}

		MailApp.sendEmail({
			to: NOTIFY_EMAIL,
			subject: '[AI 연구소] 새 상담 문의 — ' + row.name,
			body: [
				'홈페이지로 새 상담 문의가 접수되었습니다.', '',
				'성함 : ' + row.name,
				'연락처 : ' + row.phone,
				'대상 : ' + row.target,
				'관심 프로그램 : ' + row.program, '',
				'[문의 내용]', row.message || '(없음)', '',
				'전체 목록 : ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
			].join('\n')
		});

		return json({ ok: true });
	} catch (err) {
		return json({ ok: false, error: String(err) });
	}
}

function sheet() {
	var ss = SpreadsheetApp.getActiveSpreadsheet();
	var sh = ss.getSheetByName(SHEET_NAME);
	if (!sh) {
		sh = ss.insertSheet(SHEET_NAME);
		sh.appendRow(HEADERS);
		sh.setFrozenRows(1);
		sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
	}
	return sh;
}

function clip(v, n) { return String(v == null ? '' : v).trim().slice(0, n); }

// =, +, -, @ 로 시작하는 값이 시트 수식으로 실행되지 않게 막는다
function safe(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }

function json(o) {
	return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
