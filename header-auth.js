// header-auth.js — 모든 페이지 공통 헤더 아바타 처리
(async function () {
  const SUPABASE_URL = 'https://hroyuxjqqlimwrrhdwnd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_RihZu0hAorZDdbE7bddoPQ_qsFpc0C4';

  const el = document.getElementById('header-avatar');
  if (!el) return;

  try {
    // SDK getSession — 커뮤니티.html과 동일 방식 (토큰 자동 갱신)
    const { createClient } = supabase;
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;

    const userId = session.user.id;
    const token = session.access_token;

    // 세션 있으면 일단 이메일 이니셜로 즉시 표시
    const emailInitial = (session.user.email || '?').charAt(0).toUpperCase();
    el.innerHTML = `<span class="text-sm font-bold text-blue-700">${emailInitial}</span>`;
    el.classList.remove('bg-slate-200');
    el.classList.add('bg-blue-100');
    el.onclick = () => { location.href = '마이페이지.html'; };
    el.style.cursor = 'pointer';

    // 프로필 fetch로 이름/아바타 업데이트
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=name,avatar_url&limit=1`,
        { signal: controller.signal, headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` } }
      );
      if (res.ok) {
        const rows = await res.json();
        const profile = rows && rows[0];
        if (profile) {
          const name = profile.name || emailInitial;
          const initial = name.charAt(0).toUpperCase();
          if (profile.avatar_url) {
            el.innerHTML = `<img src="${profile.avatar_url}" class="w-full h-full object-cover rounded-full"
              onerror="this.parentElement.innerHTML='<span class=\\'text-sm font-bold text-blue-700\\'>${initial}</span>'" />`;
          } else {
            el.innerHTML = `<span class="text-sm font-bold text-blue-700">${initial}</span>`;
          }
        }
      }
    } catch (e) {}

  } catch (e) {}
})();
