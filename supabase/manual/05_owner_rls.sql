-- Proficios · 05 · Kullanıcı verisi için sahiplik kuralları (rapor maddesi 6 / Y8)
--
-- Ne yapar: locations, reviews ve ai_draft_logs tablolarında RLS'i açar, bu üç
-- tablodaki eski politikaları siler ve yerine tek bir kural koyar:
-- giriş yapmış kullanıcı yalnız KENDİ şubelerini, o şubelerin yorumlarını ve o
-- yorumların taslak kayıtlarını görebilir ve değiştirebilir. Ziyaretçiler (anon)
-- bu tablolara hiç erişemez.
--
-- Uygulamanın bu tablolara erişimi kodda yalnız sahibin kendi verisi üzerinden
-- (src/app/actions, src/app/dashboard) yapılıyor; bu kural o kullanımla birebir aynı.
--
-- Nasıl çalıştırılır: Supabase Dashboard → SQL Editor → New query → bu dosyanın
-- tamamını yapıştır → Run. Tekrar çalıştırmak güvenlidir. Hata olursa hiçbir
-- değişiklik uygulanmaz.

begin;

alter table public.locations enable row level security;
alter table public.reviews enable row level security;
alter table public.ai_draft_logs enable row level security;

do $$
declare
    p record;
begin
    for p in
        select tablename, policyname from pg_policies
         where schemaname = 'public'
           and tablename in ('locations', 'reviews', 'ai_draft_logs')
    loop
        execute format('drop policy %I on public.%I', p.policyname, p.tablename);
    end loop;
end
$$;

-- Şube: sahibi kendisi.
create policy locations_owner_all
    on public.locations
    for all
    to authenticated
    using ((select auth.uid())::text = user_id::text)
    with check ((select auth.uid())::text = user_id::text);

-- Yorum: kullanıcının kendi şubesine bağlı.
create policy reviews_owner_all
    on public.reviews
    for all
    to authenticated
    using (exists (
        select 1 from public.locations l
         where l.id = reviews.location_id
           and l.user_id::text = (select auth.uid())::text
    ))
    with check (exists (
        select 1 from public.locations l
         where l.id = reviews.location_id
           and l.user_id::text = (select auth.uid())::text
    ));

-- Taslak kaydı: kullanıcının kendi yorumuna bağlı.
create policy ai_draft_logs_owner_all
    on public.ai_draft_logs
    for all
    to authenticated
    using (exists (
        select 1 from public.reviews r
          join public.locations l on l.id = r.location_id
         where r.id = ai_draft_logs.review_id
           and l.user_id::text = (select auth.uid())::text
    ))
    with check (exists (
        select 1 from public.reviews r
          join public.locations l on l.id = r.location_id
         where r.id = ai_draft_logs.review_id
           and l.user_id::text = (select auth.uid())::text
    ));

revoke all on public.locations, public.reviews, public.ai_draft_logs from anon;

-- Kuralların hızlı çalışması için ilişki kolonlarında indeks.
create index if not exists locations_user_id_idx on public.locations (user_id);
create index if not exists reviews_location_id_idx on public.reviews (location_id);
create index if not exists ai_draft_logs_review_id_idx on public.ai_draft_logs (review_id);

commit;

-- Kontrol: aşağıdaki sorgu üç satır döndürmeli (her tablo için bir *_owner_all).
-- select tablename, policyname, cmd, roles from pg_policies
--  where schemaname = 'public' and tablename in ('locations', 'reviews', 'ai_draft_logs');
