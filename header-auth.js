// header-auth.js — 모든 페이지 공통 헤더 아바타 처리
(async function () {
  const SUPABASE_URL = 'https://hroyuxjqqlimwrrhdwnd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_RihZu0hAorZDdbE7bddoPQ_qsFpc0C4';

  const el = document.getElementById('header-avatar');
  if (!el) return;

  try {
    const { createClient } = supabase;
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const sessionResult = await Promise.race([
      db.auth.getSession(),
      new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000))
    ]);
    const { data: { session } } = sessionResult;
    if (!session) return;

    const token = session.access_token || SUPABASE_ANON_KEY;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(session.user.id)}&select=name,avatar_url&limit=1`,
      { signal: controller.signal, headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` } }
    );
    if (!res.ok) return;
    const rows = await res.json();
    const profile = rows && rows[0];
    const name = profile?.name || session.user.email?.split('@')[0] || '?';
    const avatarUrl = profile?.avatar_url;

    el.onclick = () => { location.href = '마이페이지.html'; };
    el.style.cursor = 'pointer';

    if (avatarUrl) {
      el.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-full" onerror="this.parentElement.innerHTML='<span class=\\'text-sm font-bold text-blue-700\\'>${name.charAt(0).toUpperCase()}</span>'" />`;
      el.classList.remove('bg-slate-200');
      el.classList.add('bg-blue-100');
    } else {
      el.innerHTML = `<span class="text-sm font-bold text-blue-700">${name.charAt(0).toUpperCase()}</span>`;
      el.classList.remove('bg-slate-200');
      el.classList.add('bg-blue-100');
    }
  } catch (e) {}
})();
