/* ============================================================================
   Supabase 클라이언트 초기화
   - anon 키는 클라이언트 공개용 (RLS가 실제 보안 담당)
   - 다른 사이트와 같은 프로젝트 공유 — 잡도리는 japdori_ 접두어 테이블 사용
   ============================================================================ */

const SUPABASE_URL = 'https://hroyuxjqqlimwrrhdwnd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyb3l1eGpxcWxpbXdycmhkd25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTgwNTEsImV4cCI6MjA5MzE5NDA1MX0.wEimxV1qiTpWAKt6XOBVU_jCjBiXP6Lt02np2o8Nzjo';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
