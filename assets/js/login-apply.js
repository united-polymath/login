/* LOGIN 신청 모달 — 세미나 신청 / 다음 기수 알림 신청을 구글 시트(Apps Script)로 보낸다.
   - LoginApply.openSeminar({ seminar, sessions: ['1회차 · 11.14(토) 14:00', ...], selected })
   - <a data-notify="도파민 디톡스 4주 코호트" href="/community"> 를 누르면 알림 신청 모달이 열린다.
   submitUrl 이 비어 있으면 모달 대신 원래 링크/안내가 그대로 동작한다. */
(function () {
  var CONFIG = {
    submitUrl: '',   // ← 구글 Apps Script '웹 앱 URL' (…/exec)
    privacy: {
      seminar: '수집 항목: 이름, 연락처, 출생연도, 지금의 나 · 이용 목적: 세미나 신청 확인 및 참석 안내 · 보유 기간: 세미나 종료 후 1년 이내 파기',
      notify: '수집 항목: 이름, 연락처 · 이용 목적: 다음 기수·시리즈 오픈 알림 발송 · 보유 기간: 알림 발송 후 1년 이내 파기 (요청 시 즉시 삭제)'
    }
  };

  var UTM_KEY = 'login-utm-v1';
  var UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  function readUtm() {
    var q = new URLSearchParams(location.search), u = {}, found = false;
    UTM_FIELDS.forEach(function (k) { var v = q.get(k); if (v) { u[k] = v.slice(0, 200); found = true; } });
    try {
      if (found) { localStorage.setItem(UTM_KEY, JSON.stringify(u)); return u; }
      return JSON.parse(localStorage.getItem(UTM_KEY) || '{}');
    } catch (e) { return u; }
  }
  var utm = readUtm();
  function utmPayload() { var u = {}; UTM_FIELDS.forEach(function (k) { u[k] = utm[k] || ''; }); if (!u.utm_source) u.utm_source = 'direct'; return u; }

  var CSS = '\
.la-back{position:fixed;inset:0;z-index:100;background:rgba(20,21,24,.55);display:flex;align-items:flex-end;justify-content:center;padding:0;opacity:0;transition:opacity .2s}\
.la-back.on{opacity:1}\
@media(min-width:640px){.la-back{align-items:center;padding:24px}}\
.la-box{background:#fff;width:100%;max-width:480px;max-height:92vh;overflow:auto;border-radius:24px 24px 0 0;padding:28px 22px 22px;box-shadow:0 20px 60px rgba(0,0,0,.25);color:#141518;font-family:inherit;transform:translateY(16px);transition:transform .2s}\
.la-back.on .la-box{transform:none}\
@media(min-width:640px){.la-box{border-radius:24px;padding:32px 30px 26px}}\
.la-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px}\
.la-eyebrow{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:700;letter-spacing:.12em;color:#6E6A00;margin-bottom:6px}\
.la-title{font-size:20px;font-weight:800;letter-spacing:-.03em;line-height:1.35;word-break:keep-all}\
.la-x{border:0;background:#F1F2F4;width:36px;height:36px;border-radius:50%;font-size:20px;line-height:36px;cursor:pointer;flex-shrink:0;color:#141518}\
.la-f{display:flex;flex-direction:column;gap:14px}\
.la-l{font-size:13px;font-weight:700;margin-bottom:6px;display:block}\
.la-l i{color:#E11D48;font-style:normal;margin-left:2px}\
.la-i{width:100%;box-sizing:border-box;border:1.5px solid #E2E4E8;border-radius:14px;padding:12px 14px;font-size:15px;font-family:inherit;color:#141518;background:#fff;outline:none}\
.la-i:focus{border-color:#141518}\
textarea.la-i{min-height:76px;resize:vertical}\
.la-opts{display:flex;flex-wrap:wrap;gap:8px}\
.la-opt{position:relative}\
.la-opt input{position:absolute;opacity:0;pointer-events:none}\
.la-opt span{display:inline-block;border:1.5px solid #E2E4E8;border-radius:999px;padding:9px 14px;font-size:14px;font-weight:600;cursor:pointer;color:#55575E;background:#fff}\
.la-opt input:checked+span{background:#141518;border-color:#141518;color:#F7F35A}\
.la-opt input:focus-visible+span{outline:2px solid #141518;outline-offset:2px}\
.la-chk{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.5;cursor:pointer}\
.la-chk input{width:18px;height:18px;margin-top:1px;accent-color:#141518;flex-shrink:0}\
.la-note{font-size:12px;color:#8A8D94;line-height:1.55;margin:4px 0 0 28px}\
.la-err{color:#E11D48;font-size:13px;font-weight:600;min-height:18px}\
.la-btn{width:100%;border:0;border-radius:999px;padding:16px;font-size:16px;font-weight:800;background:#141518;color:#F7F35A;cursor:pointer;font-family:inherit}\
.la-btn[disabled]{opacity:.55;cursor:default}\
.la-tag{display:inline-block;background:#F7F35A;color:#141518;border-radius:999px;padding:6px 12px;font-size:13px;font-weight:700}\
.la-done{text-align:center;padding:18px 4px 6px}\
.la-done .em{font-size:44px;margin-bottom:10px}\
.la-done p{color:#55575E;font-size:14.5px;line-height:1.7;word-break:keep-all;margin:8px 0 20px}\
.la-no{font-family:"IBM Plex Mono",monospace;font-weight:700;background:#F7F8F9;border-radius:12px;padding:10px;margin-bottom:18px;font-size:14px}';

  var STATUS = ['대학생', '졸업·취업 준비', '직장인', '프리랜서·창업', '기타'];
  var SOURCES = ['인스타그램', '지인 추천', '커뮤니티·카페', '검색', '기타'];

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmtPhone(v) { var d = String(v).replace(/\D/g, '').slice(0, 11); return d.length < 4 ? d : d.length < 8 ? d.slice(0, 3) + '-' + d.slice(3) : d.slice(0, 3) + '-' + d.slice(3, d.length - 4) + '-' + d.slice(-4); }
  function receiptNo() { var n = new Date(), p = function (x) { return ('0' + x).slice(-2); }; return 'LS' + String(n.getFullYear()).slice(2) + p(n.getMonth() + 1) + p(n.getDate()) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(); }
  function opts(name, list, selected) {
    return '<div class="la-opts">' + list.map(function (v) {
      return '<label class="la-opt"><input type="radio" name="' + name + '" value="' + esc(v) + '"' + (v === selected ? ' checked' : '') + '><span>' + esc(v) + '</span></label>';
    }).join('') + '</div>';
  }

  var back = null, lastFocus = null;
  function close() {
    if (!back) return;
    back.classList.remove('on');
    var b = back; back = null;
    setTimeout(function () { b.remove(); }, 200);
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function open(eyebrow, title, body, onSubmit) {
    if (!document.getElementById('la-css')) { var st = document.createElement('style'); st.id = 'la-css'; st.textContent = CSS; document.head.appendChild(st); }
    close();
    lastFocus = document.activeElement;
    back = document.createElement('div');
    back.className = 'la-back';
    back.innerHTML = '<div class="la-box" role="dialog" aria-modal="true" aria-labelledby="la-title">'
      + '<div class="la-top"><div><div class="la-eyebrow">' + esc(eyebrow) + '</div><div class="la-title" id="la-title">' + esc(title) + '</div></div>'
      + '<button type="button" class="la-x" aria-label="닫기">×</button></div>'
      + '<form class="la-f" novalidate>' + body + '<div class="la-err" role="alert"></div><button class="la-btn" type="submit">신청하기</button></form></div>';
    document.body.appendChild(back);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { back && back.classList.add('on'); });
    back.addEventListener('click', function (e) { if (e.target === back || e.target.closest('.la-x')) close(); });
    document.addEventListener('keydown', onKey);
    var form = back.querySelector('form');
    var phone = form.querySelector('[name=phone]');
    if (phone) phone.addEventListener('input', function () { phone.value = fmtPhone(phone.value); });
    form.addEventListener('submit', function (e) { e.preventDefault(); onSubmit(form); });
    var first = form.querySelector('input:not([type=radio]):not([type=checkbox])');
    if (first) setTimeout(function () { first.focus(); }, 50);
  }
  function done(title, html) {
    if (!back) return;
    back.querySelector('.la-box').innerHTML = '<div class="la-done"><div class="em">🎉</div><div class="la-title">' + esc(title) + '</div>' + html
      + '<button type="button" class="la-btn la-x2">확인</button></div>';
    back.querySelector('.la-x2').addEventListener('click', close);
  }
  function send(form, payload, onOk) {
    var err = form.querySelector('.la-err'), btn = form.querySelector('.la-btn');
    btn.disabled = true; btn.textContent = '보내는 중…'; err.textContent = '';
    fetch(CONFIG.submitUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok) {
          if (window.gtag) gtag('event', 'generate_lead', { form_type: payload.type, item_name: payload.seminar || payload.interest });
          onOk(res);
        } else if (res && res.code === 'already') {
          err.textContent = '이미 같은 연락처로 신청된 회차예요. 다른 회차를 선택하거나 커뮤니티로 문의해 주세요.';
        } else {
          err.textContent = '입력하신 내용을 다시 확인해 주세요.';
        }
      })
      .catch(function () { err.textContent = '전송 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.'; })
      .then(function () { if (btn.isConnected) { btn.disabled = false; btn.textContent = '신청하기'; } });
  }
  function base(form, type) {
    var f = form.elements;
    return {
      type: type, name: f.name.value.trim(), phone: fmtPhone(f.phone.value), privacyConsent: f.privacy.checked,
      page: location.pathname + location.hash, utm: utmPayload(), submittedAt: new Date().toISOString()
    };
  }
  function check(form, p) {
    var err = form.querySelector('.la-err');
    if (!p.name) return (err.textContent = '이름을 입력해 주세요.', false);
    if (p.phone.replace(/\D/g, '').length < 10) return (err.textContent = '연락처를 정확히 입력해 주세요.', false);
    return true;
  }
  var privacyHtml = function (type) {
    return '<div><label class="la-chk"><input type="checkbox" name="privacy"><span><b>[필수]</b> 개인정보 수집·이용에 동의합니다.</span></label>'
      + '<div class="la-note">' + esc(CONFIG.privacy[type]) + '</div></div>';
  };

  function openSeminar(o) {
    var sessions = o.sessions || [];
    var body = '<div><span class="la-l">참석 회차<i>*</i></span>' + opts('session', sessions, o.selected || (sessions.length === 1 ? sessions[0] : '')) + '</div>'
      + '<div><label class="la-l" for="la-name">이름<i>*</i></label><input class="la-i" id="la-name" name="name" autocomplete="name" maxlength="30"></div>'
      + '<div><label class="la-l" for="la-phone">연락처<i>*</i></label><input class="la-i" id="la-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="010-0000-0000" maxlength="13"></div>'
      + '<div><label class="la-l" for="la-birth">출생연도<i>*</i></label><input class="la-i" id="la-birth" name="birth" inputmode="numeric" placeholder="예) 2001" maxlength="4"></div>'
      + '<div><span class="la-l">지금의 나<i>*</i></span>' + opts('status', STATUS) + '</div>'
      + '<div><span class="la-l">세미나를 알게 된 경로</span>' + opts('source', SOURCES) + '</div>'
      + '<div><label class="la-l" for="la-msg">세미나에서 듣고 싶은 이야기</label><textarea class="la-i" id="la-msg" name="message" maxlength="500" placeholder="요즘 가장 고민되는 것을 편하게 적어 주세요"></textarea></div>'
      + privacyHtml('seminar')
      + '<label class="la-chk"><input type="checkbox" name="marketing"><span>[선택] LOGIN의 다음 세미나·프로그램 소식을 문자로 받을게요.</span></label>';
    open('SEMINAR · 신청서', o.seminar, body, function (form) {
      var f = form.elements, err = form.querySelector('.la-err');
      var p = base(form, 'seminar');
      p.seminar = o.seminar;
      p.session = (form.querySelector('[name=session]:checked') || {}).value || '';
      p.birthYear = f.birth.value.replace(/\D/g, '');
      p.status = (form.querySelector('[name=status]:checked') || {}).value || '';
      p.source = (form.querySelector('[name=source]:checked') || {}).value || '';
      p.message = f.message.value.trim();
      p.marketingConsent = f.marketing.checked;
      p.receiptNo = receiptNo();
      if (!p.session) return (err.textContent = '참석할 회차를 선택해 주세요.');
      if (!check(form, p)) return;
      var y = +p.birthYear;
      if (!(y >= 1960 && y <= new Date().getFullYear() - 14)) return (err.textContent = '출생연도 4자리를 입력해 주세요. 예) 2001');
      if (!p.status) return (err.textContent = '지금의 나를 선택해 주세요.');
      if (!p.privacyConsent) return (err.textContent = '개인정보 수집·이용에 동의해 주세요.');
      send(form, p, function () {
        done('신청이 완료됐어요', '<p>' + esc(p.session) + '<br>참석 안내는 입력하신 연락처로 문자로 보내드릴게요.</p><div class="la-no">접수번호 ' + esc(p.receiptNo) + '</div>');
      });
    });
  }

  function openNotify(interest) {
    var body = '<div><span class="la-l">알림 받을 항목</span><span class="la-tag">' + esc(interest) + '</span></div>'
      + '<div><label class="la-l" for="la-name">이름<i>*</i></label><input class="la-i" id="la-name" name="name" autocomplete="name" maxlength="30"></div>'
      + '<div><label class="la-l" for="la-phone">연락처<i>*</i></label><input class="la-i" id="la-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="010-0000-0000" maxlength="13"></div>'
      + privacyHtml('notify');
    open('NEXT · 알림 신청', '다음 오픈 소식을 가장 먼저 알려드릴게요', body, function (form) {
      var err = form.querySelector('.la-err');
      var p = base(form, 'notify');
      p.interest = interest;
      if (!check(form, p)) return;
      if (!p.privacyConsent) return (err.textContent = '개인정보 수집·이용에 동의해 주세요.');
      send(form, p, function () {
        done('알림 신청이 완료됐어요', '<p>' + esc(interest) + '<br>다음 모집이 열리면 문자로 가장 먼저 알려드릴게요.</p>');
      });
    });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-notify]');
    if (!a || !CONFIG.submitUrl) return;
    e.preventDefault();
    openNotify(a.getAttribute('data-notify'));
  });

  window.LoginApply = { enabled: !!CONFIG.submitUrl, openSeminar: openSeminar, openNotify: openNotify };
})();
