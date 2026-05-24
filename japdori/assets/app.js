/* ============================================================================
   잡도리 — 핵심 로직 (Supabase 기반)
   - 모든 DB 작업은 sb 클라이언트(supabase-client.js)로
   - 잡도리 회원은 raw_user_meta_data.site === 'japdori' 로 구분
   ============================================================================ */

const SEED = {
  CHALLENGE_DAYS: 14,
  DEPOSIT_AMOUNT: 30000,
};

/* ----------------------------- 일자별 명언 (검증된 출처)
   - 모든 인용은 원전 또는 공인 출처가 확인된 것만 포함
   - 출처 표기는 원어(한자/영문) 병기로 검증 가능하게 함
*/
const QUOTES = [
  {
    day: 1,
    body: '"천 리 길도<br>한 걸음에서 시작된다."<br><span style="font-size:11px;opacity:.7;">千里之行 始於足下</span>',
    author: '노자 『도덕경』 64장',
    source: '도덕경 (Tao Te Ching), 기원전 6세기',
  },
  {
    day: 2,
    body: '"성공은 매일 반복한<br>작은 노력들의 합이다."',
    author: '로버트 콜리어 (Robert Collier)',
    source: 'The Secret of the Ages (1926)',
  },
  {
    day: 3,
    body: '"<em>핑계</em>는 가장 정성스럽게<br>만들어진 거짓말이다.<br>그리고 그걸 가장 잘 속는 사람은<br>너 자신이다."',
    author: '박명수 어록',
    source: '대한민국 코미디언, 무한도전·라디오쇼',
  },
  {
    day: 4,
    body: '"오늘 할 수 있는 일을<br>내일로 미루지 마라."',
    author: '벤자민 프랭클린 (Benjamin Franklin)',
    source: 'Poor Richard\'s Almanack (1758)',
  },
  {
    day: 5,
    body: '"시작하는 비결은<br>일단 시작하는 것이다."',
    author: '마크 트웨인 (Mark Twain)',
    source: '"The secret of getting ahead is getting started."',
  },
  {
    day: 6,
    body: '"우리는 우리가 반복하는<br>행동의 결과이다.<br>탁월함은 행동이 아니라 습관이다."',
    author: '윌 듀런트 (Will Durant)',
    source: 'The Story of Philosophy (1926) — 아리스토텔레스 사상 요약',
  },
  {
    day: 7,
    body: '"성공의 80%는<br>일단 나타나는 데 있다."',
    author: '우디 앨런 (Woody Allen)',
    source: '"Eighty percent of success is showing up." (1977)',
  },
  {
    day: 8,
    body: '"다시 시도하라.<br>다시 실패하라.<br>더 잘 실패하라."',
    author: '사무엘 베케트 (Samuel Beckett)',
    source: 'Worstward Ho (1983) — "Try again. Fail again. Fail better."',
  },
  {
    day: 9,
    body: '"포기는 배추를 셀 때나<br>쓰는 말이다."',
    author: '박명수 어록',
    source: '대한민국 코미디언, 무한도전',
  },
  {
    day: 10,
    body: '"큰일을 이루려면<br>작은 일부터 시작하라."<br><span style="font-size:11px;opacity:.7;">天下大事 必作於細</span>',
    author: '노자 『도덕경』 63장',
    source: '도덕경 (Tao Te Ching), 기원전 6세기',
  },
  {
    day: 11,
    body: '"인내는 쓰지만,<br>그 열매는 달다."',
    author: '장 자크 루소 (Jean-Jacques Rousseau)',
    source: 'Émile, ou De l\'éducation (1762)',
  },
  {
    day: 12,
    body: '"나무를 심기 가장 좋은 때는<br>20년 전이었고,<br>두 번째로 좋은 때는 바로 지금이다."',
    author: '중국 속담',
    source: 'Chinese proverb',
  },
  {
    day: 13,
    body: '"노력은 결코<br>배신하지 않는다."<br><span style="font-size:11px;opacity:.7;">努力は裏切らない</span>',
    author: '일본 속담',
    source: 'Japanese proverb',
  },
  {
    day: 14,
    body: '"끝날 때까지<br>끝난 게 아니다."',
    author: '요기 베라 (Yogi Berra)',
    source: '"It ain\'t over till it\'s over." (1973, NY Mets manager)',
  },
  {
    day: 15,
    body: '🎁<br>"잘 해낸 일에 대한 보상은<br>그것을 해냈다는 사실 그 자체다."',
    author: '랄프 왈도 에머슨 (Ralph Waldo Emerson)',
    source: '"The reward of a thing well done is to have done it."',
  },
];

function getQuoteForDay(dayNum) {
  const idx = Math.max(1, Math.min(dayNum || 1, QUOTES.length)) - 1;
  return QUOTES[idx];
}

