-- Proficios · 04 · Herkese açık metrikler (rapor maddesi 6 / Y8)
--
-- Ne yapar:
--   * platform_metrics tablosunu (yoksa) oluşturur ve tek satırını (id = 1) hazırlar.
--   * Ziyaretçiler sayaçları OKUYABİLİR (landing sayfası), ama hiçbir istemci YAZAMAZ.
--   * Sayaçlar tek bir atomik SQL ile artırılır; fonksiyonu yalnız sunucunun
--     secret key'i (service_role) çalıştırabilir.
--
-- Nasıl çalıştırılır: Supabase Dashboard → SQL Editor → New query → bu dosyanın
-- tamamını yapıştır → Run. Tekrar çalıştırmak güvenlidir.

begin;

create table if not exists public.platform_metrics (
    id integer primary key,
    updated_at timestamptz not null default now()
);

alter table public.platform_metrics
    add column if not exists active_storefronts bigint not null default 0,
    add column if not exists total_drafts_generated bigint not null default 0,
    add column if not exists reviews_responded bigint not null default 0,
    add column if not exists unedited_drafts_approved bigint not null default 0;

-- Satır zaten varsa hiçbir şey eklenmez.
insert into public.platform_metrics (id)
select 1
 where not exists (select 1 from public.platform_metrics where id = 1);

alter table public.platform_metrics enable row level security;

do $$
declare
    p record;
begin
    for p in
        select policyname from pg_policies
         where schemaname = 'public' and tablename = 'platform_metrics'
    loop
        execute format('drop policy %I on public.platform_metrics', p.policyname);
    end loop;
end
$$;

create policy platform_metrics_public_read
    on public.platform_metrics
    for select
    to anon, authenticated
    using (true);

revoke insert, update, delete, truncate on public.platform_metrics from anon, authenticated;

create or replace function public.increment_platform_metrics(
    p_active_storefronts integer default 0,
    p_total_drafts_generated integer default 0,
    p_reviews_responded integer default 0,
    p_unedited_drafts_approved integer default 0
) returns void
language sql
security definer
set search_path = ''
as $$
    -- Tek UPDATE ifadesi satırı kilitler; eşzamanlı artışlar birbirini ezmez.
    update public.platform_metrics
       set active_storefronts = active_storefronts + greatest(p_active_storefronts, 0),
           total_drafts_generated = total_drafts_generated + greatest(p_total_drafts_generated, 0),
           reviews_responded = reviews_responded + greatest(p_reviews_responded, 0),
           unedited_drafts_approved = unedited_drafts_approved + greatest(p_unedited_drafts_approved, 0),
           updated_at = now()
     where id = 1;
$$;

revoke all on function public.increment_platform_metrics(integer, integer, integer, integer)
    from public, anon, authenticated;
grant execute on function public.increment_platform_metrics(integer, integer, integer, integer)
    to service_role;

commit;

-- Kontrol: select * from public.platform_metrics;  → id = 1 olan tek satır