/* ----------------------------- 포맷터/시간 헬퍼 */
const fmt = {
  currency(n) { return Number(Math.round(n)).toLocaleString('ko-KR') + '원'; },
  number(n)   { return Number(Math.round(n)).toLocaleString('ko-KR'); },
  date(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;
  },
  dateTime(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return `${fmt.date(d)} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
  },
  dateKor(d) {
    if (!d) return '—';
    const dt = new Date(d);
    const days = ['일','월','화','수','목','금','토'];
    return `${dt.getMonth()+1}월 ${dt.getDate()}일 (${days[dt.getDay()]})`;
  },
  dow(d) {
    if (!d) return '';
    const days = ['일','월','화','수','목','금','토'];
    return days[new Date(d).getDay()];
  },
};

function isoToday() {
  // KST(Asia/Seoul) 기준 오늘 날짜 — 클라이언트 로컬 타임존 무시
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

/* ============================================================================
   인증 (Supabase Auth)
   ============================================================================ */
const Auth = {
  async signup({ name, email, password }) {
    const { data, error } = await sb.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim(), site: 'japdori' } },
    });
    if (error) {
      if (/already/i.test(error.message)) throw new Error('이미 가입된 이메일입니다.');
      throw new Error(error.message);
    }
    // Supabase는 signUp 시 자동으로 세션 생성 → 가입자가 즉시 로그인 상태가 되는 걸 방지하기 위해 강제 로그아웃
    // (admin 승인 후에야 정식 로그인 가능)
    await sb.auth.signOut();
    return data.user;
  },

  async login(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      if (/Invalid login credentials/i.test(error.message)) {
        throw new Error('이메일 또는 비밀번호가 일치하지 않습니다.');
      }
      throw new Error(error.message);
    }

    const { data: profile } = await sb
      .from('japdori_users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!profile) { await sb.auth.signOut(); throw new Error('잡도리 회원이 아닙니다.'); }
    if (profile.status === 'pending')   { await sb.auth.signOut(); throw new Error('관리자 승인 대기중입니다.'); }
    if (profile.status === 'rejected')  { await sb.auth.signOut(); throw new Error('가입이 거절되었습니다.'); }
    if (profile.status === 'suspended') { await sb.auth.signOut(); throw new Error('정지된 계정입니다.'); }
    // completed: 챌린지 종료 — 결과 화면만 보여줌 (앱 본 페이지 진입 X)
    return profile;
  },

  async logout() { await sb.auth.signOut(); },

  async currentUser() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    const { data: profile } = await sb
      .from('japdori_users')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    return profile || null;
  },

  async requireAuth(redirect = 'login.html') {
    const u = await this.currentUser();
    if (!u) { location.replace(redirect); return null; }
    // 챌린지 종료 사용자는 결과 화면으로
    if (u.status === 'completed') { location.replace('complete.html'); return null; }
    // 승인 안 된 사용자가 직접 URL로 접근하는 걸 차단
    if (u.status !== 'approved') {
      await this.logout();
      alert('관리자 승인 대기중입니다.');
      location.replace(redirect);
      return null;
    }
    return u;
  },

  async requireAdmin(redirect = 'home.html') {
    const u = await this.currentUser();
    if (!u) { location.replace('login.html'); return null; }
    if (u.status !== 'approved') {
      await this.logout();
      alert('관리자 승인 대기중입니다.');
      location.replace('login.html');
      return null;
    }
    if (u.role !== 'admin') { alert('관리자만 접근 가능합니다.'); location.replace(redirect); return null; }
    return u;
  },
};

/* ============================================================================
   회원
   ============================================================================ */
async function listUsers(filter = null) {
  let q = sb.from('japdori_users').select('*').order('created_at', { ascending: false });
  if (filter) q = q.eq('status', filter);
  const { data, error } = await q;
  if (error) { console.warn(error); return []; }
  return data;
}

async function updateUser(id, patch) {
  const { data, error } = await sb.from('japdori_users').update(patch).eq('id', id).select().single();
  if (error) { console.warn(error); return null; }
  return data;
}

/* ============================================================================
   출석/인증 (japdori_attendance)
   ============================================================================ */
async function getAttendance(userId) {
  const { data, error } = await sb
    .from('japdori_attendance')
    .select('*')
    .eq('user_id', userId)
    .order('day_number');
  if (error) { console.warn(error); return []; }
  return data;
}

/* 사진 인증 제출 — Storage 업로드 + DB 업데이트 */
async function submitProof(userId, day, file) {
  const ext = (file.name || '').split('.').pop() || 'jpg';
  const path = `${userId}/day-${day}-${Date.now()}.${ext}`;
  const { error: upErr } = await sb.storage.from('japdori-proofs').upload(path, file, { upsert: true });
  if (upErr) throw new Error(`사진 업로드 실패: ${upErr.message}`);

  const { error: dbErr } = await sb
    .from('japdori_attendance')
    .update({
      status: 'pending_review',
      photo_url: path,
      submitted_at: new Date().toISOString(),
      review_note: '',
    })
    .eq('user_id', userId)
    .eq('day_number', day);
  if (dbErr) throw new Error(`제출 실패: ${dbErr.message}`);
  return true;
}

/* 저장된 path → 1시간 유효한 signed URL */
async function getPhotoUrl(path) {
  if (!path) return null;
  const { data } = await sb.storage.from('japdori-proofs').createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

/* admin: 검토 */
async function reviewSubmission(userId, day, decision, reviewerId, note = '') {
  const status = decision === 'approve' ? 'approved' : 'failed';
  const { data, error } = await sb
    .from('japdori_attendance')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      review_note: note,
    })
    .eq('user_id', userId)
    .eq('day_number', day)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function listPendingSubmissions() {
  const { data, error } = await sb
    .from('japdori_attendance')
    .select(`*, user:japdori_users!user_id(id, name, email, settings:japdori_user_settings(affirmation))`)
    .eq('status', 'pending_review')
    .order('submitted_at', { ascending: false });
  if (error) { console.warn(error); return []; }
  return data;
}

async function listAllSubmissions(filterUserId = null) {
  let q = sb
    .from('japdori_attendance')
    .select(`*, user:japdori_users!user_id(id, name, email, settings:japdori_user_settings(affirmation))`)
    .order('date', { ascending: false });
  if (filterUserId) q = q.eq('user_id', filterUserId);
  const { data, error } = await q;
  if (error) { console.warn(error); return []; }
  return data;
}

/* ============================================================================
   보증금 계산 (순수)
   ============================================================================ */
function computeDeposit(att) {
  const TOTAL = SEED.DEPOSIT_AMOUNT;
  const PER_DAY = Math.round(TOTAL / SEED.CHALLENGE_DAYS);
  const counts = (att || []).reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  const approved = counts.approved || 0;
  const failed = counts.failed || 0;
  const lost = failed * PER_DAY;
  const preserved = approved * PER_DAY;
  const passed = approved + failed;
  const total = att?.length || SEED.CHALLENGE_DAYS;
  const remaining = total - passed;
  const pending = remaining * PER_DAY;
  const current = TOTAL - lost;
  return { total: TOTAL, perDay: PER_DAY, lost, preserved, pending, current, approved, failed, remaining };
}

/* ============================================================================
   공지사항
   ============================================================================ */
async function listNotices() {
  const { data, error } = await sb
    .from('japdori_notices')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) { console.warn(error); return []; }
  return data;
}

async function createNotice({ title, body, pinned, createdBy }) {
  const { data, error } = await sb.from('japdori_notices').insert({
    title, body, pinned: !!pinned, created_by: createdBy,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteNotice(id) {
  const { error } = await sb.from('japdori_notices').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ============================================================================
   사용자 설정 (japdori_user_settings)
   ============================================================================ */
async function getUserSettings(userId) {
  const { data, error } = await sb
    .from('japdori_user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.warn(error); }
  return data || { user_id: userId, affirmation: '', avatar_data_url: null };
}

async function updateUserSettings(userId, patch) {
  const { data, error } = await sb
    .from('japdori_user_settings')
    .upsert({ user_id: userId, ...patch })
    .select()
    .single();
  if (error) { console.warn(error); return null; }
  return data;
}

/* ============================================================================
   텔레그램 (admin 전용; 실제 알림은 Edge Function 으로 이전 예정)
   ============================================================================ */
const Telegram = {
  async config() {
    const { data } = await sb.from('japdori_telegram_config').select('*').eq('id', 1).maybeSingle();
    return data;
  },
  async save(cfg) {
    const payload = { ...cfg, id: 1 };
    delete payload.created_at;
    const { error } = await sb.from('japdori_telegram_config').update(payload).eq('id', 1);
    if (error) throw new Error(error.message);
  },
  /* admin 테스트 전송 — 클라이언트에서 직접 호출 (admin만 가능) */
  async sendTest({ chatId, threadId, text, botToken }) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const body = { chat_id: chatId, text };
    if (threadId) body.message_thread_id = Number(threadId);
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await r.json();
  },
};

/* ============================================================================
   Topbar & Drawer (모든 페이지 공통)
   ============================================================================ */
const Icons = {
  bell:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  menu:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  close:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  user:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
};

function buildTopbar() {
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <div class="topbar-left">
          <div class="logo-mark">잡</div>
          <button class="date-pill" type="button">${fmt.dateKor(isoToday())}</button>
        </div>
        <div class="topbar-right">
          <span class="pro-pill">CHALLENGE</span>
          <button class="icon-btn" id="menu-btn" aria-label="메뉴">${Icons.menu}</button>
        </div>
      </div>
    </header>
  `;
}

async function buildDrawer() {
  const u = await Auth.currentUser();
  const notices = u ? await listNotices() : [];
  const settings = u ? await getUserSettings(u.id) : null;
  const avatarBg = settings?.avatar_data_url
    ? `background-image:url(${settings.avatar_data_url});color:transparent` : '';
  const initial = (u?.name || '?').slice(0, 1);

  const noticeRows = notices.length ? notices.map(n => `
    <div class="notice-item">
      ${n.pinned ? '<span class="notice-pin"></span>' : '<span style="width:6px;flex-shrink:0;"></span>'}
      <div>
        <div class="notice-title">${n.title}</div>
        <div class="notice-meta">${fmt.date(n.created_at)}</div>
      </div>
    </div>
  `).join('') : '<div class="empty" style="padding:18px 12px;">새 공지사항이 없습니다</div>';

  return `
    <div class="drawer-backdrop" id="drawer-backdrop"></div>
    <aside class="drawer" id="user-drawer" role="dialog" aria-label="메뉴">
      <div class="drawer-head">
        <div class="drawer-avatar" id="drawer-avatar" style="${avatarBg}">${initial}</div>
        <div>
          <div class="drawer-user-name">${u?.name || '게스트'}</div>
          <div class="drawer-user-meta">${u ? (u.role === 'admin' ? '관리자' : '회원') : '로그인이 필요합니다'}</div>
        </div>
        <button class="drawer-close" id="drawer-close" aria-label="닫기">${Icons.close}</button>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">계정</div>
        <a class="drawer-link" href="profile.html">${Icons.user}<span>내 정보 · 마이페이지</span><span class="arrow">›</span></a>
        ${u?.role === 'admin' ? `<a class="drawer-link" href="admin.html">${Icons.shield}<span>관리자 패널</span><span class="arrow">›</span></a>` : ''}
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">공지사항</div>
        <div class="notice-list">${noticeRows}</div>
      </div>

      <div style="margin-top:auto;padding:14px 12px;border-top:1px solid var(--line-soft);">
        <button class="drawer-link danger" id="logout-btn">${Icons.logout}<span>로그아웃</span></button>
      </div>
    </aside>
  `;
}

function bindDrawer() {
  const backdrop = document.getElementById('drawer-backdrop');
  const drawer   = document.getElementById('user-drawer');
  const menuBtn  = document.getElementById('menu-btn');
  const closeBtn = document.getElementById('drawer-close');
  const logout   = document.getElementById('logout-btn');

  const open  = () => { drawer.classList.add('open'); backdrop.classList.add('open'); };
  const close = () => { drawer.classList.remove('open'); backdrop.classList.remove('open'); };

  if (menuBtn) menuBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);
  if (logout) logout.addEventListener('click', async () => {
    await Auth.logout();
    location.replace('login.html');
  });
}

/* ============================================================================
   햄스터 이미지 회전 (UI)
   ============================================================================ */
const HAMSTER_EMOJIS = ['🤑', '😈', '💸', '🐹', '🪙'];
const HAMSTER_IMAGE_CANDIDATES = [
  'assets/images/hamster-1.png',
  'assets/images/hamster-2.png',
  'assets/images/hamster-3.png',
  'assets/images/hamster-4.png',
];

async function detectHamsterImages() {
  const found = [];
  for (const src of HAMSTER_IMAGE_CANDIDATES) {
    const ok = await new Promise(res => {
      const img = new Image();
      img.onload = () => res(true);
      img.onerror = () => res(false);
      img.src = src;
    });
    if (ok) found.push(src);
  }
  return found;
}

async function startHamsterRotator(boxEl, intervalMs = 15000) {
  if (!boxEl) return;
  const images = await detectHamsterImages();
  const pool = images.length ? images : HAMSTER_EMOJIS;
  let idx = 0;
  function render(i) {
    boxEl.classList.add('fading');
    setTimeout(() => {
      if (images.length) {
        boxEl.innerHTML = `<img src="${pool[i]}" alt="hamster" class="hamster-img-el">`;
      } else {
        boxEl.innerHTML = `<span class="hamster-emoji-el">${pool[i]}</span>`;
      }
      boxEl.classList.remove('fading');
    }, 280);
  }
  render(idx);
  setInterval(() => {
    idx = (idx + 1) % pool.length;
    render(idx);
  }, intervalMs);
}

/* ============================================================================
   초기화 — 호환성 stub (signup.html 등이 seedOnce() 호출하므로 빈 함수로 유지)
   ============================================================================ */
async function seedOnce() { /* 더 이상 필요 없음 (DB가 처리) */ }
